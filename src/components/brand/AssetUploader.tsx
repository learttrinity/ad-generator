"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ClientAsset, ClientAssetType } from "@prisma/client";
import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from "@/lib/assetTypes";

interface AssetUploaderProps {
  clientId: string;
  assets: ClientAsset[];
  onUploaded: (asset: ClientAsset) => void;
  onDeleted: (assetId: string) => void;
}

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [ClientAssetType, string][];


export function AssetUploader({ clientId, assets, onUploaded, onDeleted }: AssetUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<ClientAssetType>("logo");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);
      formData.append("assetType", selectedType);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload fehlgeschlagen");
      }
      const asset: ClientAsset = await res.json();
      onUploaded(asset);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(assetId: string) {
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen");
      onDeleted(assetId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  // Group assets by type
  const grouped = ASSET_TYPES.reduce<Record<ClientAssetType, ClientAsset[]>>(
    (acc, [type]) => {
      acc[type] = assets.filter((a) => a.assetType === type);
      return acc;
    },
    {} as Record<ClientAssetType, ClientAsset[]>,
  );

  const isImage = (mimeType: string | null) => mimeType?.startsWith("image/") ?? false;

  return (
    <div className="space-y-6">
      {/* Upload controls */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">Asset-Typ</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ClientAssetType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ASSET_TYPES.map(([type, label]) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_ICONS[type]} {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-brand-600 text-white hover:bg-brand-700 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird hochgeladen…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Datei hochladen
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.ttf,.otf,.woff,.woff2,.zip"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Erlaubt: Bilder (JPG, PNG, SVG, WebP), PDF, Schriftdateien (TTF, OTF, WOFF) — Max. 20 MB
        </p>
      </div>

      {/* Uploaded assets grouped by type */}
      {assets.length > 0 && (
        <div className="space-y-4">
          {ASSET_TYPES.filter(([type]) => grouped[type]?.length > 0).map(([type, label]) => (
            <div key={type}>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {ASSET_TYPE_ICONS[type]} {label} ({grouped[type].length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[type].map((asset) => (
                  <div key={asset.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white group">
                    {/* Thumbnail or icon */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {isImage(asset.mimeType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.fileUrl}
                          alt={asset.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">{ASSET_TYPE_ICONS[asset.assetType]}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{asset.fileName}</p>
                      <p className="text-xs text-gray-400">
                        {asset.fileSize ? `${(asset.fileSize / 1024).toFixed(0)} KB` : ""}
                        {asset.mimeType ? ` · ${asset.mimeType.split("/")[1]?.toUpperCase()}` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      disabled={deletingId === asset.id}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Löschen"
                    >
                      {deletingId === asset.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Noch keine Materialien hochgeladen.
        </p>
      )}
    </div>
  );
}
