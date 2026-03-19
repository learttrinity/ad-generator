import { clientService } from "@/services/clientService";
import { PageHeader } from "@/components/ui/PageHeader";
import { BrandOnboardingWizard } from "@/components/brand/BrandOnboardingWizard";

export const dynamic = "force-dynamic";

type Props = { searchParams: { client?: string } };

export default async function MarkenprofilOnboardingPage({ searchParams }: Props) {
  const clients = await clientService.list();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Marken-Onboarding"
        description="Neues Markenprofil anlegen – Schritt für Schritt"
      />
      <div className="mt-6">
        <BrandOnboardingWizard
          clients={clients}
          initialClientId={searchParams.client}
        />
      </div>
    </div>
  );
}
