import { generationRunRepository } from "@/repositories/generationRunRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { brandProfileRepository } from "@/repositories/brandProfileRepository";
import { clientAssetRepository } from "@/repositories/clientAssetRepository";
import { normalizeCampaign } from "@/lib/campaignNormalization";
import { computeMessagePriority } from "@/lib/messagePriority";
import { selectDirection } from "@/lib/directionSelector";
import { checkReadiness } from "@/lib/readinessCheck";
import type { EnvironmentMode } from "@prisma/client";

export type StartRunInput = {
  campaignId: string;
  triggeredById: string;
  environmentMode?: EnvironmentMode;
  directionMode?: "automatisch" | "manuell";
  manualDirectionKey?: string;
  selectedPlacements?: string[];
  selectedAudiences?: string[];
  selectedReferenceAssetId?: string | null;
  studioReferenceImageUrl?: string | null;
  manualOverrides?: Record<string, unknown>;
};

export const generationRunService = {
  async listByCampaign(campaignId: string) {
    return generationRunRepository.findByCampaign(campaignId);
  },

  async startRun(input: StartRunInput) {
    const campaign = await campaignRepository.findById(input.campaignId);
    if (!campaign) throw new Error("Kampagne nicht gefunden");

    const brandProfile = await brandProfileRepository.findByClientId(campaign.clientId);
    const assets = await clientAssetRepository.findAllByClient(campaign.clientId);

    const hasLogo = assets.some((a) => a.assetType === "logo" && a.active);

    // Readiness check
    const readiness = checkReadiness(
      brandProfile
        ? {
            approved: brandProfile.approved,
            reviewStatus: brandProfile.reviewStatus,
            confidenceScore: brandProfile.confidenceScore,
            primaryColor: brandProfile.primaryColor,
            fontPrimary: brandProfile.fontPrimary,
            hasLogo,
          }
        : null,
      {
        headline: campaign.headline ?? "",
        offerType: campaign.offerType,
        priceNew: campaign.priceNew ? String(campaign.priceNew) : null,
        ctaText: campaign.ctaText ?? null,
      }
    );

    if (!readiness.ready) {
      const blockers = readiness.issues.filter((i) => i.type === "blocker").map((i) => i.message);
      throw new Error(`Kampagne nicht bereit für Generierung:\n${blockers.join("\n")}`);
    }

    // Normalize campaign data
    const normResult = normalizeCampaign({
      headline: campaign.headline ?? "",
      subheadline: campaign.subheadline,
      urgencyText: campaign.urgencyText,
      ctaText: campaign.ctaText,
      locationLine: campaign.locationLine,
      priceNew: campaign.priceNew ? Number(campaign.priceNew) : null,
      priceOld: campaign.priceOld ? Number(campaign.priceOld) : null,
      billingInterval: campaign.billingInterval,
      contractTerm: campaign.contractTerm,
      offerType: campaign.offerType,
    });

    // Compute message priority
    const messagePriority = computeMessagePriority({
      offerType: campaign.offerType,
      priceNew: normResult.payload.priceNew,
      priceOld: normResult.payload.priceOld,
      urgencyText: normResult.payload.urgencyText,
      headline: campaign.headline ?? "",
    });

    // Select creative direction
    let directionKey: string;
    if (input.directionMode === "manuell" && input.manualDirectionKey) {
      directionKey = input.manualDirectionKey;
    } else {
      directionKey = selectDirection({
        visualTone: brandProfile?.visualTone,
        imageTone: brandProfile?.imageTone,
        offerType: campaign.offerType,
        messagePriority,
        typographyClass: brandProfile?.typographyClass,
      });
    }

    // Placements and audience matrix
    const placements = input.selectedPlacements ?? ["feed_1080x1080", "story_1080x1920"];
    const audiences = input.selectedAudiences ?? ["frau_25_30", "mann_25_30"];

    // Build audience matrix entries (audience × placement)
    const audienceMatrix = audiences.flatMap((audience) =>
      placements.map((placement) => ({ audience, placement }))
    );

    // Warnings: combine normalization + readiness
    const warnings = [
      ...normResult.warnings,
      ...readiness.issues.filter((i) => i.type === "warning").map((i) => ({
        field: "brand",
        severity: "warning" as const,
        message: i.message,
      })),
    ];

    // Get next run number
    const runNumber = await campaignRepository.nextRunNumber(input.campaignId);

    const run = await generationRunRepository.create({
      campaignId: input.campaignId,
      runNumber,
      triggeredById: input.triggeredById,
      environmentMode: input.environmentMode ?? "STANDARD_STUDIO",
      directionMode: input.directionMode ?? "automatisch",
      directionKey,
      messagePriority,
      placements,
      audienceMatrix,
      selectedReferenceAssetId: input.selectedReferenceAssetId ?? null,
      studioReferenceImageUrl: input.studioReferenceImageUrl ?? null,
      normalizedPayload: normResult.payload as unknown as Record<string, string>,
      warnings: warnings as unknown as string[],
      manualOverrides: (input.manualOverrides ?? {}) as Record<string, string>,
      status: "IN_VORBEREITUNG",
    });

    return { run, warnings, messagePriority, directionKey, readiness };
  },
};
