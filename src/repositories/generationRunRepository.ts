import { prisma } from "@/lib/prisma";
import type { EnvironmentMode, GenerationRunStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type GenerationRunCreateInput = {
  campaignId: string;
  runNumber: number;
  triggeredById?: string | null;
  directionKey?: string | null;
  directionSummary?: string | null;
  directionMode?: string;
  environmentMode?: EnvironmentMode;
  messagePriority?: string | null;
  placements?: Prisma.InputJsonValue;
  audienceMatrix?: Prisma.InputJsonValue;
  selectedReferenceAssetId?: string | null;
  studioReferenceImageUrl?: string | null;
  normalizedPayload?: Prisma.InputJsonValue;
  warnings?: Prisma.InputJsonValue;
  manualOverrides?: Prisma.InputJsonValue;
  status?: GenerationRunStatus;
  totalAssets?: number;
  completedAssets?: number;
  failedAssets?: number;
  progressPercent?: number;
};

export const generationRunRepository = {
  findById(id: string) {
    return prisma.generationRun.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, title: true, clientId: true } },
        triggeredBy: { select: { id: true, name: true } },
        assets: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  findByCampaign(campaignId: string) {
    return prisma.generationRun.findMany({
      where: { campaignId },
      orderBy: { runNumber: "desc" },
      include: { _count: { select: { assets: true } } },
    });
  },

  create(data: GenerationRunCreateInput) {
    return prisma.generationRun.create({ data });
  },

  update(id: string, data: Partial<GenerationRunCreateInput>) {
    return prisma.generationRun.update({ where: { id }, data });
  },

  updateProgress(
    id: string,
    counts: { completedAssets: number; failedAssets: number; totalAssets: number }
  ) {
    const { completedAssets, failedAssets, totalAssets } = counts;
    const done = completedAssets + failedAssets;
    const progressPercent = totalAssets > 0 ? Math.round((done / totalAssets) * 100) : 0;
    const allDone = done >= totalAssets && totalAssets > 0;
    // FEHLER only when every single asset's render engine crashed (completedAssets = 0).
    // Fallback-background assets count as completedAssets — so FEHLER is extremely rare.
    const status: GenerationRunStatus = allDone
      ? completedAssets === 0 ? "FEHLER" : "FERTIG"
      : "IN_GENERIERUNG";
    return prisma.generationRun.update({
      where: { id },
      data: { completedAssets, failedAssets, totalAssets, progressPercent, status },
    });
  },

  findByIdWithFullAssets(id: string) {
    return prisma.generationRun.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                initials: true,
                brandProfile: { select: { primaryColor: true } },
              },
            },
          },
        },
        triggeredBy: { select: { id: true, name: true } },
        assets: { orderBy: [{ audienceKey: "asc" }, { placement: "asc" }] },
      },
    });
  },
};
