"use client";

import { useState } from "react";

type Mapping = {
  brandReadFolderId?: string | null;
  referencesReadFolderId?: string | null;
  campaignsReadFolderId?: string | null;
  exportWriteFolderId?: string | null;
};

type ValidationResult = {
  accessible: boolean;
  name?: string;
  error?: string;
} | null;

type ValidationMap = Record<keyof Mapping, ValidationResult>;

type Props = {
  clientId: string;
  initialMapping: Mapping | null;
};

const FIELD_CONFIG: {
  key: keyof Mapping;
  label: string;
  description: string;
  mode: "read" | "write";
  required?: boolean;
}[] = [
  {
    key: "brandReadFolderId",
    label: "Brand-Ordner",
    description: "Enthält Logos, Farb-Referenzen und Markenmaterialien",
    mode: "read",
  },
  {
    key: "referencesReadFolderId",
    label: "Referenzen-Ordner",
    description: "Referenzbilder und Beispiel-Creatives",
    mode: "read",
  },
  {
    key: "campaignsReadFolderId",
    label: "Kampagnen-Ordner (optional)",
    description: "Briefs, Texte und Kampagnen-Unterlagen",
    mode: "read",
  },
  {
    key: "exportWriteFolderId",
    label: "Export-Ordner",
    description: "Fertige Creatives werden hier abgelegt. Die App erstellt Unterordner nur innerhalb dieses Ordners.",
    mode: "write",
    required: true,
  },
];

export function DriveMappingForm({ clientId, initialMapping }: Props) {
  const [values, setValues] = useState<Mapping>({
    brandReadFolderId: initialMapping?.brandReadFolderId ?? "",
    referencesReadFolderId: initialMapping?.referencesReadFolderId ?? "",
    campaignsReadFolderId: initialMapping?.campaignsReadFolderId ?? "",
    exportWriteFolderId: initialMapping?.exportWriteFolderId ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationMap | null>(null);

  function handleChange(key: keyof Mapping, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setValidation(null);
    setSaveMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/drive/mappings/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: "Mapping gespeichert" });
      } else {
        const d = await res.json();
        setSaveMsg({ ok: false, text: d.error ?? "Fehler beim Speichern" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Netzwerkfehler" });
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    setValidating(true);
    setValidation(null);
    try {
      const res = await fetch(`/api/drive/mappings/${clientId}`, { method: "POST" });
      const data = await res.json();
      setValidation(data.validation ?? null);
    } catch {
      // ignore
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Safety notice */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">Sicherheitsregeln dieser Integration</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Die App <strong>liest nur</strong> aus freigegebenen Leseordnern</li>
          <li>Die App <strong>schreibt nur</strong> in den konfigurierten Export-Ordner</li>
          <li>Keine Dateien werden gelöscht, verschoben oder umbenannt</li>
          <li>Unterordner werden ausschließlich innerhalb des Export-Ordners erstellt</li>
        </ul>
      </div>

      {/* Folder fields */}
      <div className="space-y-4">
        {FIELD_CONFIG.map((field) => {
          const val = validation?.[field.key];
          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">{field.label}</label>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    field.mode === "read"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {field.mode === "read" ? "nur lesen" : "nur schreiben"}
                </span>
                {field.required && (
                  <span className="text-xs text-red-500">Pflichtfeld</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{field.description}</p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={(values[field.key] as string) ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder="Google Drive Ordner-ID (aus der URL)"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                />
                {val !== null && val !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                      val.accessible
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {val.accessible ? (
                      <>✓ {val.name}</>
                    ) : (
                      <>✗ {val.error}</>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* How to find folder IDs */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600">
        <p className="font-medium text-gray-700 mb-1">Ordner-ID finden</p>
        <p>
          Öffne den Ordner in Google Drive → die ID steht in der URL nach{" "}
          <code className="bg-gray-200 px-1 rounded">/folders/</code>. Beispiel:{" "}
          <code className="bg-gray-200 px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms</code>
        </p>
        <p className="mt-1">
          Stelle sicher, dass der Ordner mit dem Service-Account geteilt wurde (Viewer für Leseordner, Editor für Export-Ordner).
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Speichern …" : "Mapping speichern"}
        </button>
        <button
          onClick={handleValidate}
          disabled={validating}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {validating ? "Prüft …" : "Ordner prüfen"}
        </button>

        {saveMsg && (
          <span
            className={`text-xs px-2 py-1 rounded-lg ${
              saveMsg.ok
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {saveMsg.text}
          </span>
        )}
      </div>
    </div>
  );
}
