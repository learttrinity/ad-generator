import { prisma } from "@/lib/prisma";
import type { CreativeAssetStatus, Prisma } from "@prisma/client";

export type CreativeAssetCreateInput = {
  generationRunId: string;
  audienceKey: string;
  placement: string;
  dimensions?: string | null;
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  promptBlocks?: Prisma.InputJsonValue;
  provider?: string | null;
  status?: CreativeAssetStatus;
};

export type CreativeAssetUpdateInput = Partial<{
  status: CreativeAssetStatus;
  imagePrompt: string | null;
  negativePrompt: string | null;
  promptBlocks: Prisma.InputJsonValue;
  baseImageUrl: string | null;
  finalAssetUrl: string | null;
  provider: string | null;
  providerJobId: string | null;
  providerResponse: Prisma.InputJsonValue;
  errorMessage: string | null;
  dimensions: string | null;
  renderSpec: Prisma.InputJsonValue;
  renderStatus: string | null;
  renderWarnings: Prisma.InputJsonValue;
  renderedAt: Date | null;
  finalWidth: number | null;
  finalHeight: number | null;
}>;

export const creativeAssetRepository = {
  findById(id: string) {
    return prisma.creativeAsset.findUnique({ where: { id } });
  },

  findByRunId(generationRunId: string) {
    return prisma.creativeAsset.findMany({
      where: { generationRunId },
      orderBy: [{ audienceKey: "asc" }, { placement: "asc" }],
    });
  },

  create(data: CreativeAssetCreateInput) {
    return prisma.creativeAsset.create({ data });
  },

  async createMany(items: CreativeAssetCreateInput[]) {
    // createMany doesn't return records, so we create individually to get IDs
    return Promise.all(items.map((item) => prisma.creativeAsset.create({ data: item })));
  },

  update(id: string, data: CreativeAssetUpdateInput) {
    return prisma.creativeAsset.update({ where: { id }, data });
  },

  async countByStatus(generationRunId: string) {
    const assets = await prisma.creativeAsset.findMany({
      where: { generationRunId },
      select: { status: true },
    });
    const counts: Record<string, number> = {};
    for (const a of assets) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  },
};
