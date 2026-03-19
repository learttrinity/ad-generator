import { notFound } from "next/navigation";
import Link from "next/link";
import { generationRunRepository } from "@/repositories/generationRunRepository";
import { DriveExportButton } from "@/components/drive/DriveExportButton";
import { driveExportService } from "@/services/driveExportService";
import { isDriveConfigured } from "@/lib/google/googleDriveClient";
import { AUDIENCE_MATRIX } from "@/lib/audienceMatrix";
import { ReviewGrid } from "@/components/runs/ReviewGrid";
import { RunAutoRefresh } from "@/components/runs/RunAutoRefresh";
import type { RenderSpec } from "@/lib/renderSpecBuilder";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { asset?: string };
};

export default async function RunDetailPage({ params }: Props) {
  const run = await generationRunRepository.findByIdWithFullAssets(params.id);
  if (!run) notFound();

  const clientInitials = run.campaign.client.initials.toUpperCase();
  const brandColor = run.campaign.client.brandProfile?.primaryColor ?? "#1E3A5F";
  const renderedCount = run.assets.filter((a) => !!a.finalAssetUrl).length;

  const driveConfigured = isDriveConfigured();
  const exportableToDrive = run.assets.some((a) => !!a.finalAssetUrl);
  const exportLogs = await driveExportService.getExportLogs(run.id);

  const audienceLabels = Object.fromEntries(AUDIENCE_MATRIX.map((a) => [a.key, a.label]));

  const serializedAssets = run.assets.map((a) => ({
    id: a.id,
    audienceKey: a.audienceKey,
    placement: a.placement,
    dimensions: a.dimensions ?? null,
    status: a.status,
    approved: a.approved,
    baseImageUrl: a.baseImageUrl ?? null,
    finalAssetUrl: a.finalAssetUrl ?? null,
    errorMessage: a.errorMessage ?? null,
    imagePrompt: a.imagePrompt ?? null,
    negativePrompt: a.negativePrompt ?? null,
    promptBlocks: a.promptBlocks ?? null,
    renderSpec: (a.renderSpec && typeof a.renderSpec === "object" && !Array.isArray(a.renderSpec) && Object.keys(a.renderSpec as object).length > 0
      ? a.renderSpec as unknown as RenderSpec
      : null),
    renderWarnings: Array.isArray(a.renderWarnings) ? (a.renderWarnings as string[]) : [],
  }));

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <RunAutoRefresh status={run.status} />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Client avatar */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: brandColor }}
          >
            {clientInitials}
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">{run.campaign.client.name}</p>
            <h1 className="text-xl font-bold text-ink leading-tight">
              {run.campaign.title} · Run #{run.runNumber}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to generator */}
          <Link
            href="/generator"
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            ← Zurück zum Generator
          </Link>

          {/* Neu generieren */}
          <Link
            href="/generator"
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:bg-surface transition-colors"
          >
            Neu generieren
          </Link>

          {/* Download */}
          {renderedCount > 0 && (
            <a
              href={`/api/runs/${run.id}/download`}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Alle herunterladen
            </a>
          )}
        </div>
      </div>

      {/* ── Drive export ─────────────────────────────────────────────────── */}
      {driveConfigured && (exportableToDrive || exportLogs.length > 0) && (
        <div className="rounded-xl border border-border bg-white px-5 py-4 shadow-card">
          <DriveExportButton
            runId={run.id}
            hasExportableAssets={exportableToDrive}
            initialLogs={exportLogs.map((l) => ({
              id: l.id,
              status: l.status,
              assetCount: l.assetCount,
              exportedCount: l.exportedCount,
              errorMessage: l.errorMessage ?? null,
              driveFolderId: l.driveFolderId,
              exportedAt: l.exportedAt.toISOString(),
            }))}
          />
        </div>
      )}

      {/* ── Review grid ──────────────────────────────────────────────────── */}
      <ReviewGrid
        runId={run.id}
        runNumber={run.runNumber}
        clientInitials={clientInitials}
        campaignTitle={run.campaign.title}
        createdAt={run.createdAt.toISOString()}
        assets={serializedAssets}
        audienceLabels={audienceLabels}
      />
    </div>
  );
}
