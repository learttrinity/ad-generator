import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generationRunService } from "@/services/generationRunService";
import { generationPipelineService } from "@/services/generationPipelineService";
import type { EnvironmentMode } from "@prisma/client";

type Context = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 1. Create GenerationRun (validation + normalization + priority + direction)
    const runResult = await generationRunService.startRun({
      campaignId: params.id,
      triggeredById: session.user.id,
      environmentMode: (body.environmentMode ?? "STANDARD_STUDIO") as EnvironmentMode,
      directionMode: body.directionMode ?? "automatisch",
      manualDirectionKey: body.manualDirectionKey,
      selectedPlacements: body.selectedPlacements,
      selectedAudiences: body.selectedAudiences,
      selectedReferenceAssetId: body.selectedReferenceAssetId ?? null,
      manualOverrides: body.manualOverrides ?? {},
    });

    // 2. Fire-and-forget the generation pipeline.
    // The client polls /api/runs/:id for progress. This keeps the HTTP response
    // fast regardless of whether the provider is sync (mock) or async (Higgsfield).
    void generationPipelineService
      .runPipeline(runResult.run.id)
      .catch((err: unknown) => {
        console.error(`[pipeline] Run ${runResult.run.id} failed:`, err);
      });

    return NextResponse.json(
      {
        run: runResult.run,
        warnings: runResult.warnings,
        messagePriority: runResult.messagePriority,
        directionKey: runResult.directionKey,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fehler beim Starten des Runs";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
