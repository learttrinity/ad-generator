import { prisma } from "@/lib/prisma";
import type { BrandProfileStatus } from "@prisma/client";

export type BrandProfileUpsertInput = {
  clientId: string;
  primaryColor?: string;
  secondaryColors?: string[];
  accentColors?: string[];
  neutralPalette?: string[];
  fontPrimary?: string;
  fontSecondary?: string | null;
  fallbackFontPrimary?: string | null;
  fallbackFontSecondary?: string | null;
  typographyClass?: string | null;
  visualTone?: string | null;
  imageTone?: string | null;
  componentRules?: Record<string, unknown>;
  restrictions?: Record<string, unknown>;
  reviewStatus?: BrandProfileStatus;
  approved?: boolean;
  confidenceScore?: number;
};

export const brandProfileRepository = {
  findByClientId(clientId: string) {
    return prisma.brandProfile.findUnique({ where: { clientId } });
  },

  async upsert(data: BrandProfileUpsertInput) {
    const { clientId, ...fields } = data;

    // Build shared payload (update fields only include what was provided)
    const updatePayload = {
      ...(fields.primaryColor !== undefined && { primaryColor: fields.primaryColor }),
      ...(fields.secondaryColors !== undefined && { secondaryColors: fields.secondaryColors }),
      ...(fields.accentColors !== undefined && { accentColors: fields.accentColors }),
      ...(fields.neutralPalette !== undefined && { neutralPalette: fields.neutralPalette }),
      ...(fields.fontPrimary !== undefined && { fontPrimary: fields.fontPrimary }),
      ...(fields.fontSecondary !== undefined && { fontSecondary: fields.fontSecondary }),
      ...(fields.fallbackFontPrimary !== undefined && { fallbackFontPrimary: fields.fallbackFontPrimary }),
      ...(fields.fallbackFontSecondary !== undefined && { fallbackFontSecondary: fields.fallbackFontSecondary }),
      ...(fields.typographyClass !== undefined && { typographyClass: fields.typographyClass }),
      ...(fields.visualTone !== undefined && { visualTone: fields.visualTone }),
      ...(fields.imageTone !== undefined && { imageTone: fields.imageTone }),
      ...(fields.componentRules !== undefined && { componentRules: fields.componentRules }),
      ...(fields.restrictions !== undefined && { restrictions: fields.restrictions }),
      ...(fields.reviewStatus !== undefined && { reviewStatus: fields.reviewStatus }),
      ...(fields.approved !== undefined && { approved: fields.approved }),
      ...(fields.confidenceScore !== undefined && { confidenceScore: fields.confidenceScore }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.brandProfile.upsert({
      where: { clientId },
      create: {
        clientId,
        primaryColor: data.primaryColor ?? "#000000",
        fontPrimary: data.fontPrimary ?? "",
        ...(updatePayload as any),
      },
      update: updatePayload as any,
    });
  },

  async setReviewStatus(clientId: string, status: BrandProfileStatus) {
    return prisma.brandProfile.update({
      where: { clientId },
      data: {
        reviewStatus: status,
        approved: status === "FREIGEGEBEN",
      },
    });
  },

  delete(clientId: string) {
    return prisma.brandProfile.delete({ where: { clientId } });
  },
};
