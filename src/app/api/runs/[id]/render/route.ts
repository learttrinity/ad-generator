import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderRunAssets } from "@/services/finalRenderService";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const run = await prisma.generationRun.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run nicht gefunden" }, { status: 404 });
  }

  // Check that there are renderable assets
  const renderableCount = await prisma.creativeAsset.count({
    where: { generationRunId: run.id, status: "FERTIG", finalAssetUrl: null },
  });

  if (renderableCount === 0) {
    return NextResponse.json(
      { message: "Keine renderbaren Assets vorhanden", results: [] },
      { status: 200 }
    );
  }

  const results = await renderRunAssets(run.id);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    message: `${succeeded} von ${results.length} Assets gerendert${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`,
    results,
  });
}
