/**
 * Provider Health Service – V1
 *
 * Tests provider connections from the server side.
 * Secrets are read from env vars via secureConfigResolver — never passed in from outside.
 * Test results are stored in IntegrationSetting for status display.
 */

import { imageProviderSettingsService, type ProviderKey } from "./imageProviderSettingsService";
import { hasHiggsfieldApiKey } from "@/lib/providers/secureConfigResolver";

export type HealthCheckResult = {
  ok: boolean;
  status: "success" | "failed";
  message: string;
  detail?: string;
};

export const providerHealthService = {
  async testAndStore(key: ProviderKey): Promise<HealthCheckResult> {
    const result = await runHealthCheck(key);
    await imageProviderSettingsService.storeTestResult(key, result.status);
    return result;
  },
};

// ─── Provider-specific checks ────────────────────────────────────────────────

async function runHealthCheck(key: ProviderKey): Promise<HealthCheckResult> {
  switch (key) {
    case "higgsfield":
      return checkHiggsfield();
    case "mock":
      return { ok: true, status: "success", message: "Mock-Provider bereit (kein API-Zugang nötig)" };
    default:
      return { ok: false, status: "failed", message: `Unbekannter Provider: ${key}` };
  }
}

async function checkHiggsfield(): Promise<HealthCheckResult> {
  if (!hasHiggsfieldApiKey()) {
    return {
      ok: false,
      status: "failed",
      message: "HIGGSFIELD_API_KEY nicht gesetzt",
      detail:
        "Bitte HIGGSFIELD_API_KEY in der .env.local konfigurieren. Der Schlüssel wird nie in der Datenbank gespeichert.",
    };
  }

  const apiKey = process.env.HIGGSFIELD_API_KEY!.trim();
  const apiBase = process.env.HIGGSFIELD_API_BASE?.trim() || "https://cloud.higgsfield.ai";

  // Attempt a lightweight authenticated API call.
  // We try a few likely endpoints in order; 401/403 means wrong key,
  // 200/404 means the key is accepted (endpoint may differ by API version).
  const probeUrls = [`${apiBase}/generation`, `${apiBase}/models`, `${apiBase}/health`];

  for (const url of probeUrls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: "failed",
          message: "API-Schlüssel ungültig",
          detail: `HTTP ${res.status} – Authentifizierung fehlgeschlagen`,
        };
      }

      if (res.ok || res.status === 404 || res.status === 405) {
        // 200 = explicitly healthy; 404/405 = endpoint exists but wrong method — auth worked
        return {
          ok: true,
          status: "success",
          message: res.ok ? "Verbindung erfolgreich" : "API-Schlüssel akzeptiert",
          detail:
            res.status !== 200
              ? `HTTP ${res.status} bei ${url} – Authentifizierung korrekt`
              : undefined,
        };
      }

      // Other status codes — try next probe URL
      continue;
    } catch {
      // Network error on this URL — try next
      continue;
    }
  }

  // All probes failed with network errors
  return {
    ok: false,
    status: "failed",
    message: "Keine Verbindung zur Higgsfield API",
    detail: "Alle Probe-Endpunkte haben einen Netzwerkfehler zurückgegeben. API-Basis: " + apiBase,
  };
}
