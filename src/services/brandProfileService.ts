import { z } from "zod";
import { brandProfileRepository } from "@/repositories/brandProfileRepository";
import { clientAssetRepository } from "@/repositories/clientAssetRepository";
import { analyzeBrandAssets, computeProfileCompleteness } from "@/lib/brandAnalysis";
import { BrandProfileStatus } from "@prisma/client";

// ─── Component Rules schema ───────────────────────────────────────────────────

const componentRulesSchema = z.object({
  pricingStyle: z.enum(["dominant", "dezent", "gemischt"]).optional(),
  overlayStyle: z.enum(["none", "transparent", "solid", "glass"]).optional(),
  logoProminence: z.enum(["klein", "mittel", "groß"]).optional(),
  borderRadiusStyle: z.enum(["sharp", "soft", "rounded"]).optional(),
  textDensity: z.enum(["niedrig", "mittel", "hoch"]).optional(),
  urgencyStyle: z.enum(["none", "dezent", "auffällig"]).optional(),
}).default({});

const restrictionsSchema = z.object({
  forbiddenColors: z.array(z.string()).default([]),
  forbiddenStyles: z.array(z.string()).default([]),
  forbiddenWording: z.array(z.string()).default([]),
  notes: z.string().default(""),
}).default({});

// ─── Brand Profile form schema ────────────────────────────────────────────────

export const brandProfileSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ungültiger Hex-Farbwert").default("#000000"),
  secondaryColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
  accentColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
  neutralPalette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
  fontPrimary: z.string().min(1, "Hauptschrift ist erforderlich"),
  fontSecondary: z.string().optional(),
  fallbackFontPrimary: z.string().optional(),
  fallbackFontSecondary: z.string().optional(),
  typographyClass: z.string().optional(),
  visualTone: z.string().optional(),
  imageTone: z.string().optional(),
  componentRules: componentRulesSchema,
  restrictions: restrictionsSchema,
  confidenceScore: z.number().min(0).max(100).default(0),
});

export type BrandProfileFormInput = z.infer<typeof brandProfileSchema>;

export const brandProfileService = {
  async getByClientId(clientId: string) {
    return brandProfileRepository.findByClientId(clientId);
  },

  async save(clientId: string, input: BrandProfileFormInput) {
    const data = brandProfileSchema.parse(input);
    // Derive approved flag from current review status (preserve existing)
    const existing = await brandProfileRepository.findByClientId(clientId);
    const reviewStatus = existing?.reviewStatus ?? BrandProfileStatus.ENTWURF;

    return brandProfileRepository.upsert({
      clientId,
      ...data,
      // Confidence stored as 0–1 internally, form sends 0–100
      confidenceScore: data.confidenceScore / 100,
      reviewStatus,
      approved: reviewStatus === BrandProfileStatus.FREIGEGEBEN,
    });
  },

  async setStatus(clientId: string, status: BrandProfileStatus) {
    // Must have an existing profile before approving
    const existing = await brandProfileRepository.findByClientId(clientId);
    if (!existing) throw new Error("Noch kein Markenprofil vorhanden");
    return brandProfileRepository.setReviewStatus(clientId, status);
  },

  async runAnalysis(clientId: string) {
    const [assets, existing] = await Promise.all([
      clientAssetRepository.findAllByClient(clientId),
      brandProfileRepository.findByClientId(clientId),
    ]);

    const suggestions = await analyzeBrandAssets({
      assets,
      existingProfile: existing,
    });

    return suggestions;
  },

  async getCompleteness(clientId: string): Promise<number> {
    const profile = await brandProfileRepository.findByClientId(clientId);
    if (!profile) return 0;
    return computeProfileCompleteness({
      primaryColor: profile.primaryColor,
      fontPrimary: profile.fontPrimary,
      typographyClass: profile.typographyClass,
      visualTone: profile.visualTone,
      imageTone: profile.imageTone,
      secondaryColors: profile.secondaryColors,
      componentRules: profile.componentRules,
    });
  },
};
