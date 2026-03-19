import { prisma } from "@/lib/prisma";
import type { CampaignStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type CampaignCreateInput = {
  clientId: string;
  title: string;
  offerType: string;
  headline?: string | null;
  customText?: string | null;
  abbuchung?: string | null;
  subheadline?: string | null;
  urgencyText?: string | null;
  ctaText?: string | null;
  locationLine?: string | null;
  startDate?: Date | string | null;
  priceNew?: Prisma.Decimal | number | string | null;
  priceOld?: Prisma.Decimal | number | string | null;
  billingInterval?: string | null;
  contractTerm?: string | null;
  notes?: string | null;
  status?: CampaignStatus;
  createdById?: string | null;
  aworkTaskId?: string | null;
};

export type CampaignUpdateInput = Partial<
  Omit<CampaignCreateInput, "clientId" | "createdById">
>;

export const campaignRepository = {
  findAll(clientId?: string) {
    return prisma.campaign.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            initials: true,
            brandProfile: { select: { primaryColor: true } },
          },
        },
        _count: { select: { runs: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, initials: true } },
        createdBy: { select: { id: true, name: true } },
        runs: {
          orderBy: { runNumber: "desc" },
          include: { _count: { select: { assets: true } } },
        },
      },
    });
  },

  create(data: CampaignCreateInput) {
    return prisma.campaign.create({ data });
  },

  update(id: string, data: CampaignUpdateInput) {
    return prisma.campaign.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.campaign.delete({ where: { id } });
  },

  /** Returns the next run number for a campaign (max + 1) */
  async nextRunNumber(campaignId: string): Promise<number> {
    const last = await prisma.generationRun.findFirst({
      where: { campaignId },
      orderBy: { runNumber: "desc" },
      select: { runNumber: true },
    });
    return (last?.runNumber ?? 0) + 1;
  },
};
