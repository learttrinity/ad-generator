"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProviderHealthBadge } from "./ProviderHealthBadge";
import { formatDateTime } from "@/lib/utils";
import type { ProviderInfo } from "@/services/imageProviderSettingsService";

type Props = {
  provider: ProviderInfo;
};

export function ProviderCard({ provider }: Props) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { key, label, description, isActive, healthStatus, hasApiKey, lastTestedAt, workspaceLabel } = provider;

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/providers/${key}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult({ ok: data.ok, message: data.message, detail: data.detail });
      router.refresh();
    } catch {
      setTestResult({ ok: false, message: "Netzwerkfehler beim Test" });
    } finally {
      setTesting(false);
    }
  }

  async function handleActivate() {
    setActivating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/providers/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Fehler beim Aktivieren");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("Netzwerkfehler");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-5 space-y-4 transition-all ${
        isActive
          ? "border-accent-200 bg-accent-50/30 ring-1 ring-accent-100"
          : "border-border bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-ink">{label}</h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-medium">
                ✓ Aktiver Provider
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
        <ProviderHealthBadge status={healthStatus} />
      </div>

      {/* Config details */}
      <div className="space-y-1.5 text-xs">
        {/* API key status — never shows the actual key */}
        <div className="flex items-center gap-2">
          <span className="text-ink-muted w-32 shrink-0">API-Schlüssel</span>
          {key === "mock" ? (
            <span className="text-ink-faint">Nicht erforderlich</span>
          ) : hasApiKey ? (
            <span className="inline-flex items-center gap-1 text-success-text">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Hinterlegt (Umgebungsvariable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-danger-text">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              Fehlt – HIGGSFIELD_API_KEY setzen
            </span>
          )}
        </div>

        {workspaceLabel && (
          <div className="flex items-center gap-2">
            <span className="text-ink-muted w-32 shrink-0">Workspace</span>
            <span className="text-ink-secondary">{workspaceLabel}</span>
          </div>
        )}

        {lastTestedAt && (
          <div className="flex items-center gap-2">
            <span className="text-ink-muted w-32 shrink-0">Letzter Test</span>
            <span className="text-ink-muted">{formatDateTime(lastTestedAt)}</span>
          </div>
        )}
      </div>

      {/* API key hint for Higgsfield */}
      {key === "higgsfield" && !hasApiKey && (
        <div className="rounded-lg bg-warning-bg border border-warning-border px-3 py-2.5 text-xs text-warning-text space-y-1">
          <p className="font-medium">API-Schlüssel nicht gefunden</p>
          <p>
            Bitte in <code className="bg-warning-bg px-1 rounded border border-warning-border">.env.local</code> setzen:
          </p>
          <code className="block bg-warning-bg px-2 py-1 rounded font-mono border border-warning-border">
            HIGGSFIELD_API_KEY=dein-api-schluessel
          </code>
          <p className="opacity-80">
            Der Schlüssel wird ausschließlich serverseitig verwendet und niemals im Browser angezeigt.
          </p>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            testResult.ok
              ? "bg-success-bg border border-success-border text-success-text"
              : "bg-danger-bg border border-danger-border text-danger-text"
          }`}
        >
          <p className="font-medium">{testResult.message}</p>
          {testResult.detail && <p className="mt-0.5 text-xs opacity-80">{testResult.detail}</p>}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg bg-danger-bg border border-danger-border px-3 py-2 text-xs text-danger-text">
          {actionError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-ink-faint border-t-ink-muted rounded-full animate-spin" />
              Teste …
            </span>
          ) : (
            "Verbindung prüfen"
          )}
        </button>

        {!isActive && (
          <button
            onClick={handleActivate}
            disabled={activating || !provider.canActivate}
            title={!provider.canActivate ? "Konfiguration unvollständig" : undefined}
            className="px-3 py-1.5 text-xs rounded-lg bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {activating ? "Aktiviert …" : "Als aktiven Provider setzen"}
          </button>
        )}

        {isActive && (
          <span className="text-xs text-accent-600 font-medium">Derzeit aktiver Provider</span>
        )}
      </div>
    </div>
  );
}
