/**
 * Generation Pipeline Service – V2
 *
 * Orchestrates the full generation pipeline for a GenerationRun:
 * 1. Load run config and resolve brand/reference data
 * 2. Expand audience × placement matrix
 * 3. Build prompts per asset
 * 4. Create CreativeAsset records (pre-created for immediate UI feedback)
 * 5. For each asset:
 *    a. Submit to image provider (with automatic retries)
 *    b. If provider fails: proceed with fallback gradient background
 *    c. Render final ad (overlay + text) on top of background
 *    d. Mark asset FERTIG (always) or FEHLGESCHLAGEN (only if render crashes)
 *
 * Generation NEVER fully fails. Higgsfield failing means a gradient background
 * is used. Only a crash in the render engine marks an asset FEHLGESCHLAGEN.
 */

import { generationRunRepository } from "@/repositories/generationRunRepository";
import { creativeAssetRepository } from "@/repositories/creativeAssetRepository";
import { clientAssetRepository } from "@/repositories/clientAssetRepository";
import { brandProfileRepository } from "@/repositories/brandProfileRepository";
import { buildPrompt } from "@/lib/promptEngine";
import { getPlacement } from "@/lib/audienceMatrix";
import { getImageProvider } from "@/lib/providers/providerFactory";
import type { AudienceKey, PlacementKey } from "@/lib/audienceMatrix";
import type { ImageGenerationProvider, ProviderSubmitInput } from "@/lib/providers/imageGenerationProvider";
import { renderSingleAsset } from "@/services/finalRenderService";

export type PipelineResult = {
  runId: string;
  totalAssets: number;
  completedAssets: number;
  failedAssets: number;
  assetIds: string[];
};

// ─── Retry configuration ──────────────────────────────────────────────────────

const MAX_PROVIDER_RETRIES = 2;
const RETRY_DELAY_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ProviderSuccess = {
  success: true;
  imageUrl: string;
  providerJobId: string | null;
  rawResponse: Record<string, unknown>;
};

type ProviderFailure = {
  success: false;
  error: string;
};

/**
 * Submits a generation job to the provider with automatic retries.
 * Returns the image URL on success, or an error message after all retries fail.
 * Never throws — failures are returned as { success: false, error }.
 */
async function submitWithRetry(
  provider: ImageGenerationProvider,
  input: ProviderSubmitInput,
): Promise<ProviderSuccess | ProviderFailure> {
  let lastError = "Provider-Fehler";

  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      const result = await provider.submit(input);

      if (result.status === "completed" && result.imageUrl) {
        return {
          success: true,
          imageUrl: result.imageUrl,
          providerJobId: result.providerJobId,
          rawResponse: result.rawResponse,
        };
      }

      lastError = result.error ?? `Unerwarteter Provider-Status: ${result.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    console.warn(
      `[pipeline] Provider attempt ${attempt + 1}/${MAX_PROVIDER_RETRIES + 1} failed: ${lastError}`
    );
  }

  return { success: false, error: lastError };
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const generationPipelineService = {
  async runPipeline(runId: string): Promise<PipelineResult> {
    const run = await generationRunRepository.findByIdWithFullAssets(runId);
    if (!run) throw new Error("GenerationRun nicht gefunden");

    await generationRunRepository.update(runId, { status: "IN_GENERIERUNG" });

    const brandProfile = await brandProfileRepository.findByClientId(run.campaign.clientId);
    const clientAssets = await clientAssetRepository.findAllByClient(run.campaign.clientId);

    // Resolve reference image URL: prefer studioReferenceImageUrl for Kundenstudio runs
    let referenceAssetUrl: string | null = null;
    if (run.environmentMode === "KUNDENSTUDIO_REFERENZ" && run.studioReferenceImageUrl) {
      referenceAssetUrl = run.studioReferenceImageUrl;
    } else if (run.selectedReferenceAssetId) {
      const refAsset = clientAssets.find((a) => a.id === run.selectedReferenceAssetId && a.active);
      referenceAssetUrl = refAsset?.fileUrl ?? null;
    }

    type MatrixEntry = { audience: string; placement: string };
    const matrix: MatrixEntry[] = Array.isArray(run.audienceMatrix)
      ? (run.audienceMatrix as MatrixEntry[])
      : [];

    if (matrix.length === 0) {
      throw new Error("Audience-Matrix ist leer. Run kann nicht gestartet werden.");
    }

    const directionKey = run.directionKey ?? "clean_studio";
    const messagePriority = run.messagePriority ?? "headline_fokussiert";
    const environmentMode = run.environmentMode as "STANDARD_STUDIO" | "KUNDENSTUDIO_REFERENZ";
    const campaignOfferType = run.campaign.offerType ?? null;

    const restrictions = brandProfile?.restrictions &&
      typeof brandProfile.restrictions === "object" &&
      !Array.isArray(brandProfile.restrictions)
      ? (brandProfile.restrictions as Record<string, unknown>)
      : null;
    const forbiddenColors = Array.isArray(restrictions?.forbiddenColors)
      ? (restrictions!.forbiddenColors as string[])
      : null;
    const bannedCheapSaleLook = typeof restrictions?.bannedCheapSaleLook === "boolean"
      ? restrictions.bannedCheapSaleLook
      : null;

    // Always get a provider — if it fails per-asset, fallback background is used
    const provider = await getImageProvider();

    const totalAssets = matrix.length;
    const assetIds: string[] = [];

    // ── Pre-create all asset records for immediate UI feedback ────────────────
    for (const entry of matrix) {
      const promptResult = buildPrompt({
        audienceKey: entry.audience as AudienceKey,
        placementKey: entry.placement as PlacementKey,
        environmentMode,
        directionKey,
        messagePriority,
        offerType: campaignOfferType,
        brandPrimaryColor: brandProfile?.primaryColor ?? null,
        brandVisualTone: brandProfile?.visualTone ?? null,
        brandImageTone: brandProfile?.imageTone ?? null,
        brandForbiddenColors: forbiddenColors,
        brandBannedCheapSaleLook: bannedCheapSaleLook,
        referenceAssetUrl,
      });
      const asset = await creativeAssetRepository.create({
        generationRunId: runId,
        audienceKey: entry.audience,
        placement: entry.placement,
        dimensions: promptResult.dimensions,
        imagePrompt: promptResult.finalPrompt,
        negativePrompt: promptResult.finalNegativePrompt,
        promptBlocks: promptResult.blocks as unknown as import("@prisma/client").Prisma.InputJsonValue,
        status: "ANGEFRAGT",
        provider: provider.name,
      });
      assetIds.push(asset.id);
    }

    await generationRunRepository.updateProgress(runId, {
      totalAssets,
      completedAssets: 0,
      failedAssets: 0,
    });

    // ── Process assets with bounded concurrency ───────────────────────────────
    const CONCURRENCY = 4;
    let completedAssets = 0;
    let failedAssets = 0;

    async function processAsset(index: number): Promise<void> {
      const entry = matrix[index];
      const assetId = assetIds[index];

      const promptResult = buildPrompt({
        audienceKey: entry.audience as AudienceKey,
        placementKey: entry.placement as PlacementKey,
        environmentMode,
        directionKey,
        messagePriority,
        offerType: campaignOfferType,
        brandPrimaryColor: brandProfile?.primaryColor ?? null,
        brandVisualTone: brandProfile?.visualTone ?? null,
        brandImageTone: brandProfile?.imageTone ?? null,
        brandForbiddenColors: forbiddenColors,
        brandBannedCheapSaleLook: bannedCheapSaleLook,
        referenceAssetUrl,
      });
      const placement = getPlacement(entry.placement);

      try {
        await creativeAssetRepository.update(assetId, { status: "IN_GENERIERUNG" });

        // ── Step 1: Try to get background image from provider ─────────────────
        const providerResult = await submitWithRetry(provider, {
          prompt: promptResult.finalPrompt,
          negativePrompt: promptResult.finalNegativePrompt,
          width: placement.width,
          height: placement.height,
          referenceImageUrl: referenceAssetUrl,
          meta: {
            audienceKey: entry.audience,
            placementKey: entry.placement,
            directionKey,
            runId,
            assetId,
          },
        });

        if (providerResult.success) {
          // Save the base image URL so renderSingleAsset can use it
          await creativeAssetRepository.update(assetId, {
            baseImageUrl: providerResult.imageUrl,
            providerJobId: providerResult.providerJobId,
            providerResponse: providerResult.rawResponse as unknown as import("@prisma/client").Prisma.InputJsonValue,
          });
        } else {
          // Provider failed — log internally, fallback background will be used by render
          console.warn(
            `[pipeline] Provider failed for asset ${assetId} (audience: ${entry.audience}, placement: ${entry.placement}). ` +
            `Using fallback background. Error: ${providerResult.error}`
          );
          await creativeAssetRepository.update(assetId, {
            providerResponse: { error: providerResult.error, fallback: true },
          });
          // baseImageUrl stays null → renderSingleAsset generates gradient fallback
        }

        // ── Step 2: Render final ad (text + overlay on top of background) ─────
        // This ALWAYS runs, whether provider succeeded or not.
        const renderResult = await renderSingleAsset(assetId);

        if (renderResult.success) {
          await creativeAssetRepository.update(assetId, { status: "FERTIG" });
          completedAssets++;
        } else {
          // Only the render engine crashing causes a real failure
          await creativeAssetRepository.update(assetId, {
            status: "FEHLGESCHLAGEN",
            errorMessage: renderResult.error ?? "Render-Engine-Fehler",
          });
          failedAssets++;
        }
      } catch (err) {
        // Unexpected crash in the pipeline itself
        console.error(`[pipeline] Unexpected error for asset ${assetId}:`, err);
        await creativeAssetRepository.update(assetId, {
          status: "FEHLGESCHLAGEN",
          errorMessage: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
        failedAssets++;
      }

      await generationRunRepository.updateProgress(runId, {
        totalAssets,
        completedAssets,
        failedAssets,
      });
    }

    for (let i = 0; i < matrix.length; i += CONCURRENCY) {
      const batch = matrix
        .slice(i, i + CONCURRENCY)
        .map((_, j) => processAsset(i + j));
      await Promise.allSettled(batch);
    }

    return { runId, totalAssets, completedAssets, failedAssets, assetIds };
  },
};
