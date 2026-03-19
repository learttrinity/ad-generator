import { notFound } from "next/navigation";
import { campaignService } from "@/services/campaignService";
import { clientService } from "@/services/clientService";
import { PageHeader } from "@/components/ui/PageHeader";
import { KampagneForm } from "@/components/forms/KampagneForm";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function KampagneBearbeitenPage({ params }: Props) {
  const [campaign, clients] = await Promise.all([
    campaignService.get(params.id).catch(() => null),
    clientService.list(),
  ]);

  if (!campaign) notFound();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Kampagne bearbeiten"
        description={campaign.title}
      />
      <div className="mt-6">
        <KampagneForm
          mode="edit"
          initialData={campaign}
          clients={clients}
        />
      </div>
    </div>
  );
}
