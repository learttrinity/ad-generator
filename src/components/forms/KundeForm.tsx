"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import type { Client, ClientStatus } from "@/types";

type KundeFormProps = {
  initialData?: Partial<Client>;
  mode: "create" | "edit";
};

const statusOptions = [
  { value: "AKTIV", label: "Aktiv" },
  { value: "INAKTIV", label: "Inaktiv" },
  { value: "ARCHIVIERT", label: "Archiviert" },
];

export function KundeForm({ initialData, mode }: KundeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    initials: initialData?.initials ?? "",
    name: initialData?.name ?? "",
    website: initialData?.website ?? "",
    instagram: initialData?.instagram ?? "",
    status: (initialData?.status ?? "AKTIV") as ClientStatus,
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.initials.trim()) errs.initials = "Kürzel ist erforderlich";
    if (!form.name.trim()) errs.name = "Name ist erforderlich";
    if (form.website && !/^https?:\/\/.+/.test(form.website))
      errs.website = "Keine gültige URL (muss mit http:// oder https:// beginnen)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const url = mode === "edit" ? `/api/kunden/${initialData!.id}` : "/api/kunden";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          initials: form.initials.toUpperCase(),
          website: form.website || undefined,
          instagram: form.instagram || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Fehler beim Speichern");
      }

      const client = await res.json();
      router.push(`/kunden/${client.id}`);
      router.refresh();
    } catch (err: unknown) {
      setErrors({ _form: err instanceof Error ? err.message : "Unbekannter Fehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {errors._form && (
            <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors._form}
            </div>
          )}

          <Input
            label="Kürzel *"
            placeholder="z. B. FP"
            value={form.initials}
            onChange={(e) => set("initials", e.target.value.toUpperCase())}
            error={errors.initials}
            maxLength={10}
            hint="Kürzel wird intern verwendet (z. B. FP für FitnessPark)"
          />

          <Input
            label="Kundenname *"
            placeholder="z. B. FitnessPark Hamburg"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />

          <Input
            label="Website"
            placeholder="https://www.example.de"
            type="url"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            error={errors.website}
          />

          <Input
            label="Instagram"
            placeholder="@handle"
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            options={statusOptions}
          />
        </CardBody>

        <CardFooter className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Abbrechen
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "create" ? "Kunde anlegen" : "Änderungen speichern"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
