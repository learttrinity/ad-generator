import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { clientService } from "@/services/clientService";
import { brandProfileService } from "@/services/brandProfileService";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BrandStatusBadge } from "@/components/brand/BrandStatusBadge";
import { ConfidenceBar } from "@/components/brand/ConfidenceBar";
import { BrandApprovalActions } from "@/components/brand/BrandApprovalActions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: { clientId: string } };

export default async function MarkenprofilDetailPage({ params }: Props) {
  const client = await clientService.get(params.clientId).catch(() => null);
  if (!client) notFound();

  const profile = await brandProfileService.getByClientId(params.clientId);
  if (!profile) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <PageHeader
          title={`Markenprofil – ${client.name}`}
          actions={
            <LinkButton href={`/markenprofile/onboarding?client=${client.id}`}>
              Onboarding starten
            </LinkButton>
          }
        />
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500 text-sm">Noch kein Markenprofil vorhanden.</p>
          <LinkButton href={`/markenprofile/onboarding?client=${client.id}`} className="mt-4">
            Jetzt anlegen
          </LinkButton>
        </div>
      </div>
    );
  }

  const completeness = await brandProfileService.getCompleteness(params.clientId);
  const assets = await prisma.clientAsset.findMany({
    where: { clientId: params.clientId, active: true },
    orderBy: { createdAt: "desc" },
  });

  const colors = {
    secondary: (profile.secondaryColors as string[]) ?? [],
    accent: (profile.accentColors as string[]) ?? [],
    neutral: (profile.neutralPalette as string[]) ?? [],
  };
  const rules = (profile.componentRules ?? {}) as Record<string, string>;
  const restr = (profile.restrictions ?? {}) as {
    forbiddenColors: string[];
    forbiddenStyles: string[];
    forbiddenWording: string[];
    notes: string;
  };

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <PageHeader
        title={`Markenprofil – ${client.name}`}
        description={`Kürzel: ${client.initials}`}
        actions={
          <div className="flex gap-2">
            <LinkButton href={`/kunden/${client.id}?tab=markenprofil`} variant="secondary">
              ← Zum Kunden
            </LinkButton>
            <LinkButton href={`/markenprofile/${client.id}/bearbeiten`}>
              Bearbeiten
            </LinkButton>
          </div>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-gray-500">Status</span>
          <BrandStatusBadge status={profile.reviewStatus} />
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs text-gray-500 shrink-0">Konfidenz</span>
          <ConfidenceBar value={Math.round(profile.confidenceScore * 100)} className="flex-1 max-w-[160px]" />
        </div>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs text-gray-500 shrink-0">Vollständigkeit</span>
          <ConfidenceBar value={completeness} className="flex-1 max-w-[160px]" />
        </div>
        <div className="text-xs text-gray-400">
          Aktualisiert {formatDate(profile.updatedAt)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Farben */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Farben</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <ColorRow label="Primärfarbe" colors={[profile.primaryColor]} />
              {colors.secondary.length > 0 && <ColorRow label="Sekundärfarben" colors={colors.secondary} />}
              {colors.accent.length > 0 && <ColorRow label="Akzentfarben" colors={colors.accent} />}
              {colors.neutral.length > 0 && <ColorRow label="Neutrale Palette" colors={colors.neutral} />}
            </CardBody>
          </Card>

          {/* Typografie */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Typografie</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-3">
              <InfoRow label="Hauptschrift" value={profile.fontPrimary || "–"} />
              <InfoRow label="Sekundärschrift" value={profile.fontSecondary ?? "–"} />
              <InfoRow label="Fallback Hauptschrift" value={profile.fallbackFontPrimary ?? "–"} />
              <InfoRow label="Fallback Sekundärschrift" value={profile.fallbackFontSecondary ?? "–"} />
              <InfoRow label="Typografie-Klasse" value={profile.typographyClass ?? "–"} />
            </CardBody>
          </Card>

          {/* Markenton */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Markenton & Bildwelt</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-3">
              <InfoRow label="Visueller Ton" value={profile.visualTone ?? "–"} />
              <InfoRow label="Bildwelt" value={profile.imageTone ?? "–"} />
            </CardBody>
          </Card>

          {/* Komponentenregeln */}
          {Object.keys(rules).length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-gray-700">Komponentenregeln</h3>
              </CardHeader>
              <CardBody className="grid grid-cols-2 gap-3">
                {rules.pricingStyle && <InfoRow label="Preisdarstellung" value={rules.pricingStyle} />}
                {rules.overlayStyle && <InfoRow label="Overlay-Stil" value={rules.overlayStyle} />}
                {rules.logoProminence && <InfoRow label="Logo-Prominenz" value={rules.logoProminence} />}
                {rules.borderRadiusStyle && <InfoRow label="Eckenradius" value={rules.borderRadiusStyle} />}
                {rules.textDensity && <InfoRow label="Textdichte" value={rules.textDensity} />}
                {rules.urgencyStyle && <InfoRow label="Dringlichkeits-Stil" value={rules.urgencyStyle} />}
              </CardBody>
            </Card>
          )}

          {/* Einschränkungen */}
          {(restr.forbiddenColors?.length > 0 ||
            restr.forbiddenStyles?.length > 0 ||
            restr.forbiddenWording?.length > 0 ||
            restr.notes) && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-gray-700">Einschränkungen</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                {restr.forbiddenColors?.length > 0 && (
                  <TagRow label="Verbotene Farben" tags={restr.forbiddenColors} />
                )}
                {restr.forbiddenStyles?.length > 0 && (
                  <TagRow label="Verbotene Stile" tags={restr.forbiddenStyles} />
                )}
                {restr.forbiddenWording?.length > 0 && (
                  <TagRow label="Verbotene Begriffe" tags={restr.forbiddenWording} />
                )}
                {restr.notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Weitere Hinweise</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{restr.notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Approval actions */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700">Freigabe</h3>
            </CardHeader>
            <CardBody>
              <BrandApprovalActions
                clientId={client.id}
                currentStatus={profile.reviewStatus}
              />
            </CardBody>
          </Card>

          {/* Assets count */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Materialien</h3>
              <Link href={`/kunden/${client.id}?tab=assets`}
                className="text-xs text-brand-600 hover:underline">Verwalten</Link>
            </CardHeader>
            <CardBody>
              <p className="text-3xl font-bold text-gray-900">{assets.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Hochgeladene Dateien</p>
              {assets.length > 0 && (
                <div className="mt-3 space-y-1">
                  {["logo", "reference_ad", "brand_pdf", "font"].map((type) => {
                    const count = assets.filter((a) => a.assetType === type).length;
                    if (count === 0) return null;
                    const labels: Record<string, string> = {
                      logo: "Logos",
                      reference_ad: "Referenz-Ads",
                      brand_pdf: "Brand-PDFs",
                      font: "Schriften",
                    };
                    return (
                      <div key={type} className="flex justify-between text-xs text-gray-600">
                        <span>{labels[type]}</span><span>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-32 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-5 h-5 rounded border border-gray-200 inline-block" style={{ background: c }} />
            <span className="text-xs font-mono text-gray-500">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
