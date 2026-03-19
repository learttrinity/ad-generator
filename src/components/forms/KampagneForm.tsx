"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import type { Campaign, CampaignStatus, Client } from "@/types";

type KampagneFormProps = {
  initialData?: Partial<Campaign>;
  clients: Pick<Client, "id" | "name">[];
  mode: "create" | "edit";
  defaultClientId?: string;
};

const statusOptions = [
  { value: "ENTWURF", label: "Entwurf" },
  { value: "BEREIT", label: "Bereit" },
  { value: "IN_GENERIERUNG", label: "In Generierung" },
  { value: "ZUR_PRUEFUNG", label: "Zur Prüfung" },
  { value: "FREIGEGEBEN", label: "Freigegeben" },
  { value: "EXPORTIERT", label: "Exportiert" },
  { value: "ARCHIVIERT", label: "Archiviert" },
];

const offerTypeOptions = [
  { value: "Mitgliedschaft", label: "Mitgliedschaft" },
  { value: "Rabattaktion", label: "Rabattaktion" },
  { value: "Probetraining", label: "Probetraining" },
  { value: "Kurs / Event", label: "Kurs / Event" },
  { value: "Saisonaktion", label: "Saisonaktion" },
  { value: "Neueröffnung", label: "Neueröffnung" },
  { value: "Sonstiges", label: "Sonstiges" },
];

const billingIntervalOptions = [
  { value: "", label: "– kein –" },
  { value: "monatlich", label: "Monatlich" },
  { value: "vierteljährlich", label: "Vierteljährlich" },
  { value: "halbjährlich", label: "Halbjährlich" },
  { value: "jährlich", label: "Jährlich" },
  { value: "einmalig", label: "Einmalig" },
];

export function KampagneForm({ initialData, clients, mode, defaultClientId }: KampagneFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    clientId: initialData?.clientId ?? defaultClientId ?? "",
    title: initialData?.title ?? "",
    offerType: initialData?.offerType ?? "",
    status: (initialData?.status ?? "ENTWURF") as CampaignStatus,
    aworkTaskId: initialData?.aworkTaskId ?? "",
    // Angebotslogik
    priceNew: initialData?.priceNew?.toString() ?? "",
    priceOld: initialData?.priceOld?.toString() ?? "",
    billingInterval: initialData?.billingInterval ?? "",
    contractTerm: initialData?.contractTerm ?? "",
    startDate: initialData?.startDate
      ? new Date(initialData.startDate as unknown as string).toISOString().split("T")[0]
      : "",
    // Botschaft
    headline: initialData?.headline ?? "",
    subheadline: initialData?.subheadline ?? "",
    urgencyText: initialData?.urgencyText ?? "",
    ctaText: (initialData as Record<string, unknown>)?.ctaText as string ?? "",
    locationLine: (initialData as Record<string, unknown>)?.locationLine as string ?? "",
    // Notizen
    notes: initialData?.notes ?? "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.clientId) newErrors.clientId = "Kunde ist erforderlich";
    if (!form.title.trim()) newErrors.title = "Titel ist erforderlich";
    if (!form.offerType) newErrors.offerType = "Angebotsart ist erforderlich";
    if (!form.headline.trim()) newErrors.headline = "Headline ist erforderlich";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const url = mode === "edit" ? `/api/kampagnen/${initialData!.id}` : "/api/kampagnen";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Fehler beim Speichern");
      }

      const campaign = await res.json();
      router.push(`/kampagnen/${campaign.id}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setErrors({ _form: message });
    } finally {
      setLoading(false);
    }
  }

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* 1. Basisdaten */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">1. Basisdaten</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Kunde *"
            value={form.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            options={clientOptions}
            placeholder="Kunde auswählen"
            error={errors.clientId}
          />

          <Input
            label="Kampagnentitel *"
            placeholder="z. B. Sommeraktion 2025"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            error={errors.title}
          />

          <Select
            label="Angebotsart *"
            value={form.offerType}
            onChange={(e) => set("offerType", e.target.value)}
            options={offerTypeOptions}
            placeholder="Angebotsart auswählen"
            error={errors.offerType}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            options={statusOptions}
          />

          <Input
            label="awork Task-ID"
            placeholder="Optional"
            value={form.aworkTaskId}
            onChange={(e) => set("aworkTaskId", e.target.value)}
            hint="Task-ID aus awork für Verknüpfung"
          />
        </CardBody>
      </Card>

      {/* 2. Angebotslogik */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">2. Angebotslogik</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Neuer Preis (€)"
            placeholder="29,90"
            value={form.priceNew}
            onChange={(e) => set("priceNew", e.target.value)}
            hint="Aktionspreis ohne €-Zeichen"
          />

          <Input
            label="Alter Preis (€)"
            placeholder="49,90"
            value={form.priceOld}
            onChange={(e) => set("priceOld", e.target.value)}
            hint="Streichpreis – wird automatisch verwendet wenn höher als neuer Preis"
          />

          <Select
            label="Zahlungsintervall"
            value={form.billingInterval}
            onChange={(e) => set("billingInterval", e.target.value)}
            options={billingIntervalOptions}
          />

          <Input
            label="Vertragslaufzeit"
            placeholder="z. B. 12 Monate, ohne Bindung"
            value={form.contractTerm}
            onChange={(e) => set("contractTerm", e.target.value)}
          />

          <Input
            label="Aktionsbeginn"
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            hint="Optional – für zeitlich begrenzte Angebote"
          />
        </CardBody>
      </Card>

      {/* 3. Botschaft */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">3. Botschaft</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-5">
          <Input
            label="Hauptheadline *"
            placeholder="z. B. Jetzt Mitglied werden & 2 Monate gratis trainieren"
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            error={errors.headline}
            hint={`${form.headline.length}/60 Zeichen`}
          />

          <Input
            label="Subheadline"
            placeholder="z. B. Dein Sommer-Deal bei FitnessPark Hamburg"
            value={form.subheadline}
            onChange={(e) => set("subheadline", e.target.value)}
            hint={`${form.subheadline.length}/80 Zeichen`}
          />

          <Input
            label="Dringlichkeitstext"
            placeholder="z. B. Nur bis 31. August 2025"
            value={form.urgencyText}
            onChange={(e) => set("urgencyText", e.target.value)}
            hint={`${form.urgencyText.length}/50 Zeichen`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="CTA-Text"
              placeholder="z. B. Jetzt sichern, Mehr erfahren"
              value={form.ctaText}
              onChange={(e) => set("ctaText", e.target.value)}
              hint={`${form.ctaText.length}/30 Zeichen`}
            />

            <Input
              label="Standortzeile"
              placeholder="z. B. Hamburg-Mitte · Öffnungszeiten 6–23 Uhr"
              value={form.locationLine}
              onChange={(e) => set("locationLine", e.target.value)}
              hint="Optional – wird in lokalen Varianten verwendet"
            />
          </div>
        </CardBody>
      </Card>

      {/* 4. Interne Notizen */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">4. Interne Notizen</h2>
        </CardHeader>
        <CardBody>
          <Textarea
            label="Notizen"
            placeholder="Zielgruppe, Besonderheiten, Absprachen..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
          />
        </CardBody>
        <CardFooter className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Abbrechen
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "create" ? "Kampagne anlegen" : "Änderungen speichern"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
