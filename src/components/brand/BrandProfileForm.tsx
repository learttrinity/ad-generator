"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/Card";
import { ColorPaletteEditor } from "@/components/brand/ColorPaletteEditor";
import type { BrandProfile } from "@prisma/client";

// ─── Select options ───────────────────────────────────────────────────────────

const typographyClassOptions = [
  { value: "", label: "– Auswählen –" },
  { value: "Geometric Sans", label: "Geometric Sans" },
  { value: "Neo-Grotesk", label: "Neo-Grotesk" },
  { value: "Humanist Sans", label: "Humanist Sans" },
  { value: "Condensed Sans", label: "Condensed Sans" },
  { value: "Elegante Serif", label: "Elegante Serif" },
  { value: "Sportliche Display", label: "Sportliche Display" },
  { value: "Neutrale UI Sans", label: "Neutrale UI Sans" },
];

const visualToneOptions = [
  { value: "", label: "– Auswählen –" },
  { value: "Premium", label: "Premium" },
  { value: "Modern", label: "Modern" },
  { value: "Energetisch", label: "Energetisch" },
  { value: "Lokal & Nahbar", label: "Lokal & Nahbar" },
  { value: "Minimal", label: "Minimal" },
  { value: "Direkt & Angebotsstark", label: "Direkt & Angebotsstark" },
  { value: "Boutique", label: "Boutique" },
  { value: "Performance-Fokussiert", label: "Performance-Fokussiert" },
];

const imageToneOptions = [
  { value: "", label: "– Auswählen –" },
  { value: "Editorial", label: "Editorial" },
  { value: "Clean Commercial", label: "Clean Commercial" },
  { value: "Moody", label: "Moody" },
  { value: "Studio", label: "Studio" },
  { value: "Lokal", label: "Lokal" },
  { value: "Hochkontrast", label: "Hochkontrast" },
  { value: "Premium", label: "Premium" },
];

const makeOptions = (opts: string[]) => [
  { value: "", label: "– Auswählen –" },
  ...opts.map((o) => ({ value: o, label: o })),
];

// ─── Form state types ──────────────────────────────────────────────────────────

type ComponentRules = {
  pricingStyle: string;
  overlayStyle: string;
  logoProminence: string;
  borderRadiusStyle: string;
  textDensity: string;
  urgencyStyle: string;
};

type Restrictions = {
  forbiddenColors: string[];
  forbiddenStyles: string[];
  forbiddenWording: string[];
  notes: string;
};

type FormState = {
  primaryColor: string;
  secondaryColors: string[];
  accentColors: string[];
  neutralPalette: string[];
  fontPrimary: string;
  fontSecondary: string;
  fallbackFontPrimary: string;
  fallbackFontSecondary: string;
  typographyClass: string;
  visualTone: string;
  imageTone: string;
  componentRules: ComponentRules;
  restrictions: Restrictions;
  confidenceScore: number;
};

function initForm(profile: BrandProfile | null): FormState {
  const rules = (profile?.componentRules ?? {}) as Partial<ComponentRules>;
  const restr = (profile?.restrictions ?? {}) as Partial<Restrictions>;
  return {
    primaryColor: profile?.primaryColor ?? "#000000",
    secondaryColors: (profile?.secondaryColors as string[]) ?? [],
    accentColors: (profile?.accentColors as string[]) ?? [],
    neutralPalette: (profile?.neutralPalette as string[]) ?? [],
    fontPrimary: profile?.fontPrimary ?? "",
    fontSecondary: profile?.fontSecondary ?? "",
    fallbackFontPrimary: profile?.fallbackFontPrimary ?? "",
    fallbackFontSecondary: profile?.fallbackFontSecondary ?? "",
    typographyClass: profile?.typographyClass ?? "",
    visualTone: profile?.visualTone ?? "",
    imageTone: profile?.imageTone ?? "",
    componentRules: {
      pricingStyle: rules.pricingStyle ?? "",
      overlayStyle: rules.overlayStyle ?? "",
      logoProminence: rules.logoProminence ?? "",
      borderRadiusStyle: rules.borderRadiusStyle ?? "",
      textDensity: rules.textDensity ?? "",
      urgencyStyle: rules.urgencyStyle ?? "",
    },
    restrictions: {
      forbiddenColors: restr.forbiddenColors ?? [],
      forbiddenStyles: restr.forbiddenStyles ?? [],
      forbiddenWording: restr.forbiddenWording ?? [],
      notes: restr.notes ?? "",
    },
    confidenceScore: Math.round((profile?.confidenceScore ?? 0) * 100),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrandProfileFormProps {
  clientId: string;
  clientName: string;
  initialProfile: BrandProfile | null;
  redirectOnSave?: string;
  /** When embedded in wizard, show minimal footer */
  wizardMode?: boolean;
  onSaved?: (profile: BrandProfile) => void;
}

export function BrandProfileForm({
  clientId,
  clientName,
  initialProfile,
  redirectOnSave,
  wizardMode = false,
  onSaved,
}: BrandProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initForm(initialProfile));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setRule(key: keyof ComponentRules, value: string) {
    setForm((prev) => ({
      ...prev,
      componentRules: { ...prev.componentRules, [key]: value },
    }));
  }

  function setRestr(key: keyof Restrictions, value: string | string[]) {
    setForm((prev) => ({
      ...prev,
      restrictions: { ...prev.restrictions, [key]: value },
    }));
  }

  function addRestrictItem(key: "forbiddenColors" | "forbiddenStyles" | "forbiddenWording", val: string) {
    const trimmed = val.trim();
    if (!trimmed) return;
    const current = form.restrictions[key];
    if (!current.includes(trimmed)) setRestr(key, [...current, trimmed]);
  }

  function removeRestrictItem(key: "forbiddenColors" | "forbiddenStyles" | "forbiddenWording", idx: number) {
    setRestr(key, form.restrictions[key].filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fontPrimary.trim()) {
      setErrors({ fontPrimary: "Hauptschrift ist erforderlich" });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        ...form,
        componentRules: Object.fromEntries(
          Object.entries(form.componentRules).filter(([, v]) => v !== ""),
        ),
      };
      const res = await fetch(`/api/markenprofile/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Speichern fehlgeschlagen");
      }
      const saved: BrandProfile = await res.json();
      if (onSaved) {
        onSaved(saved);
      } else if (redirectOnSave) {
        router.push(redirectOnSave);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrors({ _form: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* ─── Farben ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Farben</h3>
          <p className="text-xs text-gray-400 mt-0.5">Primär- und Ergänzungsfarben des Markenauftritts</p>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Primärfarbe *</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setField("primaryColor", e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => setField("primaryColor", e.target.value)}
                maxLength={7}
                placeholder="#000000"
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <ColorPaletteEditor
            label="Sekundärfarben"
            value={form.secondaryColors}
            onChange={(v) => setField("secondaryColors", v)}
            max={4}
            hint="Bis zu 4 Sekundärfarben"
          />
          <ColorPaletteEditor
            label="Akzentfarben"
            value={form.accentColors}
            onChange={(v) => setField("accentColors", v)}
            max={3}
            hint="Bis zu 3 Akzentfarben"
          />
          <ColorPaletteEditor
            label="Neutrale Palette"
            value={form.neutralPalette}
            onChange={(v) => setField("neutralPalette", v)}
            max={4}
            hint="Hintergründe, Grautöne, Weiß/Schwarz-Varianten"
          />
        </CardBody>
      </Card>

      {/* ─── Typografie ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Typografie</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Hauptschrift *"
            placeholder="z. B. Montserrat"
            value={form.fontPrimary}
            onChange={(e) => setField("fontPrimary", e.target.value)}
            error={errors.fontPrimary}
          />
          <Input
            label="Sekundärschrift"
            placeholder="z. B. Inter"
            value={form.fontSecondary}
            onChange={(e) => setField("fontSecondary", e.target.value)}
          />
          <Input
            label="Fallback-Hauptschrift"
            placeholder="z. B. Roboto"
            value={form.fallbackFontPrimary}
            onChange={(e) => setField("fallbackFontPrimary", e.target.value)}
            hint="Systemschrift als Fallback"
          />
          <Input
            label="Fallback-Sekundärschrift"
            placeholder="z. B. Arial"
            value={form.fallbackFontSecondary}
            onChange={(e) => setField("fallbackFontSecondary", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Select
              label="Typografie-Klasse"
              value={form.typographyClass}
              onChange={(e) => setField("typographyClass", e.target.value)}
              options={typographyClassOptions}
              hint="Kategorisiert den Typografiestil für die Generierung"
            />
          </div>
        </CardBody>
      </Card>

      {/* ─── Markenton & Bildwelt ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Markenton & Bildwelt</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Visueller Ton"
            value={form.visualTone}
            onChange={(e) => setField("visualTone", e.target.value)}
            options={visualToneOptions}
          />
          <Select
            label="Bildwelt (Image Tone)"
            value={form.imageTone}
            onChange={(e) => setField("imageTone", e.target.value)}
            options={imageToneOptions}
          />
        </CardBody>
      </Card>

      {/* ─── Komponentenregeln ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Komponentenregeln</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Steuerung des Creative-Layouts für die Generierung
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Preisdarstellung"
            value={form.componentRules.pricingStyle}
            onChange={(e) => setRule("pricingStyle", e.target.value)}
            options={makeOptions(["dominant", "dezent", "gemischt"])}
          />
          <Select
            label="Overlay-Stil"
            value={form.componentRules.overlayStyle}
            onChange={(e) => setRule("overlayStyle", e.target.value)}
            options={makeOptions(["none", "transparent", "solid", "glass"])}
          />
          <Select
            label="Logo-Prominenz"
            value={form.componentRules.logoProminence}
            onChange={(e) => setRule("logoProminence", e.target.value)}
            options={makeOptions(["klein", "mittel", "groß"])}
          />
          <Select
            label="Eckenradius"
            value={form.componentRules.borderRadiusStyle}
            onChange={(e) => setRule("borderRadiusStyle", e.target.value)}
            options={makeOptions(["sharp", "soft", "rounded"])}
          />
          <Select
            label="Textdichte"
            value={form.componentRules.textDensity}
            onChange={(e) => setRule("textDensity", e.target.value)}
            options={makeOptions(["niedrig", "mittel", "hoch"])}
          />
          <Select
            label="Dringlichkeits-Stil"
            value={form.componentRules.urgencyStyle}
            onChange={(e) => setRule("urgencyStyle", e.target.value)}
            options={makeOptions(["none", "dezent", "auffällig"])}
          />
        </CardBody>
      </Card>

      {/* ─── Einschränkungen ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Einschränkungen</h3>
          <p className="text-xs text-gray-400 mt-0.5">Was vermieden werden soll</p>
        </CardHeader>
        <CardBody className="space-y-5">
          <TagInput
            label="Verbotene Farben"
            tags={form.restrictions.forbiddenColors}
            onAdd={(v) => addRestrictItem("forbiddenColors", v)}
            onRemove={(i) => removeRestrictItem("forbiddenColors", i)}
            placeholder="z. B. #ff0000 oder Signalrot"
          />
          <TagInput
            label="Verbotene Stile"
            tags={form.restrictions.forbiddenStyles}
            onAdd={(v) => addRestrictItem("forbiddenStyles", v)}
            onRemove={(i) => removeRestrictItem("forbiddenStyles", i)}
            placeholder="z. B. Stockfoto-Look"
          />
          <TagInput
            label="Verbotene Begriffe"
            tags={form.restrictions.forbiddenWording}
            onAdd={(v) => addRestrictItem("forbiddenWording", v)}
            onRemove={(i) => removeRestrictItem("forbiddenWording", i)}
            placeholder="z. B. 'günstig', 'billig'"
          />
          <Textarea
            label="Weitere Hinweise"
            value={form.restrictions.notes}
            onChange={(e) => setRestr("notes", e.target.value)}
            placeholder="Sonstige Markenvorgaben oder Einschränkungen…"
            rows={3}
          />
        </CardBody>
      </Card>

      {/* ─── Confidence ───────────────────────────────────────────────────── */}
      {!wizardMode && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">Konfidenz</h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                value={form.confidenceScore}
                onChange={(e) => setField("confidenceScore", Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="w-10 text-sm font-medium text-gray-700 text-right">
                {form.confidenceScore}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Wie sicher ist dieses Profil? Wird automatisch erhöht sobald mehr Material vorliegt.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      {!wizardMode && (
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Abbrechen
          </Button>
          <Button type="submit" loading={loading}>
            Markenprofil speichern
          </Button>
        </div>
      )}

      {wizardMode && (
        <Button type="submit" loading={loading} className="w-full">
          Speichern & Weiter
        </Button>
      )}
    </form>
  );
}

// ─── TagInput helper ──────────────────────────────────────────────────────────

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
}) {
  const [val, setVal] = useState("");

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd(val);
      setVal("");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.map((tag, i) => (
          <span key={i}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
            {tag}
            <button type="button" onClick={() => onRemove(i)}
              className="text-gray-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={() => { onAdd(val); setVal(""); }}
          className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
        >
          + Hinzufügen
        </button>
      </div>
    </div>
  );
}
