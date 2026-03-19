import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { isDriveConfigured } from "@/lib/google/googleDriveClient";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/kunden");

  const driveConfigured = isDriveConfigured();

  const [users, fonts, stats] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.fontLibrary.findMany({ orderBy: { name: "asc" } }),
    Promise.all([
      prisma.client.count(),
      prisma.campaign.count(),
      prisma.generationRun.count(),
      prisma.creativeAsset.count(),
    ]).then(([clients, campaigns, runs, assets]) => ({ clients, campaigns, runs, assets })),
  ]);

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <PageHeader
        title="Admin"
        description="Systemverwaltung und Benutzerverwaltung"
        actions={
          <Link
            href="/admin/integrationen"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Integrationen →
          </Link>
        }
      />

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Kunden", value: stats.clients },
          { label: "Kampagnen", value: stats.campaigns },
          { label: "Generation Runs", value: stats.runs },
          { label: "Creative Assets", value: stats.assets },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardBody className="text-center py-5">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Users */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Benutzer</h2>
          <span className="text-xs text-gray-400">Benutzerverwaltung (Phase 2)</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">E-Mail</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rolle</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-3 text-gray-600">{user.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={user.role === "ADMIN" ? "info" : "default"}>
                      {user.role === "ADMIN" ? "Administrator" : "Benutzer"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={user.active ? "success" : "neutral"}>
                      {user.active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Font Library */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Schriften-Bibliothek</h2>
          <span className="text-xs text-gray-400">Schriften hinzufügen (Phase 2)</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Klassifizierung</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fonts.map((font) => (
                <tr key={font.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{font.name}</td>
                  <td className="px-6 py-3 text-gray-600 capitalize">{font.classification}</td>
                  <td className="px-6 py-3">
                    <Badge variant={font.active ? "success" : "neutral"}>
                      {font.active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Google Drive Section */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Google Drive Integration</h2>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                driveConfigured ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${driveConfigured ? "bg-green-500" : "bg-gray-400"}`} />
              {driveConfigured ? "Konfiguriert" : "Nicht konfiguriert"}
            </span>
            <Link
              href="/admin/integrationen"
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Verwalten →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <p className="font-medium text-green-700 mb-1">Erlaubt</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Leseordner: Brand-Kit, Referenzen, Kampagnen-Briefs</li>
                <li>Schreibordner: Fertiger-Export-Ordner je Kunde</li>
                <li>Unterordner erstellen im Export-Root</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-red-700 mb-1">Dauerhaft gesperrt</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Keine Dateien löschen oder verschieben</li>
                <li>Keine Dateien umbenennen</li>
                <li>Kein Schreiben außerhalb des Export-Ordners</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
