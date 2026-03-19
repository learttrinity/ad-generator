"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

type ExportLog = {
  id: string;
  status: string;
  assetCount: number;
  exportedCount: number;
  errorMessage: string | null;
  driveFolderId: string;
  exportedAt: string;
};

type Props = {
  runId: string;
  hasExportableAssets: boolean;
  initialLogs: ExportLog[];
};

export function DriveExportButton({ runId, hasExportableAssets, initialLogs }: Props) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    driveFolderPath?: string;
    error?: string;
  } | null>(null);
  const [logs, setLogs] = useState<ExportLog[]>(initialLogs);

  async function handleExport() {
    setExporting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/drive/export/${runId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, message: data.message, driveFolderPath: data.driveFolderPath });
        // Reload logs
        const logsRes = await fetch(`/api/drive/export/${runId}`);
        const logsData = await logsRes.json();
        if (logsData.logs) setLogs(logsData.logs);
        router.refresh();
      } else {
        setResult({ success: false, error: data.error ?? "Unbekannter Fehler" });
      }
    } catch {
      setResult({ success: false, error: "Netzwerkfehler beim Export" });
    } finally {
      setExporting(false);
    }
  }

  const lastSuccessLog = logs.find((l) => l.status === "success" || l.status === "partial");

  return (
    <div className="space-y-3">
      {/* Export button */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">Nach Google Drive exportieren</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasExportableAssets
              ? "Finale Ads in den konfigurierten Export-Ordner hochladen"
              : "Keine fertigen Ads vorhanden – bitte zuerst rendern"}
          </p>
          {lastSuccessLog && (
            <p className="text-xs text-green-700 mt-0.5">
              Zuletzt exportiert: {formatDateTime(lastSuccessLog.exportedAt)} ·{" "}
              {lastSuccessLog.exportedCount}/{lastSuccessLog.assetCount} Assets
            </p>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !hasExportableAssets}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400/40 border-t-gray-500 rounded-full animate-spin" />
              Exportiert …
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Nach Drive exportieren
            </>
          )}
        </button>
      </div>

      {/* Result feedback */}
      {result && (
        <div
          className={`rounded-lg px-3 py-2.5 text-xs ${
            result.success
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {result.success ? (
            <div className="space-y-0.5">
              <p className="font-medium">{result.message}</p>
              {result.driveFolderPath && (
                <p className="text-green-700">Pfad: Ad-Generator/{result.driveFolderPath}</p>
              )}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}

      {/* Export history */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Export-Verlauf</p>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    log.status === "success"
                      ? "bg-green-500"
                      : log.status === "partial"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">
                    {log.status === "success"
                      ? "Erfolgreich"
                      : log.status === "partial"
                      ? "Teilweise exportiert"
                      : "Fehlgeschlagen"}
                    {" · "}
                    {log.exportedCount}/{log.assetCount} Assets
                  </p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-600 truncate">{log.errorMessage}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  {formatDateTime(log.exportedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
