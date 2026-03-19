"use client";

import { useState } from "react";

type StatusData = {
  configured: boolean;
  mode: string | null;
  envHint: string | null;
};

type TestResult = {
  ok: boolean;
  email?: string;
  error?: string;
};

type Props = {
  initial: StatusData;
};

export function DriveConnectionStatus({ initial }: Props) {
  const [status] = useState<StatusData>(initial);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/drive/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: "Netzwerkfehler" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Status pill */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            status.configured
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${status.configured ? "bg-green-500" : "bg-gray-400"}`}
          />
          {status.configured ? "Konfiguriert" : "Nicht konfiguriert"}
        </span>
        {status.mode && (
          <span className="text-xs text-gray-500">Modus: {status.mode}</span>
        )}
      </div>

      {/* Env hint */}
      {!status.configured && status.envHint && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <p className="font-medium mb-1">Konfiguration fehlt</p>
          <p>{status.envHint}</p>
        </div>
      )}

      {/* Test button */}
      {status.configured && (
        <div className="space-y-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400/40 border-t-gray-400 rounded-full animate-spin" />
                Verbindung wird geprüft …
              </>
            ) : (
              "Verbindung testen"
            )}
          </button>

          {testResult && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                testResult.ok
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {testResult.ok ? (
                <>Verbindung erfolgreich · Service-Account: {testResult.email}</>
              ) : (
                <>Fehler: {testResult.error}</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
