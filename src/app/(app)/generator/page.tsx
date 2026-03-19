import { clientService } from "@/services/clientService";
import { campaignService } from "@/services/campaignService";
import { imageProviderSettingsService } from "@/services/imageProviderSettingsService";
import { computeProfileCompleteness } from "@/lib/brandAnalysis";
import { GeneratorClient } from "@/components/generator/GeneratorClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { client?: string };
};

export default async function GeneratorPage({ searchParams }: Props) {
  const preselectedClientId = searchParams.client ?? null;
  const [clients, allCampaigns, providerInfos, providerReady] = await Promise.all([
    clientService.list(),
    campaignService.list(),
    imageProviderSettingsService.getAllProviderInfos(),
    imageProviderSettingsService.isActiveProviderReady(),
  ]);

  const activeProvider = providerInfos.find((p) => p.isActive);
  const isMockProvider = activeProvider?.key === "mock";

  // Serialize clients with computed confidence
  const serializedClients = clients.map((c) => {
    const bp = c.brandProfile;
    const confidencePct = bp
      ? computeProfileCompleteness({
          primaryColor: bp.primaryColor ?? "#000000",
          fontPrimary: (bp as { fontPrimary?: string | null }).fontPrimary ?? "",
          typographyClass: (bp as { typographyClass?: string | null }).typographyClass ?? null,
          visualTone: (bp as { visualTone?: string | null }).visualTone ?? null,
          imageTone: (bp as { imageTone?: string | null }).imageTone ?? null,
          secondaryColors: (bp as { secondaryColors?: unknown }).secondaryColors ?? [],
          componentRules: (bp as { componentRules?: unknown }).componentRules ?? {},
        })
      : 0;

    return {
      id: c.id,
      name: c.name,
      initials: c.initials,
      brandColor: bp?.primaryColor ?? "#1E3A5F",
      reviewStatus: bp?.reviewStatus ?? null,
      approved: bp?.approved ?? false,
      campaignCount: c._count.campaigns,
      confidencePct,
    };
  });

  // Recent campaigns per client (last 5 each) for quick-load
  const recentCampaigns = allCampaigns.slice(0, 100).map((c) => ({
    id: c.id,
    title: c.title,
    offerType: c.offerType ?? null,
    headline: c.headline,
    customText: (c as Record<string, unknown>).customText as string | null ?? null,
    priceNew: c.priceNew ? c.priceNew.toString() : null,
    priceOld: c.priceOld ? c.priceOld.toString() : null,
    billingInterval: c.billingInterval ?? null,
    clientId: c.clientId,
  }));

  return (
    <GeneratorClient
      clients={serializedClients}
      recentCampaigns={recentCampaigns}
      providerReady={providerReady}
      isMockProvider={isMockProvider}
      providerLabel={activeProvider?.label ?? null}
      preselectedClientId={preselectedClientId}
    />
  );
}
