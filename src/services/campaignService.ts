import { z } from "zod";
import { campaignRepository } from "@/repositories/campaignRepository";
import { CampaignStatus } from "@prisma/client";

export const campaignSchema = z.object({
  clientId: z.string().min(1, "Kunde ist erforderlich"),
  title: z.string().min(2, "Titel ist erforderlich"),
  offerType: z.string().min(1, "Angebotsart ist erforderlich"),
  headline: z.string().min(2, "Headline ist erforderlich"),
  subheadline: z.string().optional(),
  urgencyText: z.string().optional(),
  ctaText: z.string().optional(),
  locationLine: z.string().optional(),
  startDate: z.string().optional(),
  priceNew: z.string().optional(),
  priceOld: z.string().optional(),
  billingInterval: z.string().optional(),
  contractTerm: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(CampaignStatus),
  aworkTaskId: z.string().optional(),
});

export type CampaignSchemaInput = z.infer<typeof campaignSchema>;

function toDecimalOrNull(val: string | undefined | null) {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val.replace(",", "."));
  return isNaN(n) ? null : n;
}

export const campaignService = {
  async list(clientId?: string) {
    return campaignRepository.findAll(clientId);
  },

  async get(id: string) {
    const campaign = await campaignRepository.findById(id);
    if (!campaign) throw new Error("Kampagne nicht gefunden");
    return campaign;
  },

  async create(input: CampaignSchemaInput, userId: string) {
    const data = campaignSchema.parse(input);
    return campaignRepository.create({
      ...data,
      priceNew: toDecimalOrNull(data.priceNew),
      priceOld: toDecimalOrNull(data.priceOld),
      subheadline: data.subheadline || null,
      urgencyText: data.urgencyText || null,
      ctaText: data.ctaText || null,
      locationLine: data.locationLine || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      billingInterval: data.billingInterval || null,
      contractTerm: data.contractTerm || null,
      notes: data.notes || null,
      aworkTaskId: data.aworkTaskId || null,
      createdById: userId,
    });
  },

  async update(id: string, input: Partial<CampaignSchemaInput>) {
    const data = campaignSchema.partial().parse(input);
    return campaignRepository.update(id, {
      ...data,
      priceNew: data.priceNew !== undefined ? toDecimalOrNull(data.priceNew) : undefined,
      priceOld: data.priceOld !== undefined ? toDecimalOrNull(data.priceOld) : undefined,
      subheadline: data.subheadline ?? undefined,
      urgencyText: data.urgencyText ?? undefined,
      ctaText: data.ctaText ?? undefined,
      locationLine: data.locationLine ?? undefined,
      startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
      billingInterval: data.billingInterval ?? undefined,
      contractTerm: data.contractTerm ?? undefined,
      notes: data.notes ?? undefined,
      aworkTaskId: data.aworkTaskId ?? undefined,
    });
  },

  async delete(id: string) {
    return campaignRepository.delete(id);
  },
};
