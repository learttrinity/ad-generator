/**
 * Campaign Normalization – V1
 * Normalizes raw campaign data before a GenerationRun is created.
 * Returns a structured payload and a warnings array.
 */

export type NormalizationWarning = {
  field: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type NormalizedCampaignPayload = {
  headline: string;
  subheadline: string | null;
  urgencyText: string | null;
  ctaText: string | null;
  locationLine: string | null;
  priceNew: string | null;         // formatted: "29,90"
  priceOld: string | null;         // formatted: "49,90"
  showOldPrice: boolean;
  billingInterval: string | null;
  contractTerm: string | null;
  offerType: string;
};

export type NormalizationResult = {
  payload: NormalizedCampaignPayload;
  warnings: NormalizationWarning[];
  valid: boolean;
};

const MAX_HEADLINE_LEN = 60;
const MAX_SUBHEADLINE_LEN = 80;
const MAX_URGENCY_LEN = 50;
const MAX_CTA_LEN = 30;

function formatPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toFixed(2).replace(".", ",");
}

function trimSafe(s: string | null | undefined): string | null {
  if (!s || s.trim() === "") return null;
  return s.trim();
}

export function normalizeCampaign(campaign: {
  headline: string;
  subheadline?: string | null;
  urgencyText?: string | null;
  ctaText?: string | null;
  locationLine?: string | null;
  priceNew?: number | string | null;
  priceOld?: number | string | null;
  billingInterval?: string | null;
  contractTerm?: string | null;
  offerType: string;
}): NormalizationResult {
  const warnings: NormalizationWarning[] = [];

  // Headline
  const headline = campaign.headline.trim();
  if (!headline) {
    warnings.push({ field: "headline", severity: "error", message: "Headline ist leer." });
  } else if (headline.length > MAX_HEADLINE_LEN) {
    warnings.push({
      field: "headline",
      severity: "warning",
      message: `Headline ist sehr lang (${headline.length} Zeichen). Empfehlung: max. ${MAX_HEADLINE_LEN}.`,
    });
  }

  // Subheadline
  const subheadline = trimSafe(campaign.subheadline);
  if (subheadline && subheadline.length > MAX_SUBHEADLINE_LEN) {
    warnings.push({
      field: "subheadline",
      severity: "warning",
      message: `Subheadline ist lang (${subheadline.length} Zeichen). Empfehlung: max. ${MAX_SUBHEADLINE_LEN}.`,
    });
  }

  // Urgency
  const urgencyText = trimSafe(campaign.urgencyText);
  if (urgencyText && urgencyText.length > MAX_URGENCY_LEN) {
    warnings.push({
      field: "urgencyText",
      severity: "info",
      message: `Dringlichkeitstext ist lang (${urgencyText.length} Zeichen). Empfehlung: max. ${MAX_URGENCY_LEN}.`,
    });
  }

  // CTA
  const ctaText = trimSafe(campaign.ctaText);
  if (ctaText && ctaText.length > MAX_CTA_LEN) {
    warnings.push({
      field: "ctaText",
      severity: "info",
      message: `CTA-Text ist lang (${ctaText.length} Zeichen). Empfehlung: max. ${MAX_CTA_LEN}.`,
    });
  }

  // Price parsing
  function parsePrice(val: number | string | null | undefined): number | null {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    const n = parseFloat(String(val).replace(",", "."));
    return isNaN(n) ? null : n;
  }

  const priceNewNum = parsePrice(campaign.priceNew);
  const priceOldNum = parsePrice(campaign.priceOld);

  if (priceOldNum !== null && priceNewNum !== null && priceOldNum <= priceNewNum) {
    warnings.push({
      field: "priceOld",
      severity: "warning",
      message: "Alter Preis ist nicht höher als neuer Preis – Streichpreis wird nicht angezeigt.",
    });
  }

  const showOldPrice = priceOldNum !== null && priceNewNum !== null && priceOldNum > priceNewNum;

  return {
    payload: {
      headline,
      subheadline,
      urgencyText,
      ctaText,
      locationLine: trimSafe(campaign.locationLine),
      priceNew: formatPrice(priceNewNum),
      priceOld: showOldPrice ? formatPrice(priceOldNum) : null,
      showOldPrice,
      billingInterval: trimSafe(campaign.billingInterval),
      contractTerm: trimSafe(campaign.contractTerm),
      offerType: campaign.offerType,
    },
    warnings,
    valid: !warnings.some((w) => w.severity === "error"),
  };
}
