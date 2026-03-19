/**
 * Secure Config Resolver – V1
 *
 * Resolves provider credentials from environment variables ONLY.
 * This module is server-side exclusive. It NEVER returns actual secrets —
 * it only exposes boolean presence checks and non-secret metadata.
 *
 * Secrets live in environment variables, never in the database or
 * any client-side payload.
 *
 * ─── Required env vars per provider ─────────────────────────────────────────
 *
 * Higgsfield / Nano Banana:
 *   HIGGSFIELD_API_KEY      – API key/token (required); used as `Authorization: Key {key}`
 *   HIGGSFIELD_API_BASE     – Base URL (optional, defaults to https://platform.higgsfield.ai)
 *   HIGGSFIELD_APPLICATION  – Model path (optional, defaults to v1/text2image/soul)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ResolvedProviderConfig = {
  apiKey: string;
  apiBase: string;
};

/**
 * Returns the Higgsfield credentials for use in server-side API calls.
 * Throws if the required API key is not set.
 * NEVER call this from any client-side code or API response.
 */
export function resolveHiggsfieldConfig(): ResolvedProviderConfig {
  const apiKey = process.env.HIGGSFIELD_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "HIGGSFIELD_API_KEY ist nicht konfiguriert. Bitte in der .env.local setzen."
    );
  }
  return {
    apiKey,
    apiBase: process.env.HIGGSFIELD_API_BASE?.trim() || "https://platform.higgsfield.ai",
  };
}

/** True if HIGGSFIELD_API_KEY is present in the environment. Safe to call anywhere. */
export function hasHiggsfieldApiKey(): boolean {
  return !!process.env.HIGGSFIELD_API_KEY?.trim();
}

/** Safe summary: presence state + masked API base. No secrets returned. */
export function getHiggsfieldConfigSummary(): {
  hasApiKey: boolean;
  apiBase: string;
} {
  return {
    hasApiKey: hasHiggsfieldApiKey(),
    apiBase: process.env.HIGGSFIELD_API_BASE?.trim() || "https://platform.higgsfield.ai",
  };
}
