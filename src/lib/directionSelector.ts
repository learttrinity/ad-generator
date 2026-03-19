/**
 * Direction Selector – V1
 * Chooses the creative direction key based on brand profile and campaign context.
 */

import type { MessagePriority } from "./messagePriority";

export type DirectionKey =
  | "klar_preisfokus"
  | "modern_aktiv"
  | "premium_reduziert"
  | "dynamisch_direkt"
  | "lokal_nahbar"
  | "clean_studio";

export const DIRECTION_LABELS: Record<DirectionKey, string> = {
  klar_preisfokus: "Klar & Preis­fokus",
  modern_aktiv: "Modern & Aktiv",
  premium_reduziert: "Premium & Reduziert",
  dynamisch_direkt: "Dynamisch & Direkt",
  lokal_nahbar: "Lokal & Nahbar",
  clean_studio: "Clean Studio",
};

export const DIRECTION_DESCRIPTIONS: Record<DirectionKey, string> = {
  klar_preisfokus: "Klare Kommunikation des Preisvorteils, wenig Ablenkung, starker CTA.",
  modern_aktiv: "Bewegte, energiegeladene Ästhetik – ideal für aktive Zielgruppen.",
  premium_reduziert: "Viel Weißraum, hochwertige Typografie – für Premium-Studios.",
  dynamisch_direkt: "Volle Fläche, hoher Kontrast, direkte Ansprache, maximale Energie.",
  lokal_nahbar: "Wärme, Gemeinschaft, Studio-Nähe – ideal für lokale Anbieter.",
  clean_studio: "Aufgeräumtes Layout, neutrale Farbwelt – universell einsetzbar.",
};

type DirectionInput = {
  visualTone?: string | null;
  imageTone?: string | null;
  offerType: string;
  messagePriority: MessagePriority;
  typographyClass?: string | null;
};

export function selectDirection(input: DirectionInput): DirectionKey {
  const visualTone = input.visualTone?.toLowerCase() ?? "";
  const imageTone = input.imageTone?.toLowerCase() ?? "";
  const offerType = input.offerType.toLowerCase();
  const priority = input.messagePriority;

  // Premium signal
  if (visualTone.includes("premium") || imageTone.includes("premium")) {
    return "premium_reduziert";
  }

  // Lokal/community signal
  if (visualTone.includes("lokal") || visualTone.includes("nahbar") || imageTone.includes("community")) {
    return "lokal_nahbar";
  }

  // Energy/dynamic signal
  if (
    visualTone.includes("dynamisch") ||
    visualTone.includes("energetisch") ||
    imageTone.includes("action")
  ) {
    return priority === "preisfokussiert" ? "klar_preisfokus" : "dynamisch_direkt";
  }

  // Modern/aktiv
  if (visualTone.includes("modern") || imageTone.includes("modern")) {
    return "modern_aktiv";
  }

  // Priority-driven fallbacks
  if (priority === "preisfokussiert" || priority === "dringlichkeit_fokussiert") {
    return "klar_preisfokus";
  }

  if (priority === "angebot_fokussiert") {
    if (offerType.includes("probetraining") || offerType.includes("kurs")) {
      return "modern_aktiv";
    }
    return "clean_studio";
  }

  return "clean_studio";
}
