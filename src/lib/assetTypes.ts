import type { ClientAssetType } from "@prisma/client";

// Shared constants for client asset types — safe to import in both client and server components
export const ASSET_TYPE_LABELS: Record<ClientAssetType, string> = {
  logo:               "Logo (Hauptlogo)",
  logo_alt:           "Logo (Alternative)",
  reference_ad:       "Frühere Anzeige",
  screenshot:         "Screenshot",
  brand_pdf:          "Brand-PDF / Style-Guide",
  font:               "Schriftdatei",
  social_reference:   "Social-Media-Referenz",
  website_reference:  "Website-Referenz",
};

export const ASSET_TYPE_ICONS: Record<ClientAssetType, string> = {
  logo:               "🖼",
  logo_alt:           "🖼",
  reference_ad:       "📢",
  screenshot:         "📸",
  brand_pdf:          "📄",
  font:               "🔤",
  social_reference:   "📱",
  website_reference:  "🌐",
};
