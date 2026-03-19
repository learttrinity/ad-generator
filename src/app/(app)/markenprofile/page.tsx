import Link from "next/link";
import { clientService } from "@/services/clientService";
import { LinkButton } from "@/components/ui/Button";
import { BrandStatusBadge } from "@/components/brand/BrandStatusBadge";

export const dynamic = "force-dynamic";

export default async function MarkenprofilePage() {
  const clients = await clientService.list();
  const withProfile = clients.filter((c) => c.brandProfile);
  const withoutProfile = clients.filter((c) => !c.brandProfile);

  return (
    <div className="px-8 py-10 max-w-4xl space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Markenprofile</h1>
          <p className="text-sm text-gray-500 mt-1">Farben, Typografie und Tonalität je Kunde</p>
        </div>
        <LinkButton href="/markenprofile/onboarding">+ Onboarding starten</LinkButton>
      </div>

      {clients.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center space-y-4">
          <p className="text-sm text-gray-400">Noch keine Kunden angelegt.</p>
          <LinkButton href="/kunden/neu">Kunden anlegen</LinkButton>
        </div>
      )}

      {/* Clients with profiles */}
      {withProfile.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Profile ({withProfile.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {withProfile.map((client) => {
              const profile = client.brandProfile!;
              const status = (profile as { reviewStatus?: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN" }).reviewStatus;

              return (
                <div key={client.id} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 font-bold text-sm flex items-center justify-center">
                        {client.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {client._count.campaigns} Kampagne{client._count.campaigns !== 1 ? "n" : ""}
                        </p>
                      </div>
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-200 shrink-0"
                      style={{ background: profile.primaryColor }}
                      title={profile.primaryColor}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Status</span>
                    {status ? (
                      <BrandStatusBadge status={status} />
                    ) : (
                      <span className={`font-medium ${profile.approved ? "text-green-600" : "text-yellow-600"}`}>
                        {profile.approved ? "Freigegeben" : "Entwurf"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <Link
                      href={`/markenprofile/${client.id}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Profil öffnen →
                    </Link>
                    <Link
                      href={`/markenprofile/${client.id}/bearbeiten`}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Bearbeiten
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Clients without profiles */}
      {withoutProfile.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Noch kein Profil ({withoutProfile.length})
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
            {withoutProfile.map((client) => (
              <div key={client.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                    {client.initials}
                  </span>
                  <span className="text-sm text-gray-800">{client.name}</span>
                </div>
                <Link
                  href={`/markenprofile/onboarding?client=${client.id}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Onboarding starten →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
