/**
 * Render Spec Builder – V1
 *
 * Builds a structured RenderSpec from campaign data, brand profile,
 * direction key, message priority, and placement.
 * The RenderSpec is stored in the DB and fully describes how the ad was rendered.
 */

import { resolveFont, resolveFallbackFont } from "./fontResolver";
import type { DirectionKey } from "./directionSelector";
import type { MessagePriority } from "./messagePriority";
import { getPlacement } from "./audienceMatrix";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PanelStyle = "solid" | "gradient" | "minimal";
export type UrgencyStyle = "badge" | "strip" | "pill" | "none";
export type LogoPosition = "top_left" | "top_right";
export type LayoutArchetype = "price_dominant" | "headline_dominant" | "offer_focused" | "urgency_dominant";

export type RenderSpec = {
  // Canvas
  width: number;
  height: number;
  placement: string;

  // Layout
  layoutArchetype: LayoutArchetype;
  panelStyle: PanelStyle;
  overlayOpacity: number;           // 0.0–1.0, for bottom gradient
  panelOpacity: number;             // 0.0–1.0, for content panel

  // Brand colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textOnDark: string;               // always "#ffffff" for V1
  fontFamily: string;
  fontWeightNormal: string;
  fontWeightBold: string;
  fontWeightBlack: string;

  // Border radius
  borderRadius: number;             // px — used for panels, badges, CTA

  // Logo
  showLogo: boolean;
  logoPosition: LogoPosition;
  logoWidth: number;
  logoHeight: number;

  // Content
  showHeadline: boolean;
  showSubheadline: boolean;
  showPrice: boolean;
  showOldPrice: boolean;
  showBillingInterval: boolean;
  showUrgencyBadge: boolean;
  urgencyStyle: UrgencyStyle;
  showCta: boolean;
  showLocationLine: boolean;

  // Text values
  offerType: string;
  customText: string | null;
  headline: string;
  subheadline: string | null;
  priceNew: string | null;
  priceOld: string | null;
  billingInterval: string | null;
  urgencyText: string | null;
  ctaText: string | null;
  locationLine: string | null;

  // Meta
  directionKey: string;
  messagePriority: string;
};

// ─── Direction → render tendencies ───────────────────────────────────────────

type DirectionTendency = {
  layoutArchetype: LayoutArchetype;
  panelStyle: PanelStyle;
  urgencyStyle: UrgencyStyle;
  borderRadius: number;
  overlayOpacity: number;
  panelOpacity: number;
};

const DIRECTION_TENDENCIES: Record<string, DirectionTendency> = {
  klar_preisfokus: {
    layoutArchetype: "price_dominant",
    panelStyle: "solid",
    urgencyStyle: "badge",
    borderRadius: 8,
    overlayOpacity: 0.70,
    panelOpacity: 0.88,
  },
  modern_aktiv: {
    layoutArchetype: "offer_focused",
    panelStyle: "gradient",
    urgencyStyle: "pill",
    borderRadius: 16,
    overlayOpacity: 0.65,
    panelOpacity: 0.80,
  },
  premium_reduziert: {
    layoutArchetype: "headline_dominant",
    panelStyle: "minimal",
    urgencyStyle: "none",
    borderRadius: 24,
    overlayOpacity: 0.75,
    panelOpacity: 0.70,
  },
  dynamisch_direkt: {
    layoutArchetype: "urgency_dominant",
    panelStyle: "solid",
    urgencyStyle: "strip",
    borderRadius: 0,
    overlayOpacity: 0.80,
    panelOpacity: 0.92,
  },
  lokal_nahbar: {
    layoutArchetype: "offer_focused",
    panelStyle: "solid",
    urgencyStyle: "pill",
    borderRadius: 20,
    overlayOpacity: 0.65,
    panelOpacity: 0.85,
  },
  clean_studio: {
    layoutArchetype: "headline_dominant",
    panelStyle: "gradient",
    urgencyStyle: "badge",
    borderRadius: 12,
    overlayOpacity: 0.70,
    panelOpacity: 0.80,
  },
};

// Priority can override layout archetype
const PRIORITY_OVERRIDES: Partial<Record<MessagePriority, Partial<DirectionTendency>>> = {
  preisfokussiert: { layoutArchetype: "price_dominant" },
  dringlichkeit_fokussiert: { layoutArchetype: "urgency_dominant", urgencyStyle: "strip" },
  headline_fokussiert: { layoutArchetype: "headline_dominant" },
  angebot_fokussiert: { layoutArchetype: "offer_focused" },
};

// ─── Main builder ─────────────────────────────────────────────────────────────

type BuildInput = {
  placementKey: string;
  directionKey: string;
  messagePriority: string;
  offerType?: string | null;
  customText?: string | null;
  brandPrimaryColor?: string | null;
  brandSecondaryColors?: unknown;
  brandAccentColors?: unknown;
  brandFontPrimary?: string | null;
  brandTypographyClass?: string | null;
  brandComponentRules?: Record<string, string> | null;
  hasLogo: boolean;
  headline: string;
  subheadline?: string | null;
  priceNew?: string | null;
  priceOld?: string | null;
  billingInterval?: string | null;
  urgencyText?: string | null;
  ctaText?: string | null;
  locationLine?: string | null;
};

export function buildRenderSpec(input: BuildInput): RenderSpec {
  const placement = getPlacement(input.placementKey);
  const tendency = {
    ...(DIRECTION_TENDENCIES[input.directionKey] ?? DIRECTION_TENDENCIES.clean_studio),
    ...(PRIORITY_OVERRIDES[input.messagePriority as MessagePriority] ?? {}),
  };

  // Brand colors
  const primaryColor = input.brandPrimaryColor ?? "#1a1a2e";
  const secondaryColors = Array.isArray(input.brandSecondaryColors) ? input.brandSecondaryColors : [];
  const accentColors = Array.isArray(input.brandAccentColors) ? input.brandAccentColors : [];
  const secondaryColor = (secondaryColors[0] as string) ?? "#2d2d44";
  const accentColor = (accentColors[0] as string) ?? "#e63946";

  // Font
  const font = resolveFont(input.brandFontPrimary) ?? resolveFallbackFont(input.brandTypographyClass);

  // Component rules
  const rules = input.brandComponentRules ?? {};
  const urgencyStyleFromBrand = rules.urgencyStyle;
  const urgencyStyle: UrgencyStyle = urgencyStyleFromBrand === "none"
    ? "none"
    : input.urgencyText
      ? tendency.urgencyStyle
      : "none";

  // Logo sizing
  const isStory = placement.height > placement.width;
  const logoWidth = isStory ? 220 : 180;
  const logoHeight = isStory ? 88 : 72;

  // Determine what's visible
  const showPrice = !!input.priceNew;
  const showOldPrice = !!input.priceOld && showPrice;

  return {
    width: placement.width,
    height: placement.height,
    placement: input.placementKey,

    layoutArchetype: tendency.layoutArchetype,
    panelStyle: tendency.panelStyle,
    overlayOpacity: tendency.overlayOpacity,
    panelOpacity: tendency.panelOpacity,

    primaryColor,
    secondaryColor,
    accentColor,
    textOnDark: "#ffffff",
    fontFamily: font.family,
    fontWeightNormal: font.weightNormal,
    fontWeightBold: font.weightBold,
    fontWeightBlack: font.weightBlack,

    borderRadius: tendency.borderRadius,

    showLogo: input.hasLogo,
    logoPosition: "top_left",
    logoWidth,
    logoHeight,

    showHeadline: !!(input.headline && input.headline.trim()),
    showSubheadline: !!(input.subheadline && input.subheadline.trim()),
    showPrice,
    showOldPrice,
    showBillingInterval: !!(input.billingInterval && showPrice),
    showUrgencyBadge: urgencyStyle !== "none",
    urgencyStyle,
    showCta: !!(input.ctaText && input.ctaText.trim()),
    showLocationLine: !!(input.locationLine && input.locationLine.trim()),

    offerType: input.offerType ?? "",
    customText: input.customText?.trim() || null,
    headline: input.headline,
    subheadline: input.subheadline?.trim() || null,
    priceNew: input.priceNew ?? null,
    priceOld: input.priceOld ?? null,
    billingInterval: input.billingInterval ?? null,
    urgencyText: input.urgencyText?.trim() || null,
    ctaText: input.ctaText?.trim() || null,
    locationLine: input.locationLine?.trim() || null,

    directionKey: input.directionKey,
    messagePriority: input.messagePriority,
  };
}
