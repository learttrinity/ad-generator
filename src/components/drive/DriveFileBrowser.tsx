"use client";

import { useState } from "react";

type DriveFileItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
};

type Props = {
  clientId: string;
  folderId: string;
  folderLabel: string;
  type?: "all" | "images" | "documents";
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mimeTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("document")) return "📝";
  if (mimeType.includes("folder")) return "📁";
  return "📎";
}

export function DriveFileBrowser({ clientId, folderId, folderLabel, type = "all" }: Props) {
  const [files, setFiles] = useState<DriveFileItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ clientId, folderId, type });
      const res = await fetch(`/api/drive/browse?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Laden");
      } else {
        setFiles(data.files ?? []);
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{folderLabel}</p>
          <p className="text-xs text-gray-400 font-mono">{folderId}</p>
        </div>
        <button
          onClick={loadFiles}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? "Lädt …" : files === null ? "Dateien anzeigen" : "Aktualisieren"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {files !== null && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {files.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              Keine Dateien in diesem Ordner
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-base shrink-0">{mimeTypeIcon(file.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                      {file.modifiedTime && (
                        <> · {new Date(file.modifiedTime).toLocaleDateString("de-DE")}</>
                      )}
                    </p>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline shrink-0"
                    >
                      Drive ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety notice */}
      <p className="text-xs text-gray-400">
        Nur-Lese-Ansicht · Keine Aktionen in diesem Ordner möglich
      </p>
    </div>
  );
}
