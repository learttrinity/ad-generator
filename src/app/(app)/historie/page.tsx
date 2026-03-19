import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  IN_VORBEREITUNG: { label: "In Vorbereitung", dot: "bg-ink-faint",                    text: "text-ink-muted"  },
  IN_GENERIERUNG:  { label: "Läuft",           dot: "bg-accent-500 animate-pulse",      text: "text-accent-600" },
  FERTIG:          { label: "Fertig",           dot: "bg-success",                       text: "text-success-text" },
  FEHLER:          { label: "Fehler",           dot: "bg-danger",                        text: "text-danger-text"  },
  ABGEBROCHEN:     { label: "Abgebrochen",      dot: "bg-border-strong",                 text: "text-ink-muted"  },
};

export default async function HistoriePage() {
  const runs = await prisma.generationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      campaign: {
        include: { client: { select: { name: true, initials: true, id: true, brandProfile: { select: { primaryColor: true } } } } },
      },
      _count: { select: { assets: true } },
    },
  });

  // Group by client for timeline view
  const groupedByClient: Record<string, typeof runs> = {};
  for (const run of runs) {
    const key = run.campaign.client.id;
    if (!groupedByClient[key]) groupedByClient[key] = [];
    groupedByClient[key].push(run);
  }

  return (
    <div className="px-8 py-10 max-w-4xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Historie</h1>
        <p className="text-sm text-ink-muted mt-1">
          {runs.length === 0 ? "Noch keine Generierungs-Runs" : `Letzte ${runs.length} Runs`}
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
          <p className="text-sm text-ink-muted">Noch keine Generierungs-Runs vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByClient).map(([clientId, clientRuns]) => {
            const client = clientRuns[0].campaign.client;
            const brandColor = client.brandProfile?.primaryColor ?? "#1E3A5F";

            return (
              <section key={clientId}>
                {/* Client header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: brandColor }}
                  >
                    {client.initials}
                  </div>
                  <h2 className="text-sm font-semibold text-ink">{client.name}</h2>
                  <span className="text-xs text-ink-faint">
                    {clientRuns.length} Run{clientRuns.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Runs for this client */}
                <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
                  {clientRuns.map((run, idx) => {
                    const st = RUN_STATUS[run.status] ?? RUN_STATUS.IN_VORBEREITUNG;

                    return (
                      <Link
                        key={run.id}
                        href={`/runs/${run.id}`}
                        className={`flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors ${
                          idx < clientRuns.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className="relative flex flex-col items-center shrink-0">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          {idx < clientRuns.length - 1 && (
                            <span className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
                          )}
                        </div>

                        {/* Run number + campaign */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-ink-faint">#{run.runNumber}</span>
                            <span className="text-sm font-semibold text-ink truncate">
                              {run.campaign.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-muted">
                            {run._count.assets > 0 && (
                              <span>{run._count.assets} Assets</span>
                            )}
                            {run.directionKey && (
                              <span className="px-1.5 py-0.5 bg-surface rounded text-ink-muted border border-border text-[10px] font-medium">
                                {run.directionKey}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status + date + action */}
                        <div className="flex items-center gap-4 shrink-0">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                            {st.label}
                          </span>
                          <span className="text-xs text-ink-faint hidden sm:block whitespace-nowrap">
                            {formatDateTime(run.createdAt)}
                          </span>
                          <span className="text-xs font-semibold text-accent-600 hover:text-accent-700">
                            Ergebnisse →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
