/**
 * Font Resolver – V1
 *
 * Maps brand font names to safe system fonts available for SVG/librsvg rendering.
 * In V1 we use system fonts for reliability. To add custom font support in V2,
 * load font ArrayBuffers here and embed as base64 @font-face in the overlay SVG.
 */

type FontStack = {
  family: string;        // CSS font-family string for SVG
  weightNormal: string;
  weightBold: string;
  weightBlack: string;
  isSerif: boolean;
};

const FONT_MAP: Record<string, FontStack> = {
  // Sans-serif
  Montserrat:         { family: "Arial, Helvetica, sans-serif",    weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  Inter:              { family: "Arial, Helvetica, sans-serif",    weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  Roboto:             { family: "Arial, Helvetica, sans-serif",    weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  Oswald:             { family: "'Arial Black', Arial, sans-serif", weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  "Open Sans":        { family: "Arial, Helvetica, sans-serif",    weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  Raleway:            { family: "Arial, Helvetica, sans-serif",    weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: false },
  // Serif
  "Playfair Display": { family: "Georgia, 'Times New Roman', serif", weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: true  },
  Merriweather:       { family: "Georgia, 'Times New Roman', serif", weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: true  },
  Lora:               { family: "Georgia, 'Times New Roman', serif", weightNormal: "400", weightBold: "700", weightBlack: "900", isSerif: true  },
};

const FALLBACK_SANS: FontStack = {
  family: "Arial, Helvetica, sans-serif",
  weightNormal: "400",
  weightBold: "700",
  weightBlack: "900",
  isSerif: false,
};

const FALLBACK_SERIF: FontStack = {
  family: "Georgia, 'Times New Roman', serif",
  weightNormal: "400",
  weightBold: "700",
  weightBlack: "900",
  isSerif: true,
};

export function resolveFont(brandFontName: string | null | undefined): FontStack {
  if (!brandFontName) return FALLBACK_SANS;
  return FONT_MAP[brandFontName] ?? FALLBACK_SANS;
}

export function resolveFallbackFont(typographyClass: string | null | undefined): FontStack {
  if (!typographyClass) return FALLBACK_SANS;
  const lower = typographyClass.toLowerCase();
  if (lower.includes("serif") || lower.includes("elegant") || lower.includes("boutique")) {
    return FALLBACK_SERIF;
  }
  return FALLBACK_SANS;
}

export type { FontStack };
