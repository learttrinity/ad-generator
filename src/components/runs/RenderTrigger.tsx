"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  runId: string;
  assetCount: number;
};

export function RenderTrigger({ runId, assetCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRender() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/runs/${runId}/render`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unbekannter Fehler");
      } else {
        setResult(data.message ?? "Rendern abgeschlossen");
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler beim Rendern");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRender}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {loading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Rendert …
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.692-1.31 2.349l-6.15-1.617a1.875 1.875 0 00-.95 0L6.45 19.05c-1.34.343-2.31-1.35-1.31-2.35l1.402-1.401" />
            </svg>
            Rendern starten ({assetCount})
          </>
        )}
      </button>
      {result && (
        <p className="text-xs text-success-text bg-success-bg border border-success-border rounded-lg px-3 py-1.5">{result}</p>
      )}
      {error && (
        <p className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-lg px-3 py-1.5">{error}</p>
      )}
    </div>
  );
}
