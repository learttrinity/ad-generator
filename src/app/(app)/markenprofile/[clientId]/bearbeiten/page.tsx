import { notFound } from "next/navigation";
import { clientService } from "@/services/clientService";
import { brandProfileService } from "@/services/brandProfileService";
import { PageHeader } from "@/components/ui/PageHeader";
import { BrandProfileForm } from "@/components/brand/BrandProfileForm";
import type { BrandProfile } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = { params: { clientId: string } };

export default async function MarkenprofilBearbeitenPage({ params }: Props) {
  const client = await clientService.get(params.clientId).catch(() => null);
  if (!client) notFound();

  const profile = await brandProfileService.getByClientId(params.clientId);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Markenprofil bearbeiten"
        description={client.name}
      />
      <div className="mt-6">
        <BrandProfileForm
          clientId={client.id}
          clientName={client.name}
          initialProfile={profile as BrandProfile | null}
          redirectOnSave={`/markenprofile/${client.id}`}
        />
      </div>
    </div>
  );
}
