import { notFound } from "next/navigation";
import Link from "next/link";
import { campaignService } from "@/services/campaignService";
import { brandProfileRepository } from "@/repositories/brandProfileRepository";
import { clientAssetRepository } from "@/repositories/clientAssetRepository";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { GenerationSetupPanel } from "@/components/generation/GenerationSetupPanel";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import { computeMessagePriority } from "@/lib/messagePriority";
import { selectDirection } from "@/lib/directionSelector";
import { checkReadiness, AUDIENCE_MATRIX, PLACEMENT_OPTIONS } from "@/lib/readinessCheck";
import type { MessagePriority } from "@/lib/messagePriority";
import type { DirectionKey } from "@/lib/directionSelector";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { tab?: string };
};

const runStatusLabel: Record<string, string> = {
  IN_VORBEREITUNG: "In Vorbereitung",
  IN_GENERIERUNG: "In Generierung",
  FERTIG: "Fertig",
  FEHLER: "Fehler",
  ABGEBROCHEN: "Abgebrochen",
};

const TABS = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "angebotsdaten", label: "Angebotsdaten" },
  { id: "generierung", label: "Generierungs-Setup" },
  { id: "verlauf", label: "Generierungsverlauf" },
];

export default async function KampagneDetailPage({ params, searchParams }: Props) {
  const tab = searchParams.tab ?? "uebersicht";
  const campaign = await campaignService.get(params.id).catch(() => null);
  if (!campaign) notFound();

  // Pre-compute readiness data (needed for generierung tab and sidebar)
  const brandProfile = await brandProfileRepository.findByClientId(campaign.clientId);
  const assets = await clientAssetRepository.findAllByClient(campaign.clientId);
  const hasLogo = assets.some((a) => a.assetType === "logo" && a.active);

  const readiness = checkReadiness(
    brandProfile
      ? {
          approved: brandProfile.approved,
          reviewStatus: brandProfile.reviewStatus,
          confidenceScore: brandProfile.confidenceScore,
          primaryColor: brandProfile.primaryColor,
          fontPrimary: brandProfile.fontPrimary,
          hasLogo,
        }
      : null,
    {
      headline: campaign.headline ?? "",
      offerType: campaign.offerType ?? "",
      priceNew: campaign.priceNew ? String(campaign.priceNew) : null,
      ctaText: (campaign as Record<string, unknown>).ctaText as string | null,
    }
  );

  const inferredPriority = computeMessagePriority({
    offerType: campaign.offerType,
    priceNew: campaign.priceNew ? String(campaign.priceNew) : null,
    priceOld: campaign.priceOld ? String(campaign.priceOld) : null,
    urgencyText: campaign.urgencyText ?? null,
    headline: campaign.headline ?? "",
  }) as MessagePriority;

  const inferredDirection = selectDirection({
    visualTone: brandProfile?.visualTone,
    imageTone: brandProfile?.imageTone,
    offerType: campaign.offerType,
    messagePriority: inferredPriority,
    typographyClass: brandProfile?.typographyClass,
  }) as DirectionKey;

  const campaignExt = campaign as typeof campaign & {
    ctaText?: string | null;
    locationLine?: string | null;
    startDate?: Date | null;
  };

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <PageHeader
        title={campaign.title}
        description={campaign.client.name}
        actions={
          <div className="flex gap-2">
            <LinkButton href="/kampagnen" variant="secondary">← Zurück</LinkButton>
            <LinkButton href={`/kampagnen/${campaign.id}/bearbeiten`}>Bearbeiten</LinkButton>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/kampagnen/${campaign.id}?tab=${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Tab: Übersicht ─────────────────────────────────────────── */}
      {tab === "uebersicht" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">Werbetexte</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <InfoRow label="Headline" value={campaign.headline} />
                {campaign.subheadline && (
                  <InfoRow label="Subheadline" value={campaign.subheadline} />
                )}
                {campaign.urgencyText && (
                  <InfoRow label="Dringlichkeit" value={campaign.urgencyText} />
                )}
                {campaignExt.ctaText && (
                  <InfoRow label="CTA" value={campaignExt.ctaText} />
                )}
                {campaignExt.locationLine && (
                  <InfoRow label="Standortzeile" value={campaignExt.locationLine} />
                )}
              </CardBody>
            </Card>

            {campaign.notes && (
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-gray-700">Interne Notizen</h2>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.notes}</p>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">Details</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <InfoRow label="Angebotsart" value={campaign.offerType} />
                <InfoRow label="Status" value={<CampaignStatusBadge status={campaign.status} />} />
                <InfoRow
                  label="Kunde"
                  value={
                    <Link href={`/kunden/${campaign.client.id}`} className="text-brand-600 hover:underline">
                      {campaign.client.name}
                    </Link>
                  }
                />
                {campaign.aworkTaskId && (
                  <InfoRow label="awork Task-ID" value={campaign.aworkTaskId} />
                )}
                <InfoRow label="Erstellt von" value={campaign.createdBy?.name ?? "–"} />
                <InfoRow label="Erstellt am" value={formatDate(campaign.createdAt)} />
                <InfoRow label="Aktualisiert" value={formatDate(campaign.updatedAt)} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Generierungs-Runs</span>
                  <span className="text-sm font-semibold text-gray-900">{campaign.runs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Bereitschaft</span>
                  <span className={`text-xs font-medium ${readiness.ready ? "text-green-600" : "text-red-500"}`}>
                    {readiness.ready ? "Bereit" : "Unvollständig"}
                  </span>
                </div>
                <LinkButton
                  href={`/kampagnen/${campaign.id}?tab=generierung`}
                  className="w-full"
                  variant={readiness.ready ? "primary" : "secondary"}
                >
                  Generierung starten
                </LinkButton>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Angebotsdaten ─────────────────────────────────────── */}
      {tab === "angebotsdaten" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Preise & Konditionen</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <InfoRow
                label="Neuer Preis"
                value={campaign.priceNew ? formatCurrency(Number(campaign.priceNew)) : "–"}
              />
              <InfoRow
                label="Alter Preis"
                value={campaign.priceOld ? formatCurrency(Number(campaign.priceOld)) : "–"}
              />
              <InfoRow label="Zahlungsintervall" value={campaign.billingInterval ?? "–"} />
              <InfoRow label="Vertragslaufzeit" value={campaign.contractTerm ?? "–"} />
              <InfoRow
                label="Aktionsbeginn"
                value={campaignExt.startDate ? formatDate(campaignExt.startDate) : "–"}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Botschaft</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <InfoRow label="Headline" value={campaign.headline} />
              <InfoRow label="Subheadline" value={campaign.subheadline ?? "–"} />
              <InfoRow label="Dringlichkeit" value={campaign.urgencyText ?? "–"} />
              <InfoRow label="CTA" value={campaignExt.ctaText ?? "–"} />
              <InfoRow label="Standortzeile" value={campaignExt.locationLine ?? "–"} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Tab: Generierungs-Setup ────────────────────────────────── */}
      {tab === "generierung" && (
        <div className="max-w-2xl">
          <GenerationSetupPanel
            campaignId={campaign.id}
            readiness={readiness}
            inferredPriority={inferredPriority}
            inferredDirection={inferredDirection}
          />
        </div>
      )}

      {/* ── Tab: Generierungsverlauf ───────────────────────────────── */}
      {tab === "verlauf" && (
        <div className="space-y-4">
          {campaign.runs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-sm text-gray-500">Noch kein Generierungs-Run gestartet.</p>
              <div className="mt-4">
                <LinkButton href={`/kampagnen/${campaign.id}?tab=generierung`}>
                  Ersten Run starten
                </LinkButton>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">
                  {campaign.runs.length} Run{campaign.runs.length !== 1 ? "s" : ""}
                </h2>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Run #</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Richtung</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Priorität</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assets</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaign.runs.map((run) => {
                      const runExt = run as typeof run & { messagePriority?: string | null };
                      return (
                        <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium">
                            <Link href={`/runs/${run.id}`} className="text-brand-600 hover:underline">
                              #{run.runNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{run.directionKey ?? "–"}</td>
                          <td className="px-6 py-3 text-gray-600">{runExt.messagePriority ?? "–"}</td>
                          <td className="px-6 py-3">
                            <RunStatusBadge status={run.status} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{run._count.assets}</td>
                          <td className="px-6 py-3 text-gray-400">
                            {formatDateTime(run.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    IN_VORBEREITUNG: "bg-gray-100 text-gray-600",
    IN_GENERIERUNG: "bg-blue-100 text-blue-700",
    FERTIG: "bg-green-100 text-green-700",
    FEHLER: "bg-red-100 text-red-700",
    ABGEBROCHEN: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? "bg-gray-100 text-gray-600"}`}>
      {runStatusLabel[status] ?? status}
    </span>
  );
}
