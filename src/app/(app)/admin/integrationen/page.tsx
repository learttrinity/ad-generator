import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { isDriveConfigured } from "@/lib/google/googleDriveClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DriveConnectionStatus } from "@/components/drive/DriveConnectionStatus";
import { imageProviderSettingsService } from "@/services/imageProviderSettingsService";
import { ProviderCard } from "@/components/providers/ProviderCard";

export const dynamic = "force-dynamic";

export default async function IntegrationenPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/kunden");

  const driveConfigured = isDriveConfigured();
  const providers = await imageProviderSettingsService.getAllProviderInfos();

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <PageHeader
        title="Integrationen"
        description="Externe Dienste und Verbindungen verwalten"
        actions={
          <LinkButton href="/admin" variant="secondary">← Admin</LinkButton>
        }
      />

      {/* ─── Bildgenerierung ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <h2 className="text-sm font-semibold text-ink-secondary">Bildgenerierung</h2>
            <span className="ml-auto text-xs text-ink-muted">
              Aktiver Provider:{" "}
              <span className="font-medium text-ink-secondary">
                {providers.find((p) => p.isActive)?.label ?? "–"}
              </span>
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-ink-muted">
            Wähle den Provider, der für die KI-Bildgenerierung verwendet wird.
            API-Schlüssel werden ausschließlich als Umgebungsvariablen hinterlegt
            und niemals im Browser angezeigt.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {providers.map((provider) => (
              <ProviderCard key={provider.key} provider={provider} />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ─── Google Drive ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* Drive icon */}
            <svg className="w-5 h-5 text-ink-muted" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.56 6 6.57-11.5H7.71zm7.6 0h-5.6L3.15 15h5.6l6.56-11.5zM17 15l-3.56 6H20l3.56-6H17z" />
            </svg>
            <h2 className="text-sm font-semibold text-ink-secondary">Google Drive</h2>
            <span
              className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                driveConfigured
                  ? "bg-success-bg text-success-text"
                  : "bg-surface text-ink-muted"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${driveConfigured ? "bg-success" : "bg-ink-faint"}`} />
              {driveConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Live status + test */}
          <DriveConnectionStatus
            initial={{
              configured: driveConfigured,
              mode: driveConfigured ? "service_account" : null,
              envHint: driveConfigured
                ? null
                : "Setze GOOGLE_SERVICE_ACCOUNT_JSON oder GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in der .env.local",
            }}
          />

          {/* Setup instructions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink-secondary">Einrichtung (Service Account)</h3>

            <ol className="space-y-3 text-sm text-ink-secondary">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="font-medium text-ink">Google Cloud Projekt anlegen</p>
                  <p className="text-xs text-ink-muted">
                    Gehe zu{" "}
                    <span className="font-mono bg-surface px-1 rounded border border-border">console.cloud.google.com</span>{" "}
                    und erstelle ein Projekt (z. B. „Trinity Ad Generator").
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="font-medium text-ink">Google Drive API aktivieren</p>
                  <p className="text-xs text-ink-muted">
                    APIs &amp; Services → Bibliothek → „Google Drive API" suchen → Aktivieren
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">3</span>
                <div>
                  <p className="font-medium text-ink">Service Account erstellen</p>
                  <p className="text-xs text-ink-muted">
                    IAM &amp; Admin → Service Accounts → Erstellen → JSON-Schlüssel herunterladen
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">4</span>
                <div>
                  <p className="font-medium text-ink">Ordner freigeben</p>
                  <p className="text-xs text-ink-muted">
                    Jeden Kunden-Ordner in Drive mit der Service-Account-E-Mail teilen:
                    Leseordner → Betrachter, Export-Ordner → Bearbeiter
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">5</span>
                <div>
                  <p className="font-medium text-ink">Umgebungsvariablen setzen</p>
                  <div className="mt-1 rounded bg-[#1a1a2e] text-[#e2e8f0] text-xs p-3 font-mono space-y-0.5">
                    <p className="text-[#8892b0]"># Option A – base64-kodierte JSON-Datei (empfohlen):</p>
                    <p>
                      GOOGLE_SERVICE_ACCOUNT_JSON=<span className="text-[#a8ff78]">{"<base64 des JSON-Schlüssels>"}</span>
                    </p>
                    <p className="text-[#8892b0] mt-2"># Erstellen mit:</p>
                    <p className="text-[#ffd700]">base64 -i service-account.json | tr -d &apos;\n&apos;</p>
                    <p className="text-[#8892b0] mt-2"># Option B – separat:</p>
                    <p>GOOGLE_SERVICE_ACCOUNT_EMAIL=<span className="text-[#a8ff78]">sa@projekt.iam.gserviceaccount.com</span></p>
                    <p>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<span className="text-[#a8ff78]">"-----BEGIN PRIVATE KEY-----\n..."</span></p>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center">6</span>
                <div>
                  <p className="font-medium text-ink">Ordner-Mapping je Kunde hinterlegen</p>
                  <p className="text-xs text-ink-muted">
                    Gehe zum jeweiligen Kunden → Tab „Drive-Mapping" → Ordner-IDs eintragen
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Safety summary */}
          <div className="rounded-lg bg-surface border border-border px-4 py-4 space-y-2">
            <h3 className="text-sm font-semibold text-ink-secondary">Sicherheitsarchitektur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-secondary">
              <div className="space-y-1">
                <p className="font-medium text-success-text">Erlaubt</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Dateien in freigegebenen Leseordnern auflisten</li>
                  <li>Dateimetadaten aus freigegebenen Ordnern lesen</li>
                  <li>Unterordner nur im Export-Root erstellen</li>
                  <li>Neue Dateien nur im Export-Root hochladen</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-danger-text">Dauerhaft gesperrt</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Keine Dateien löschen oder in Papierkorb verschieben</li>
                  <li>Keine Dateien zwischen Ordnern verschieben</li>
                  <li>Keine bestehenden Dateien umbenennen</li>
                  <li>Kein Schreibzugriff außerhalb des Export-Ordners</li>
                  <li>Kein Zugriff auf nicht freigegebene Ordner</li>
                </ul>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Quick links */}
      {driveConfigured && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink-secondary">Drive-Mapping je Kunde</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-ink-muted mb-3">
              Das Ordner-Mapping wird pro Kunde im Drive-Mapping-Tab konfiguriert.
            </p>
            <Link
              href="/kunden"
              className="inline-flex items-center gap-1 text-sm text-accent-600 hover:underline"
            >
              Zu den Kunden →
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
