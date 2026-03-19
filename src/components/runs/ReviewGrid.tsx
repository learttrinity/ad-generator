"use client";

import { useState } from "react";
import type { RenderSpec } from "@/lib/renderSpecBuilder";

type AssetData = {
  id: string;
  audienceKey: string;
  placement: string;
  dimensions: string | null;
  status: string;
  approved: boolean;
  baseImageUrl: string | null;
  finalAssetUrl: string | null;
  errorMessage: string | null;
  imagePrompt: string | null;
  negativePrompt: string | null;
  promptBlocks: unknown;
  renderSpec: RenderSpec | null;
  renderWarnings: string[];
};

type Props = {
  runId: string;
  runNumber: number;
  clientInitials: string;
  campaignTitle: string;
  createdAt: string;
  assets: AssetData[];
  audienceLabels: Record<string, string>;
};

const ASSET_STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  AUSSTEHEND:      { label: "Wartet",       text: "text-ink-faint",    bg: "bg-border" },
  IN_VORBEREITUNG: { label: "Vorbereitung", text: "text-ink-muted",    bg: "bg-surface" },
  ANGEFRAGT:       { label: "Angefragt",    text: "text-accent-600",   bg: "bg-accent-50" },
  IN_GENERIERUNG:  { label: "Generiert …",  text: "text-accent-600",   bg: "bg-accent-50" },
  FERTIG:          { label: "Fertig",       text: "text-success-text", bg: "bg-success-bg" },
  FEHLGESCHLAGEN:  { label: "Fehler",       text: "text-danger-text",  bg: "bg-danger-bg" },
  FREIGEGEBEN:     { label: "Freigegeben",  text: "text-success-text", bg: "bg-success-bg" },
};

// Canonical audience order: frau (25-30, 30-35, 50-55) → mann (25-30, 30-35, 50-55)
const AUDIENCE_ORDER = [
  "frau_25_30",
  "frau_30_35",
  "frau_50_55",
  "mann_25_30",
  "mann_30_35",
  "mann_50_55",
];

export function ReviewGrid({
  runId,
  runNumber,
  clientInitials,
  campaignTitle,
  createdAt,
  assets,
  audienceLabels,
}: Props) {
  const [approved, setApproved] = useState<Record<string, boolean>>(
    () => Object.fromEntries(assets.map((a) => [a.id, a.approved])),
  );
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const lightboxAsset = lightboxId ? assets.find((a) => a.id === lightboxId) : null;
  const lightboxIndex = lightboxId ? AUDIENCE_ORDER.indexOf(assets.find((a) => a.id === lightboxId)?.audienceKey ?? "") : -1;
  const lightboxIsStory = lightboxAsset ? lightboxAsset.placement.includes("story") : false;

  const renderedCount = assets.filter((a) => !!a.finalAssetUrl).length;
  const totalCount = assets.length || 12;

  const formattedDate = new Date(createdAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  function toggleApprove(id: string) {
    const next = !approved[id];
    setApproved((prev) => ({ ...prev, [id]: next }));
    if (flagged[id]) setFlagged((prev) => ({ ...prev, [id]: false }));
    fetch(`/api/assets/${id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: next }),
    }).catch((err) => console.error("[approve] persist failed:", err));
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => ({ ...prev, [id]: !prev[id] }));
    if (approved[id]) {
      setApproved((prev) => ({ ...prev, [id]: false }));
      fetch(`/api/assets/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      }).catch((err) => console.error("[approve] persist failed:", err));
    }
  }

  // Build audience groups in canonical order
  const audienceGroups: { key: string; number: number; label: string; feed: AssetData | null; story: AssetData | null }[] = [];
  let num = 1;
  for (const audienceKey of AUDIENCE_ORDER) {
    const groupAssets = assets.filter((a) => a.audienceKey === audienceKey);
    if (groupAssets.length === 0) continue;
    const feed = groupAssets.find((a) => a.placement.includes("feed")) ?? null;
    const story = groupAssets.find((a) => a.placement.includes("story")) ?? null;
    audienceGroups.push({
      key: audienceKey,
      number: num++,
      label: audienceLabels[audienceKey] ?? audienceKey,
      feed,
      story,
    });
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-white py-12 text-center text-sm text-ink-muted">
        Noch keine Assets generiert.
      </div>
    );
  }

  return (
    <>
      {/* ── Summary bar ── */}
      <div className="flex items-center gap-2 text-sm text-ink-muted mb-2">
        <span className="font-semibold text-ink">{renderedCount} von {totalCount} Ads generiert</span>
        <span className="text-border-medium">·</span>
        <span>Run #{runNumber}</span>
        <span className="text-border-medium">·</span>
        <span>{formattedDate}</span>
      </div>

      {/* ── Audience rows ── */}
      <div className="space-y-10">
        {audienceGroups.map(({ key, number, label, feed, story }) => (
          <div key={key}>
            {/* Audience label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-ink-faint tabular-nums">
                {String(number).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-bold text-ink">{label}</h3>
            </div>

            {/* Feed + Story side by side */}
            <div className="flex gap-4 flex-wrap">
              {/* Feed card */}
              {feed && (
                <AssetCard
                  asset={feed}
                  label="Feed 1:1"
                  isStory={false}
                  index={number}
                  clientInitials={clientInitials}
                  isApproved={approved[feed.id]}
                  isFlagged={flagged[feed.id] ?? false}
                  onApprove={() => toggleApprove(feed.id)}
                  onFlag={() => toggleFlag(feed.id)}
                  onLightbox={() => setLightboxId(feed.id)}
                />
              )}

              {/* Story card */}
              {story && (
                <AssetCard
                  asset={story}
                  label="Story 9:16"
                  isStory={true}
                  index={number}
                  clientInitials={clientInitials}
                  isApproved={approved[story.id]}
                  isFlagged={flagged[story.id] ?? false}
                  onApprove={() => toggleApprove(story.id)}
                  onFlag={() => toggleFlag(story.id)}
                  onLightbox={() => setLightboxId(story.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom download button ── */}
      <div className="pt-6 flex justify-center">
        <a
          href={`/api/runs/${runId}/download`}
          className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-accent-600 text-white font-semibold hover:bg-accent-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Alle herunterladen
        </a>
      </div>

      {/* ── Lightbox ── */}
      {lightboxAsset && (
        <div
          className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="relative flex flex-col items-center"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxId(null)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {(lightboxAsset.finalAssetUrl || lightboxAsset.baseImageUrl) && (
              <img
                src={lightboxAsset.finalAssetUrl ?? lightboxAsset.baseImageUrl!}
                alt="Vorschau"
                className="rounded-xl shadow-panel object-contain"
                style={{
                  maxHeight: "80vh",
                  maxWidth: lightboxIsStory ? "calc(80vh * 9 / 16)" : "80vw",
                }}
              />
            )}

            <div className="mt-4 flex items-center gap-6 text-sm text-white/70">
              <span>{lightboxIsStory ? "Story 9:16" : "Feed 1:1"}</span>
              <span className="text-white/30">·</span>
              <span>{audienceLabels[lightboxAsset.audienceKey] ?? lightboxAsset.audienceKey}</span>
              {lightboxAsset.finalAssetUrl && (
                <>
                  <span className="text-white/30">·</span>
                  <a
                    href={lightboxAsset.finalAssetUrl}
                    download={`${String(lightboxIndex + 1).padStart(2, "0")} - ${lightboxIsStory ? "Story" : "Feed"} - ${clientInitials}.jpg`}
                    className="text-white font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Herunterladen
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Asset card sub-component ────────────────────────────────────────────────

type AssetCardProps = {
  asset: AssetData;
  label: string;
  isStory: boolean;
  index: number;
  clientInitials: string;
  isApproved: boolean;
  isFlagged: boolean;
  onApprove: () => void;
  onFlag: () => void;
  onLightbox: () => void;
};

function AssetCard({
  asset,
  label,
  isStory,
  index,
  clientInitials,
  isApproved,
  isFlagged,
  onApprove,
  onFlag,
  onLightbox,
}: AssetCardProps) {
  const cfg = ASSET_STATUS_CONFIG[asset.status] ?? ASSET_STATUS_CONFIG.AUSSTEHEND;
  const hasImage = !!(asset.finalAssetUrl || asset.baseImageUrl);
  const displayUrl = asset.finalAssetUrl ?? asset.baseImageUrl;

  const downloadName = `${String(index).padStart(2, "0")} - ${isStory ? "Story" : "Feed"} - ${clientInitials}.jpg`;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-150 bg-white shadow-card flex-shrink-0 ${
        isApproved
          ? "border-success ring-1 ring-success"
          : isFlagged
          ? "border-warning ring-1 ring-warning"
          : "border-border hover:shadow-card-hover"
      }`}
      style={{ width: isStory ? "157px" : "280px" }}
    >
      {/* Image area */}
      <div
        className="relative bg-surface overflow-hidden group cursor-pointer"
        style={{ aspectRatio: isStory ? "9/16" : "1/1" }}
        onClick={onLightbox}
      >
        {hasImage ? (
          <>
            <img
              src={displayUrl!}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />

            {/* Hover overlay with icons */}
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center gap-3">
              {/* Fullscreen icon */}
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white"
                onClick={(e) => { e.stopPropagation(); onLightbox(); }}
                title="Vollbild"
              >
                <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>

              {/* Download icon */}
              {asset.finalAssetUrl && (
                <a
                  href={asset.finalAssetUrl}
                  download={downloadName}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white"
                  title="Herunterladen"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
              )}
            </div>

            {/* FINAL badge */}
            {asset.finalAssetUrl && (
              <span className="absolute top-2 left-2 text-[9px] font-bold bg-success text-white px-1.5 py-0.5 rounded-full">
                FINAL
              </span>
            )}

            {/* Approved / flagged badge */}
            {isApproved && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {isFlagged && !isApproved && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-warning flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.169M7.5 7.5h9m-9 3h6m4 0l-1.5 1.5L17 13.5m-5-6H7.5m9 0h.5" />
                </svg>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            {asset.status === "FEHLGESCHLAGEN" ? (
              <>
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-[10px] text-danger-text font-medium">Fehler</span>
              </>
            ) : (
              <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 bg-white">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-ink">{label}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} mt-0.5 inline-block`}>
              {cfg.label}
            </span>
          </div>

          {hasImage && (
            <div className="flex items-center gap-1">
              <button
                onClick={onFlag}
                title="Markieren"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isFlagged
                    ? "bg-warning text-white"
                    : "bg-surface border border-border text-ink-faint hover:text-warning hover:border-warning"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V4.5m0 0A2.25 2.25 0 015.25 2.25h9A2.25 2.25 0 0116.5 4.5v7.5A2.25 2.25 0 0114.25 14.25h-9A2.25 2.25 0 013 12V4.5z" />
                </svg>
              </button>
              <button
                onClick={onApprove}
                title="Freigeben"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isApproved
                    ? "bg-success text-white"
                    : "bg-surface border border-border text-ink-faint hover:text-success hover:border-success"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
