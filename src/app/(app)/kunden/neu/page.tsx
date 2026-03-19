import { PageHeader } from "@/components/ui/PageHeader";
import { KundeForm } from "@/components/forms/KundeForm";

export default function KundeNeuPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Kunde anlegen"
        description="Neuen Kunden zum System hinzufügen"
      />
      <div className="mt-6">
        <KundeForm mode="create" />
      </div>
    </div>
  );
}
