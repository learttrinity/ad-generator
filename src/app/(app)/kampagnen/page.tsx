import { campaignService } from "@/services/campaignService";
import { clientService } from "@/services/clientService";
import { KampagnenClient } from "@/components/kampagnen/KampagnenClient";

export const dynamic = "force-dynamic";

export default async function KampagnenPage() {
  const [campaigns, clients] = await Promise.all([
    campaignService.list(),
    clientService.list(),
  ]);

  const campaignData = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    offerType: c.offerType ?? null,
    priceNew: c.priceNew ? c.priceNew.toString() : null,
    _count: { runs: c._count.runs },
    client: {
      id: c.client.id,
      name: c.client.name,
      initials: c.client.initials,
      brandProfile: c.client.brandProfile
        ? { primaryColor: c.client.brandProfile.primaryColor }
        : null,
    },
  }));

  const clientData = clients.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    brandColor: c.brandProfile?.primaryColor ?? "#1E3A5F",
  }));

  return <KampagnenClient campaigns={campaignData} clients={clientData} />;
}
