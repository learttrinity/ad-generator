import { prisma } from "@/lib/prisma";
import type { ClientStatus } from "@prisma/client";

export type ClientCreateInput = {
  initials: string;
  name: string;
  website?: string | null;
  instagram?: string | null;
  status?: ClientStatus;
};

export type ClientUpdateInput = Partial<ClientCreateInput>;

export const clientRepository = {
  findAll() {
    return prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        brandProfile: {
          select: {
            approved: true,
            confidenceScore: true,
            reviewStatus: true,
            primaryColor: true,
            fontPrimary: true,
            typographyClass: true,
            visualTone: true,
            imageTone: true,
            secondaryColors: true,
            componentRules: true,
          },
        },
        _count: { select: { campaigns: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        brandProfile: true,
        driveMappings: true,
        _count: { select: { campaigns: true, assets: true } },
      },
    });
  },

  create(data: ClientCreateInput) {
    return prisma.client.create({ data });
  },

  update(id: string, data: ClientUpdateInput) {
    return prisma.client.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.client.delete({ where: { id } });
  },
};
