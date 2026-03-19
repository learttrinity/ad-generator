/**
 * Message Priority – V1
 * Determines the dominant message mode for a generation run.
 */

export type MessagePriority =
  | "preisfokussiert"
  | "headline_fokussiert"
  | "angebot_fokussiert"
  | "dringlichkeit_fokussiert";

export const MESSAGE_PRIORITY_LABELS: Record<MessagePriority, string> = {
  preisfokussiert: "Preis­fokussiert",
  headline_fokussiert: "Headline­fokussiert",
  angebot_fokussiert: "Angebots­fokussiert",
  dringlichkeit_fokussiert: "Dringlichkeits­fokussiert",
};

export const MESSAGE_PRIORITY_DESCRIPTIONS: Record<MessagePriority, string> = {
  preisfokussiert: "Preis und Ersparnis stehen im Vordergrund – ideal bei klaren Preis-Angebotslagen.",
  headline_fokussiert: "Der Haupttext trägt die Werbebotschaft – geeignet bei emotionalen oder imageorientierten Kampagnen.",
  angebot_fokussiert: "Das Angebot selbst (z. B. Probetraining, Kurs) steht im Zentrum, ohne reinen Preisfokus.",
  dringlichkeit_fokussiert: "Zeitdruck und Limitierung stehen im Vordergrund – maximale Conversion-Orientierung.",
};

type PriorityInput = {
  offerType: string;
  priceNew: string | null;
  priceOld: string | null;
  urgencyText: string | null;
  headline: string;
};

export function computeMessagePriority(input: PriorityInput): MessagePriority {
  const hasPrice = !!input.priceNew;
  const hasOldPrice = !!input.priceOld;
  const hasUrgency = !!input.urgencyText && input.urgencyText.trim().length > 0;
  const offerType = input.offerType.toLowerCase();

  // Strong urgency signal overrides price
  if (hasUrgency && hasPrice) return "dringlichkeit_fokussiert";

  // Urgency without price
  if (hasUrgency && !hasPrice) return "dringlichkeit_fokussiert";

  // Price with strikethru → clear price focus
  if (hasPrice && hasOldPrice) return "preisfokussiert";

  // Offer types without strong price signal → angebot-fokussiert
  if (
    offerType.includes("probetraining") ||
    offerType.includes("kurs") ||
    offerType.includes("event")
  ) {
    return hasPrice ? "preisfokussiert" : "angebot_fokussiert";
  }

  // Price present without discount → still price-focused
  if (hasPrice) return "preisfokussiert";

  // No price, no urgency → headline carries the message
  return "headline_fokussiert";
}
