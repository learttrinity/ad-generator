import { notFound } from "next/navigation";
import { clientService } from "@/services/clientService";
import { PageHeader } from "@/components/ui/PageHeader";
import { KundeForm } from "@/components/forms/KundeForm";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function KundeBearbeitenPage({ params }: Props) {
  const client = await clientService.get(params.id).catch(() => null);
  if (!client) notFound();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Kunde bearbeiten"
        description={client.name}
      />
      <div className="mt-6">
        <KundeForm mode="edit" initialData={client} />
      </div>
    </div>
  );
}
