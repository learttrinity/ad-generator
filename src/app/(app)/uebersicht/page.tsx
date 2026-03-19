import Link from "next/link";
import { clientService } from "@/services/clientService";
import { campaignService } from "@/services/campaignService";
import { imageProviderSettingsService } from "@/services/imageProviderSettingsService";
import { LinkButton } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STATUS_DOT: Record<string, string> = {
  IN_VORBEREITUNG: "bg-ink-faint",
  IN_GENERIERUNG:  "bg-accent-500 animate-pulse",
  FERTIG:          "bg-success",
  FEHLER:          "bg-danger",
  ABGEBROCHEN:     "bg-border-strong",
};
const RUN_STATUS_LABEL: Record<string, string> = {
  IN_VORBEREITUNG: "In Vorbereitung",
  IN_GENERIERUNG:  "Läuft",
  FERTIG:          "Fertig",
  FEHLER:          "Fehler",
  ABGEBROCHEN:     "Abgebrochen",
};

export default async function UebersichtPage() {
  const [campaigns, clients, providerReady, recentRuns] = await Promise.all([
    campaignService.list(),
    clientService.list(),
    imageProviderSettingsService.isActiveProviderReady(),
    prisma.generationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        campaign: {
          include: {
          client: {
            select: {
              name: true,
              initials: true,
              id: true,
              brandProfile: { select: { primaryColor: true } },
            },
          },
        },
        },
        _count: { select: { assets: true } },
      },
    }),
  ]);

  const readyCampaigns = campaigns.filter(
    (c) => c.status === "BEREIT" || c.status === "FREIGEGEBEN" || c.status === "ZUR_PRUEFUNG",
  );
  const clientsWithoutProfile = clients.filter((c) => !c.brandProfile);

  return (
    <div className="px-8 py-10 max-w-5xl space-y-10">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Übersicht</h1>
        <p className="text-sm text-ink-muted mt-1">Was steht heute an?</p>
      </div>

      {/* ── Provider warning ─────────────────────────────────────────── */}
      {!providerReady && (
        <div className="rounded-xl border border-warning-border bg-warning-bg px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-warning-text">
            <span className="font-semibold">Kein Bildgenerierungs-Provider aktiv.</span>{" "}
            Generierungen werden fehlschlagen.{" "}
            <Link href="/admin/integrationen" className="underline font-semibold hover:no-underline">
              Jetzt einrichten →
            </Link>
          </p>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Ready campaigns */}
        <div className="rounded-xl border border-border bg-white px-5 py-5 shadow-card">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">Bereit</p>
          <p className="text-4xl font-bold text-ink mt-2">{readyCampaigns.length}</p>
          <p className="text-xs text-ink-muted mt-1">
            Kampagne{readyCampaigns.length !== 1 ? "n" : ""} zur Generierung
          </p>
          {readyCampaigns.length > 0 && (
            <Link href="/generator" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700">
              Generator öffnen
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Clients */}
        <div className="rounded-xl border border-border bg-white px-5 py-5 shadow-card">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">Kunden</p>
          <p className="text-4xl font-bold text-ink mt-2">{clients.length}</p>
          <p className="text-xs text-ink-muted mt-1">
            {clientsWithoutProfile.length > 0
              ? `${clientsWithoutProfile.length} ohne Markenprofil`
              : "Alle vollständig eingerichtet"}
          </p>
          {clientsWithoutProfile.length > 0 && (
            <Link href="/kunden" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-warning-text hover:underline">
              Profile anlegen
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Provider */}
        <div className="rounded-xl border border-border bg-white px-5 py-5 shadow-card">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">Provider</p>
          <div className="flex items-center gap-2.5 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${providerReady ? "bg-success" : "bg-warning"}`} />
            <p className="text-xl font-bold text-ink">{providerReady ? "Bereit" : "Nicht bereit"}</p>
          </div>
          <p className="text-xs text-ink-muted mt-1">Bildgenerierung</p>
          {!providerReady && (
            <Link href="/admin/integrationen" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700">
              Einrichten
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* ── Ready campaigns ──────────────────────────────────────────── */}
      {readyCampaigns.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Bereit zur Generierung</h2>
            <Link href="/generator" className="text-xs font-medium text-accent-600 hover:text-accent-700">
              Alle anzeigen →
            </Link>
          </div>
          <div className="space-y-2">
            {readyCampaigns.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-white px-4 py-3.5 flex items-center justify-between gap-4 shadow-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white"
                    style={{ background: c.client.brandProfile?.primaryColor ?? "#1E3A5F" }}
                  >
                    {c.client.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{c.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {c.client.name}{c.offerType && <> · {c.offerType}</>}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/kampagnen/${c.id}?tab=generierung`}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700 transition-colors"
                >
                  Starten
                </Link>
              </div>
            ))}
            {readyCampaigns.length > 4 && (
              <Link href="/generator" className="block text-center text-xs font-medium text-accent-600 hover:text-accent-700 py-2">
                +{readyCampaigns.length - 4} weitere Kampagnen →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Clients without brand profile ────────────────────────────── */}
      {clientsWithoutProfile.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">
            Kein Markenprofil ({clientsWithoutProfile.length})
          </h2>
          <div className="rounded-xl border border-border bg-white divide-y divide-border shadow-card">
            {clientsWithoutProfile.map((c) => (
              <div key={c.id} className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-surface border border-border text-xs font-bold flex items-center justify-center text-ink-muted">
                    {c.initials}
                  </span>
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                </div>
                <Link
                  href={`/markenprofile/onboarding?client=${c.id}`}
                  className="text-xs font-semibold text-accent-600 hover:text-accent-700"
                >
                  Profil anlegen →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent runs ──────────────────────────────────────────────── */}
      {recentRuns.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Letzte Runs</h2>
            <Link href="/historie" className="text-xs font-medium text-accent-600 hover:text-accent-700">
              Alle anzeigen →
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-white divide-y divide-border shadow-card">
            {recentRuns.map((run) => {
              const dot = RUN_STATUS_DOT[run.status] ?? "bg-ink-faint";
              const label = RUN_STATUS_LABEL[run.status] ?? run.status;
              return (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="px-4 py-3.5 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                      style={{ background: run.campaign.client.brandProfile?.primaryColor ?? "#1E3A5F" }}
                    >
                      {run.campaign.client.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">
                        <span className="font-semibold">#{run.runNumber}</span>
                        {" · "}
                        {run.campaign.title}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">{run.campaign.client.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {label}
                    </span>
                    <span className="text-xs text-ink-faint hidden sm:block">
                      {formatDateTime(run.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Primary CTAs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2">
        <LinkButton href="/generator">Generierung starten</LinkButton>
        <LinkButton href="/kunden/neu" variant="secondary">Neuen Kunden anlegen</LinkButton>
      </div>
    </div>
  );
}
