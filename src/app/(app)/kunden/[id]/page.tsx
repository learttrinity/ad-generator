import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { clientService } from "@/services/clientService";
import { campaignService } from "@/services/campaignService";
import { brandProfileService } from "@/services/brandProfileService";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ClientStatusBadge, CampaignStatusBadge } from "@/components/ui/Badge";
import { BrandStatusBadge } from "@/components/brand/BrandStatusBadge";
import { ConfidenceBar } from "@/components/brand/ConfidenceBar";
import { BrandApprovalActions } from "@/components/brand/BrandApprovalActions";
import { AssetsTab } from "@/components/brand/AssetsTab";
import { ClientTabs } from "@/components/layout/ClientTabs";
import type { ClientTabId } from "@/components/layout/ClientTabs";
import { DriveMappingForm } from "@/components/drive/DriveMappingForm";
import { DriveFileBrowser } from "@/components/drive/DriveFileBrowser";
import { isDriveConfigured } from "@/lib/google/googleDriveClient";
import { formatDate, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { tab?: string };
};

export default async function KundeDetailPage({ params, searchParams }: Props) {
  const client = await clientService.get(params.id).catch(() => null);
  if (!client) notFound();

  const activeTab = (searchParams.tab ?? "uebersicht") as ClientTabId;

  // Load data needed for tabs
  const [campaigns, assets, completeness] = await Promise.all([
    (activeTab === "kampagnen" || activeTab === "uebersicht")
      ? campaignService.list(params.id)
      : Promise.resolve([]),
    (activeTab === "assets")
      ? prisma.clientAsset.findMany({ where: { clientId: params.id, active: true }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    (activeTab === "markenprofil" && client.brandProfile)
      ? brandProfileService.getCompleteness(params.id)
      : Promise.resolve(0),
  ]);

  const driveConfigured = isDriveConfigured();

  return (
    <div className="px-8 py-8 max-w-6xl space-y-0">
      {/* Header */}
      <div className="pb-6">
        <PageHeader
          title={client.name}
          description={`Kürzel: ${client.initials}`}
          actions={
            <div className="flex gap-2">
              <LinkButton href="/kunden" variant="secondary">← Zurück</LinkButton>
              <LinkButton href={`/kunden/${client.id}/bearbeiten`}>Bearbeiten</LinkButton>
            </div>
          }
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-xl border border-b-0 border-gray-200">
        <div className="px-6 pt-2">
          <ClientTabs activeTab={activeTab} />
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-b-xl border border-gray-200 px-6 py-6">

        {/* ─── Übersicht ──────────────────────────────────────────────────── */}
        {activeTab === "uebersicht" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kundendaten */}
              <Card>
                <CardHeader><h2 className="text-sm font-semibold text-gray-700">Kundendaten</h2></CardHeader>
                <CardBody className="space-y-3">
                  <InfoRow label="Kürzel" value={client.initials} />
                  <InfoRow label="Name" value={client.name} />
                  <InfoRow label="Website" value={
                    client.website ? (
                      <a href={client.website} target="_blank" rel="noopener noreferrer"
                        className="text-brand-600 hover:underline truncate block max-w-[160px]">
                        {client.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : "–"
                  } />
                  <InfoRow label="Instagram" value={client.instagram ?? "–"} />
                  <InfoRow label="Status" value={<ClientStatusBadge status={client.status} />} />
                  <InfoRow label="Erstellt am" value={formatDate(client.createdAt)} />
                </CardBody>
              </Card>

              {/* Brand-Kurzinfo */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Markenprofil</h2>
                  {client.brandProfile ? (
                    <Link href={`?tab=markenprofil`} className="text-xs text-brand-600 hover:underline">Öffnen</Link>
                  ) : (
                    <Link href={`/markenprofile/onboarding?client=${client.id}`}
                      className="text-xs text-brand-600 hover:underline">Anlegen →</Link>
                  )}
                </CardHeader>
                <CardBody>
                  {client.brandProfile ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded border border-gray-200"
                          style={{ background: client.brandProfile.primaryColor }} />
                        <span className="text-xs font-mono text-gray-600">{client.brandProfile.primaryColor}</span>
                      </div>
                      {(client.brandProfile as { reviewStatus?: string }).reviewStatus && (
                        <div>
                          <BrandStatusBadge
                            status={(client.brandProfile as { reviewStatus: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN" }).reviewStatus}
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Konfidenz</p>
                        <ConfidenceBar value={Math.round(client.brandProfile.confidenceScore * 100)} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400">Noch kein Markenprofil</p>
                      <LinkButton href={`/markenprofile/onboarding?client=${client.id}`}
                        size="sm" className="mt-3">
                        Onboarding starten
                      </LinkButton>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Statistiken */}
              <Card>
                <CardHeader><h2 className="text-sm font-semibold text-gray-700">Statistiken</h2></CardHeader>
                <CardBody className="space-y-3">
                  <StatRow label="Kampagnen gesamt" value={String(campaigns.length)} />
                  <StatRow
                    label="Aktive Kampagnen"
                    value={String(campaigns.filter((c) => !["ARCHIVIERT", "EXPORTIERT"].includes(c.status)).length)}
                  />
                  <StatRow
                    label="Freigegeben"
                    value={String(campaigns.filter((c) => c.status === "FREIGEGEBEN").length)}
                  />
                  <StatRow label="Materialien" value={String(client._count.assets)} />
                </CardBody>
              </Card>
            </div>

            {/* Mini campaign list */}
            {campaigns.length > 0 && (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Letzte Kampagnen</h2>
                  <Link href="?tab=kampagnen" className="text-xs text-brand-600 hover:underline">
                    Alle anzeigen
                  </Link>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {campaigns.slice(0, 3).map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <Link href={`/kampagnen/${c.id}`}
                              className="font-medium text-gray-900 hover:text-brand-600">
                              {c.title}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-gray-500">{c.offerType}</td>
                          <td className="px-6 py-3"><CampaignStatusBadge status={c.status} /></td>
                          <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── Markenprofil ───────────────────────────────────────────────── */}
        {activeTab === "markenprofil" && (
          <div className="space-y-6">
            {client.brandProfile ? (
              <>
                {/* Status strip */}
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  {(client.brandProfile as { reviewStatus?: string }).reviewStatus && (
                    <>
                      <BrandStatusBadge
                        status={(client.brandProfile as { reviewStatus: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN" }).reviewStatus}
                      />
                      <div className="h-4 w-px bg-gray-200" />
                    </>
                  )}
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-gray-500 shrink-0">Konfidenz</span>
                    <ConfidenceBar value={Math.round(client.brandProfile.confidenceScore * 100)} className="max-w-[160px]" />
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-gray-500 shrink-0">Vollständigkeit</span>
                    <ConfidenceBar value={completeness} className="max-w-[160px]" />
                  </div>
                  <div className="flex gap-2">
                    <LinkButton href={`/markenprofile/${client.id}/bearbeiten`} size="sm" variant="secondary">
                      Bearbeiten
                    </LinkButton>
                    <LinkButton href={`/markenprofile/${client.id}`} size="sm">
                      Vollansicht
                    </LinkButton>
                  </div>
                </div>

                {/* Colors + quick info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold text-gray-700">Farben</h3></CardHeader>
                    <CardBody className="space-y-3">
                      <ColorSwatchRow label="Primärfarbe" colors={[client.brandProfile.primaryColor]} />
                      {((client.brandProfile as { secondaryColors?: string[] }).secondaryColors ?? []).length > 0 && (
                        <ColorSwatchRow label="Sekundärfarben"
                          colors={(client.brandProfile as { secondaryColors: string[] }).secondaryColors} />
                      )}
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold text-gray-700">Freigabe</h3></CardHeader>
                    <CardBody>
                      {(client.brandProfile as { reviewStatus?: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN" }).reviewStatus && (
                        <BrandApprovalActions
                          clientId={client.id}
                          currentStatus={(client.brandProfile as { reviewStatus: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN" }).reviewStatus}
                        />
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <p className="text-gray-500 text-sm mb-4">Noch kein Markenprofil angelegt.</p>
                <LinkButton href={`/markenprofile/onboarding?client=${client.id}`}>
                  Onboarding starten
                </LinkButton>
              </div>
            )}
          </div>
        )}

        {/* ─── Assets ─────────────────────────────────────────────────────── */}
        {activeTab === "assets" && (
          <AssetsTab clientId={client.id} initialAssets={assets} />
        )}

        {/* ─── Kampagnen ──────────────────────────────────────────────────── */}
        {activeTab === "kampagnen" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <LinkButton href={`/kampagnen/neu?client=${client.id}`} size="sm">
                + Kampagne anlegen
              </LinkButton>
            </div>
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Noch keine Kampagnen für diesen Kunden.
              </p>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        {["Titel", "Angebotsart", "Preis", "Status", "Runs", "Erstellt", ""].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {campaigns.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <Link href={`/kampagnen/${c.id}`}
                              className="font-medium text-gray-900 hover:text-brand-600">
                              {c.title}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{c.offerType}</td>
                          <td className="px-6 py-3 text-gray-600">
                            {c.priceNew ? formatCurrency(Number(c.priceNew)) : "–"}
                          </td>
                          <td className="px-6 py-3"><CampaignStatusBadge status={c.status} /></td>
                          <td className="px-6 py-3 text-gray-600">{c._count.runs}</td>
                          <td className="px-6 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
                          <td className="px-6 py-3">
                            <Link href={`/kampagnen/${c.id}/bearbeiten`}
                              className="text-xs text-gray-400 hover:text-brand-600 font-medium">
                              Bearbeiten
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── Drive-Mapping ──────────────────────────────────────────────── */}
        {activeTab === "drive" && (
          <div className="space-y-6">
            {/* Connection status banner */}
            {!driveConfigured && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-semibold text-amber-800">Google Drive nicht konfiguriert</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Die Service-Account-Zugangsdaten fehlen. Bitte im Admin-Bereich einrichten.
                </p>
                <a href="/admin/integrationen" className="text-sm text-amber-800 underline mt-1 inline-block">
                  → Admin → Integrationen
                </a>
              </div>
            )}

            {/* Folder mapping form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Ordner-Mapping</h3>
                  <span className="text-xs text-gray-400">Ordner-IDs aus Google Drive</span>
                </div>
              </CardHeader>
              <CardBody>
                <DriveMappingForm
                  clientId={client.id}
                  initialMapping={client.driveMappings?.[0] ?? null}
                />
              </CardBody>
            </Card>

            {/* Read-only file browsers for configured source folders */}
            {client.driveMappings?.[0] && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Ordner-Inhalte (nur lesen)</h3>

                {client.driveMappings[0].brandReadFolderId && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">nur lesen</span>
                        <h4 className="text-sm font-medium text-gray-700">Brand-Ordner</h4>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <DriveFileBrowser
                        clientId={client.id}
                        folderId={client.driveMappings[0].brandReadFolderId}
                        folderLabel="Brand-Materialien"
                        type="all"
                      />
                    </CardBody>
                  </Card>
                )}

                {client.driveMappings[0].referencesReadFolderId && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">nur lesen</span>
                        <h4 className="text-sm font-medium text-gray-700">Referenzen-Ordner</h4>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <DriveFileBrowser
                        clientId={client.id}
                        folderId={client.driveMappings[0].referencesReadFolderId}
                        folderLabel="Referenzbilder"
                        type="images"
                      />
                    </CardBody>
                  </Card>
                )}

                {client.driveMappings[0].campaignsReadFolderId && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">nur lesen</span>
                        <h4 className="text-sm font-medium text-gray-700">Kampagnen-Ordner</h4>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <DriveFileBrowser
                        clientId={client.id}
                        folderId={client.driveMappings[0].campaignsReadFolderId}
                        folderLabel="Kampagnen-Unterlagen"
                        type="documents"
                      />
                    </CardBody>
                  </Card>
                )}

                {client.driveMappings[0].exportWriteFolderId && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <p className="font-medium">Export-Ordner</p>
                    <p className="font-mono mt-0.5">{client.driveMappings[0].exportWriteFolderId}</p>
                    <p className="mt-1 text-amber-700">
                      Die App erstellt hier automatisch Unterordner beim Export:{" "}
                      <span className="font-mono">Ad-Generator / {"{Kampagne}"} / run-NN /</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function ColorSwatchRow({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-5 h-5 rounded border border-gray-200" style={{ background: c }} />
            <span className="text-xs font-mono text-gray-500">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
