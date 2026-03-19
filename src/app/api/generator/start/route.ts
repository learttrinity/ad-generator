import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { campaignRepository } from "@/repositories/campaignRepository";
import { generationRunService } from "@/services/generationRunService";
import { generationPipelineService } from "@/services/generationPipelineService";
import type { EnvironmentMode } from "@prisma/client";

// All 6 audiences × 2 placements = 12 ads
const ALL_AUDIENCES = ["frau_25_30", "mann_25_30", "frau_30_35", "mann_30_35", "frau_50_55", "mann_50_55"];
const ALL_PLACEMENTS = ["feed_1080x1080", "story_1080x1920"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const { clientId, offerType } = body;

    // Required for all offer types
    if (!clientId) {
      return NextResponse.json({ error: "Kein Kunde ausgewählt." }, { status: 400 });
    }
    if (!offerType) {
      return NextResponse.json({ error: "Angebotsart ist erforderlich." }, { status: 400 });
    }

    // Per-offer-type validation
    if (offerType === "Monatskündbar" || offerType === "Preisaktion") {
      if (!body.priceNew) {
        return NextResponse.json({ error: "Preis ist erforderlich." }, { status: 400 });
      }
      if (!body.abbuchung || !body.abbuchung.trim()) {
        return NextResponse.json({ error: "Abbuchung ist erforderlich." }, { status: 400 });
      }
    } else if (offerType === "Custom") {
      if (!body.customText || !body.customText.trim()) {
        return NextResponse.json({ error: "Custom Text ist erforderlich." }, { status: 400 });
      }
    }

    // Validate Kundenstudio requires an uploaded reference image
    const environmentMode = (body.environmentMode ?? "STANDARD_STUDIO") as EnvironmentMode;
    if (environmentMode === "KUNDENSTUDIO_REFERENZ" && !body.studioReferenceImageUrl) {
      return NextResponse.json(
        { error: "Bitte lade ein Studio-Bild hoch um Kundenstudio zu verwenden." },
        { status: 400 }
      );
    }

    // Auto-generate title if not provided
    const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const title = body.title?.trim() || `${offerType} – ${today}`;

    const priceNew = body.priceNew ? parseFloat(String(body.priceNew).replace(",", ".")) : null;

    // 1. Create the campaign
    const abbuchung = body.abbuchung?.trim() || null;
    const campaign = await campaignRepository.create({
      clientId,
      title,
      offerType,
      headline: body.headline?.trim() || null,
      customText: body.customText?.trim() || null,
      abbuchung,
      priceNew: priceNew ?? null,
      priceOld: body.priceOld ? parseFloat(String(body.priceOld).replace(",", ".")) : null,
      billingInterval: abbuchung, // keep in sync for render service
      status: "BEREIT",
      createdById: session.user.id,
    });

    // 2. Start the generation run with all 12 slots
    const runResult = await generationRunService.startRun({
      campaignId: campaign.id,
      triggeredById: session.user.id,
      environmentMode,
      directionMode: "automatisch",
      studioReferenceImageUrl: body.studioReferenceImageUrl ?? null,
      selectedAudiences: ALL_AUDIENCES,
      selectedPlacements: ALL_PLACEMENTS,
    });

    // 3. Fire-and-forget pipeline
    void generationPipelineService
      .runPipeline(runResult.run.id)
      .catch((err: unknown) => {
        console.error(`[generator/start] Run ${runResult.run.id} pipeline failed:`, err);
      });

    // Extract warning messages for frontend display
    const warnings = runResult.warnings
      .map((w) => (typeof w === "object" && w !== null && "message" in w ? String((w as { message: unknown }).message) : String(w)))
      .filter(Boolean);

    return NextResponse.json(
      {
        runId: runResult.run.id,
        campaignId: campaign.id,
        warnings,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fehler beim Starten der Generierung";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
