import { clientService } from "@/services/clientService";
import { PageHeader } from "@/components/ui/PageHeader";
import { KampagneForm } from "@/components/forms/KampagneForm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { client?: string };
};

export default async function KampagneNeuPage({ searchParams }: Props) {
  const clients = await clientService.list();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Kampagne anlegen"
        description="Neue Kampagne erstellen"
      />
      <div className="mt-6">
        <KampagneForm
          mode="create"
          clients={clients}
          defaultClientId={searchParams.client}
        />
      </div>
    </div>
  );
}
