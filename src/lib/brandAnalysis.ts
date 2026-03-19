import type { ClientAsset } from "@prisma/client";

// ─── Brand Analysis Service (Placeholder) ─────────────────────────────────────
// V1: Heuristic suggestions based on uploaded asset types and counts.
// Phase N: Replace `analyze()` with a real AI/vision service call.
// The interface stays the same — callers don't need to change.

export interface BrandSuggestions {
  primaryColor: string;
  typographyClass: string;
  visualTone: string;
  imageTone: string;
  confidenceScore: number;   // 0–1
  completenessScore: number; // 0–1
  notes: string[];           // human-readable hints shown in the UI
}

export interface AnalysisContext {
  assets: ClientAsset[];
  existingProfile?: {
    primaryColor?: string;
    typographyClass?: string | null;
    visualTone?: string | null;
    imageTone?: string | null;
  } | null;
}

/**
 * Returns brand suggestions for the onboarding wizard.
 *
 * V1 logic is purely heuristic:
 * - More assets → higher confidence
 * - Logo present → typography readiness increases
 * - Reference ads present → style hints available
 *
 * To integrate AI: replace this function body while keeping the signature.
 */
export async function analyzeBrandAssets(ctx: AnalysisContext): Promise<BrandSuggestions> {
  const { assets, existingProfile } = ctx;

  const hasLogo = assets.some((a) => a.assetType === "logo" || a.assetType === "logo_alt");
  const hasReferenceAds = assets.some((a) => a.assetType === "reference_ad");
  const hasFont = assets.some((a) => a.assetType === "font");
  const hasPdf = assets.some((a) => a.assetType === "brand_pdf");
  const hasSocial = assets.some((a) => a.assetType === "social_reference");

  const assetCount = assets.length;
  const notes: string[] = [];

  // ─── Confidence heuristic ───────────────────────────────────────────────
  let confidence = 0.1;
  if (assetCount > 0) confidence += 0.1;
  if (assetCount > 2) confidence += 0.1;
  if (hasLogo) confidence += 0.2;
  if (hasReferenceAds) confidence += 0.2;
  if (hasFont) confidence += 0.1;
  if (hasPdf) confidence += 0.1;
  if (hasSocial) confidence += 0.1;
  confidence = Math.min(confidence, 0.85); // cap at 85% without AI

  // ─── Completeness ───────────────────────────────────────────────────────
  let completeness = 0;
  if (hasLogo) completeness += 0.3;
  if (hasReferenceAds || hasSocial) completeness += 0.3;
  if (hasFont || hasPdf) completeness += 0.2;
  if (assetCount >= 3) completeness += 0.2;
  completeness = Math.min(completeness, 1);

  // ─── Notes / hints ──────────────────────────────────────────────────────
  if (!hasLogo) notes.push("Kein Logo hochgeladen – Primärfarbe kann nicht automatisch erkannt werden.");
  if (!hasReferenceAds && !hasSocial) notes.push("Frühere Ads oder Social-Referenzen würden die Stilanalyse verbessern.");
  if (!hasFont) notes.push("Keine Schriftdatei vorhanden – Typografie muss manuell eingetragen werden.");
  if (assetCount === 0) notes.push("Noch keine Materialien hochgeladen. Lade mindestens ein Logo hoch.");

  // ─── Suggestions ────────────────────────────────────────────────────────
  // In V1, we keep existing values or return neutral defaults.
  // A real AI extractor would parse image colors/fonts from the uploaded files.
  const primaryColor = existingProfile?.primaryColor ?? "#000000";
  const typographyClass = existingProfile?.typographyClass ?? "Neo-Grotesk";
  const visualTone = existingProfile?.visualTone ?? "Modern";
  const imageTone = existingProfile?.imageTone ?? "Clean Commercial";

  if (assetCount > 0) {
    notes.push(
      `Analyse basiert auf ${assetCount} hochgeladenem Material.` +
      " Überprüfe und passe die Vorschläge manuell an.",
    );
  }

  return {
    primaryColor,
    typographyClass,
    visualTone,
    imageTone,
    confidenceScore: confidence,
    completenessScore: completeness,
    notes,
  };
}

// ─── Completeness check ───────────────────────────────────────────────────────
// Returns a 0–100 percentage of how complete a brand profile is.

export function computeProfileCompleteness(profile: {
  primaryColor: string;
  fontPrimary: string;
  typographyClass: string | null;
  visualTone: string | null;
  imageTone: string | null;
  secondaryColors: unknown;
  componentRules: unknown;
}): number {
  let score = 0;
  if (profile.primaryColor && profile.primaryColor !== "#000000") score += 20;
  if (profile.fontPrimary) score += 20;
  if (profile.typographyClass) score += 15;
  if (profile.visualTone) score += 15;
  if (profile.imageTone) score += 15;
  const secondary = Array.isArray(profile.secondaryColors) ? profile.secondaryColors : [];
  if (secondary.length > 0) score += 10;
  const rules = profile.componentRules as Record<string, unknown>;
  if (rules && Object.keys(rules).length > 2) score += 5;
  return Math.min(score, 100);
}
