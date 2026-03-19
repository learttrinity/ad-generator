import Link from "next/link";
import { clientService } from "@/services/clientService";
import { LinkButton } from "@/components/ui/Button";
import { BrandStatusBadge } from "@/components/ui/Badge";
import { computeProfileCompleteness } from "@/lib/brandAnalysis";
import type { BrandProfileStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1A1A1A" : "#FFFFFF";
}

export default async function KundenPage() {
  const clients = await clientService.list();

  return (
    <div className="px-8 py-10 max-w-5xl space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kunden</h1>
          <p className="text-sm text-ink-muted mt-1">
            {clients.length === 0
              ? "Noch keine Kunden vorhanden"
              : `${clients.length} Kunde${clients.length !== 1 ? "n" : ""}`}
          </p>
        </div>
        <LinkButton href="/kunden/neu">+ Kunde anlegen</LinkButton>
      </div>

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M9 7h1m4-1h1M9 11h1m4-1h1M9 15h6" />
            </svg>
          </div>
          <p className="text-sm text-ink-muted">Lege deinen ersten Kunden an, um zu starten.</p>
          <LinkButton href="/kunden/neu">Ersten Kunden anlegen</LinkButton>
        </div>
      )}

      {/* Client grid */}
      {clients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const bp = client.brandProfile as (typeof client.brandProfile & {
              fontPrimary?: string | null;
              typographyClass?: string | null;
              visualTone?: string | null;
              imageTone?: string | null;
              secondaryColors?: unknown;
              componentRules?: unknown;
            }) | null;
            const brandColor = bp?.primaryColor ?? "#1E3A5F";
            const textColor = contrastColor(brandColor);
            const isInactive = client.status === "INAKTIV" || client.status === "ARCHIVIERT";

            // Compute confidence from actual stored profile data (not stale DB score)
            const confidencePct = bp
              ? computeProfileCompleteness({
                  primaryColor: bp.primaryColor ?? "#000000",
                  fontPrimary: bp.fontPrimary ?? "",
                  typographyClass: bp.typographyClass ?? null,
                  visualTone: bp.visualTone ?? null,
                  imageTone: bp.imageTone ?? null,
                  secondaryColors: bp.secondaryColors ?? [],
                  componentRules: bp.componentRules ?? {},
                })
              : 0;

            return (
              <div
                key={client.id}
                className={`group rounded-2xl border bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150 overflow-hidden ${
                  isInactive ? "opacity-60" : "border-border"
                }`}
              >
                {/* Brand color header strip */}
                <div
                  className="px-5 pt-5 pb-4 relative"
                  style={{ background: `${brandColor}14` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm"
                      style={{ background: brandColor, color: textColor }}
                    >
                      {client.initials}
                    </div>

                    {/* Brand status */}
                    {bp ? (
                      <BrandStatusBadge status={bp.reviewStatus as BrandProfileStatus} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning-bg text-warning-text border border-warning-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        Kein Profil
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="mt-3">
                    <Link
                      href={`/kunden/${client.id}`}
                      className="text-[15px] font-bold text-ink hover:text-accent-600 transition-colors leading-tight"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {client._count.campaigns} Kampagne{client._count.campaigns !== 1 ? "n" : ""}
                    </p>
                  </div>
                </div>

                {/* Brand completeness bar */}
                {bp && (
                  <div className="px-5 py-3 border-t border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-ink-muted font-medium">Profil-Vollständigkeit</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">{confidencePct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-border-medium overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${confidencePct}%`,
                          background: confidencePct >= 70 ? "#16A34A" : confidencePct >= 40 ? "#D97706" : "#DC2626",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                  {/* Primary: always "Ads generieren" */}
                  <Link
                    href={`/generator?client=${client.id}`}
                    className="text-xs font-semibold text-accent-600 hover:text-accent-700 flex items-center gap-1 transition-colors"
                  >
                    Ads generieren
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <div className="flex items-center gap-3">
                    {!bp && (
                      <Link
                        href={`/markenprofile/onboarding?client=${client.id}`}
                        className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
                      >
                        Profil anlegen
                      </Link>
                    )}
                    <Link
                      href={`/kunden/${client.id}/bearbeiten`}
                      className="text-xs text-ink-faint hover:text-ink-muted transition-colors"
                    >
                      Bearbeiten
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
