import { prisma } from "@/lib/prisma";
import type { ClientAssetType } from "@prisma/client";

export type ClientAssetCreateInput = {
  clientId: string;
  assetType: ClientAssetType;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  source?: string;
  driveFileId?: string | null;
  metadata?: Record<string, unknown>;
};

export const clientAssetRepository = {
  findAllByClient(clientId: string) {
    return prisma.clientAsset.findMany({
      where: { clientId, active: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.clientAsset.findUnique({ where: { id } });
  },

  create(data: ClientAssetCreateInput) {
    return prisma.clientAsset.create({
      data: {
        ...data,
        source: data.source ?? "upload",
        metadata: (data.metadata ?? {}) as Record<string, string>,
      },
    });
  },

  softDelete(id: string) {
    return prisma.clientAsset.update({
      where: { id },
      data: { active: false },
    });
  },

  hardDelete(id: string) {
    return prisma.clientAsset.delete({ where: { id } });
  },
};
