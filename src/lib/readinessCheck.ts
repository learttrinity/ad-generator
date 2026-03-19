/**
 * Brand + Campaign Readiness Check – V2
 * Only campaign fields (offerType, headline, priceNew) are hard blockers.
 * Brand issues (no profile, not approved, no logo) are soft warnings only.
 */

export type ReadinessIssue = {
  type: "blocker" | "warning";
  message: string;
};

export type ReadinessResult = {
  ready: boolean;
  brandScore: number;       // 0–100
  campaignScore: number;    // 0–100
  issues: ReadinessIssue[];
};

type BrandProfileInput = {
  approved: boolean;
  reviewStatus: string;
  confidenceScore: number;   // 0–1
  primaryColor: string;
  fontPrimary: string;
  hasLogo: boolean;
};

type CampaignInput = {
  headline: string;
  offerType: string;
  priceNew?: string | null;
  ctaText?: string | null;
};

export function checkReadiness(
  brand: BrandProfileInput | null,
  campaign: CampaignInput
): ReadinessResult {
  const issues: ReadinessIssue[] = [];

  // ── Brand checks (all warnings — never blockers) ─────────────────────
  if (!brand) {
    issues.push({ type: "warning", message: "Kein Markenprofil vorhanden — Ads werden mit Standardwerten generiert." });
  } else {
    if (!brand.approved) {
      issues.push({ type: "warning", message: "Markenprofil ist noch nicht freigegeben — Qualität kann variieren." });
    }
    if (!brand.hasLogo) {
      issues.push({ type: "warning", message: "Kein Logo vorhanden — Ads werden ohne Logo generiert." });
    }
    if (brand.confidenceScore < 0.4) {
      issues.push({ type: "warning", message: "Markenprofil hat niedrige Konfidenz (< 40 %). Qualität kann beeinträchtigt sein." });
    }
    if (!brand.fontPrimary) {
      issues.push({ type: "warning", message: "Keine Primärschriftart definiert." });
    }
  }

  // ── Campaign checks (these are the only hard blockers) ───────────────
  if (!campaign.headline || campaign.headline.trim().length < 3) {
    issues.push({ type: "blocker", message: "Headline fehlt oder ist zu kurz (min. 3 Zeichen)." });
  }
  if (!campaign.offerType) {
    issues.push({ type: "blocker", message: "Angebotsart ist nicht gesetzt." });
  }
  if (!campaign.priceNew) {
    issues.push({ type: "blocker", message: "Neuer Preis ist nicht gesetzt." });
  }

  // ── Scores ──────────────────────────────────────────────────────────
  let brandScore = 0;
  if (brand) {
    if (brand.approved) brandScore += 40;
    if (brand.hasLogo) brandScore += 20;
    if (brand.fontPrimary) brandScore += 15;
    brandScore += Math.round(brand.confidenceScore * 25);
  }

  let campaignScore = 0;
  if (campaign.headline?.trim()) campaignScore += 40;
  if (campaign.offerType) campaignScore += 20;
  if (campaign.priceNew) campaignScore += 20;
  if (campaign.ctaText) campaignScore += 20;

  const blockers = issues.filter((i) => i.type === "blocker");

  return {
    ready: blockers.length === 0,
    brandScore: Math.min(brandScore, 100),
    campaignScore: Math.min(campaignScore, 100),
    issues,
  };
}

// Re-export from canonical source so existing imports still work
export { AUDIENCE_MATRIX, PLACEMENT_OPTIONS } from "./audienceMatrix";
export type { AudienceKey, PlacementKey } from "./audienceMatrix";
