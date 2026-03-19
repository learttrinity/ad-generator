/**
 * GET /api/runs/[id]/download
 * Streams a ZIP of all final-rendered assets for a GenerationRun.
 * Naming: 01 - Feed - {INITIALS}.jpg ... 06 - Story - {INITIALS}.jpg
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

type Context = { params: { id: string } };

export const dynamic = "force-dynamic";

// Canonical order: frau first (25-30, 30-35, 50-55), dann mann (25-30, 30-35, 50-55)
const AUDIENCE_ORDER = [
  "frau_25_30",
  "frau_30_35",
  "frau_50_55",
  "mann_25_30",
  "mann_30_35",
  "mann_50_55",
];

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const run = await prisma.generationRun.findUnique({
    where: { id: params.id },
    include: {
      campaign: {
        select: {
          title: true,
          client: { select: { initials: true } },
        },
      },
      assets: {
        select: {
          id: true,
          audienceKey: true,
          placement: true,
          finalAssetUrl: true,
          baseImageUrl: true,
          status: true,
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run nicht gefunden" }, { status: 404 });
  }

  const clientInitials = run.campaign.client.initials.toUpperCase();

  // Sort assets by canonical audience order + placement (feed before story)
  const sortedAssets = [...run.assets]
    .filter((a) => a.finalAssetUrl || a.baseImageUrl)
    .sort((a, b) => {
      const ai = AUDIENCE_ORDER.indexOf(a.audienceKey);
      const bi = AUDIENCE_ORDER.indexOf(b.audienceKey);
      if (ai !== bi) return ai - bi;
      // feed before story
      const aIsStory = a.placement.includes("story") ? 1 : 0;
      const bIsStory = b.placement.includes("story") ? 1 : 0;
      return aIsStory - bIsStory;
    });

  if (sortedAssets.length === 0) {
    return NextResponse.json(
      { error: "Keine Assets zum Herunterladen verfügbar" },
      { status: 404 }
    );
  }

  // Stream ZIP via PassThrough → ReadableStream
  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err) => {
    console.error("[download] archiver error:", err);
    passThrough.destroy(err);
  });

  archive.pipe(passThrough);

  // Build numbered filenames
  let feedIndex = 0;
  let storyIndex = 0;

  for (const asset of sortedAssets) {
    const url = asset.finalAssetUrl ?? asset.baseImageUrl!;
    const isStory = asset.placement.includes("story");

    let fileName: string;
    if (isStory) {
      storyIndex++;
      fileName = `${String(storyIndex).padStart(2, "0")} - Story - ${clientInitials}.jpg`;
    } else {
      feedIndex++;
      fileName = `${String(feedIndex).padStart(2, "0")} - Feed - ${clientInitials}.jpg`;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          archive.append(buf, { name: fileName });
        }
      } catch (err) {
        console.warn(`[download] Could not fetch ${url}:`, err);
      }
    } else {
      const absPath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(absPath)) {
        archive.file(absPath, { name: fileName });
      }
    }
  }

  archive.finalize();

  const readable = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err) => controller.error(err));
    },
    cancel() {
      passThrough.destroy();
    },
  });

  const safeTitle = run.campaign.title.replace(/[^\w\s\-]/g, "").trim().slice(0, 40);
  const zipName = `${clientInitials} - ${safeTitle} - Run${run.runNumber}.zip`;

  return new Response(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
    },
  });
}
