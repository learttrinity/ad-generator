"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfidenceBar } from "@/components/brand/ConfidenceBar";
import {
  AUDIENCE_MATRIX,
  PLACEMENT_OPTIONS,
  type AudienceKey,
  type PlacementKey,
} from "@/lib/audienceMatrix";
import {
  MESSAGE_PRIORITY_LABELS,
  MESSAGE_PRIORITY_DESCRIPTIONS,
  type MessagePriority,
} from "@/lib/messagePriority";
import {
  DIRECTION_LABELS,
  DIRECTION_DESCRIPTIONS,
  type DirectionKey,
} from "@/lib/directionSelector";
import type { ReadinessResult } from "@/lib/readinessCheck";

type GenerationSetupPanelProps = {
  campaignId: string;
  readiness: ReadinessResult;
  inferredPriority: MessagePriority;
  inferredDirection: DirectionKey;
};

const DIRECTION_KEYS: DirectionKey[] = [
  "klar_preisfokus",
  "modern_aktiv",
  "premium_reduziert",
  "dynamisch_direkt",
  "lokal_nahbar",
  "clean_studio",
];

const PRIORITY_KEYS: MessagePriority[] = [
  "preisfokussiert",
  "headline_fokussiert",
  "angebot_fokussiert",
  "dringlichkeit_fokussiert",
];

export function GenerationSetupPanel({
  campaignId,
  readiness,
  inferredPriority,
  inferredDirection,
}: GenerationSetupPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Environment mode
  const [environmentMode, setEnvironmentMode] = useState<"STANDARD_STUDIO" | "KUNDENSTUDIO_REFERENZ">(
    "STANDARD_STUDIO"
  );

  // Direction override
  const [directionMode, setDirectionMode] = useState<"automatisch" | "manuell">("automatisch");
  const [manualDirectionKey, setManualDirectionKey] = useState<DirectionKey>(inferredDirection);

  // Priority override
  const [priorityMode, setPriorityMode] = useState<"automatisch" | "manuell">("automatisch");
  const [manualPriority, setManualPriority] = useState<MessagePriority>(inferredPriority);

  // Audiences
  const [selectedAudiences, setSelectedAudiences] = useState<AudienceKey[]>(["frau_25_30", "mann_25_30"]);

  // Placements
  const [selectedPlacements, setSelectedPlacements] = useState<PlacementKey[]>([
    "feed_1080x1080",
    "story_1080x1920",
  ]);

  function toggleAudience(key: AudienceKey) {
    setSelectedAudiences((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  function togglePlacement(key: PlacementKey) {
    setSelectedPlacements((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  const totalAssets = selectedAudiences.length * selectedPlacements.length;
  const activeDirection = directionMode === "manuell" ? manualDirectionKey : inferredDirection;
  const activePriority = priorityMode === "manuell" ? manualPriority : inferredPriority;

  async function handleStart() {
    if (!readiness.ready) return;
    if (selectedAudiences.length === 0 || selectedPlacements.length === 0) {
      setError("Bitte mindestens eine Zielgruppe und ein Placement auswählen.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/kampagnen/${campaignId}/starten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environmentMode,
          directionMode,
          manualDirectionKey: directionMode === "manuell" ? manualDirectionKey : undefined,
          manualOverrides: priorityMode === "manuell" ? { messagePriority: manualPriority } : {},
          selectedPlacements,
          selectedAudiences,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Starten");

      // Redirect to run detail page
      router.push(`/runs/${data.run.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Readiness */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Bereitschaft</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Markenprofil</p>
              <ConfidenceBar value={readiness.brandScore} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kampagnendaten</p>
              <ConfidenceBar value={readiness.campaignScore} />
            </div>
          </div>

          {readiness.issues.length > 0 && (
            <ul className="space-y-1">
              {readiness.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      issue.type === "blocker"
                        ? "text-red-500 font-bold mt-0.5"
                        : "text-amber-500 mt-0.5"
                    }
                  >
                    {issue.type === "blocker" ? "✕" : "⚠"}
                  </span>
                  <span className={issue.type === "blocker" ? "text-red-700" : "text-amber-700"}>
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {readiness.ready && (
            <p className="text-sm text-green-700 font-medium">
              Bereit zur Generierung.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Message Priority */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Botschafts­priorität</h3>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPriorityMode("automatisch")}
                className={`px-2 py-1 rounded ${priorityMode === "automatisch" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Automatisch
              </button>
              <button
                type="button"
                onClick={() => setPriorityMode("manuell")}
                className={`px-2 py-1 rounded ${priorityMode === "manuell" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Manuell
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {priorityMode === "automatisch" ? (
            <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3">
              <p className="text-sm font-medium text-brand-800">
                {MESSAGE_PRIORITY_LABELS[inferredPriority]}
              </p>
              <p className="text-xs text-brand-600 mt-1">
                {MESSAGE_PRIORITY_DESCRIPTIONS[inferredPriority]}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setManualPriority(key)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    manualPriority === key
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-900">
                    {MESSAGE_PRIORITY_LABELS[key]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {MESSAGE_PRIORITY_DESCRIPTIONS[key]}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Creative Direction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Kreativ­richtung</h3>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDirectionMode("automatisch")}
                className={`px-2 py-1 rounded ${directionMode === "automatisch" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Automatisch
              </button>
              <button
                type="button"
                onClick={() => setDirectionMode("manuell")}
                className={`px-2 py-1 rounded ${directionMode === "manuell" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Manuell
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {directionMode === "automatisch" ? (
            <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3">
              <p className="text-sm font-medium text-brand-800">
                {DIRECTION_LABELS[inferredDirection]}
              </p>
              <p className="text-xs text-brand-600 mt-1">
                {DIRECTION_DESCRIPTIONS[inferredDirection]}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {DIRECTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setManualDirectionKey(key)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    manualDirectionKey === key
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-900">{DIRECTION_LABELS[key]}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {DIRECTION_DESCRIPTIONS[key]}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Environment Mode */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Umgebung</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3">
          {(["STANDARD_STUDIO", "KUNDENSTUDIO_REFERENZ"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEnvironmentMode(mode)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                environmentMode === mode
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-xs font-medium text-gray-900">
                {mode === "STANDARD_STUDIO" ? "Standard Studio" : "Kundenstudio aus Referenz"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === "STANDARD_STUDIO"
                  ? "Generisches Studioumfeld ohne Kundenbezug"
                  : "Nutzt hochgeladene Referenz-Ads des Kunden"}
              </p>
            </button>
          ))}
        </CardBody>
      </Card>

      {/* Audience Matrix */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">Zielgruppen & Placements</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Zielgruppen</p>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_MATRIX.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAudience(a.key as AudienceKey)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    selectedAudiences.includes(a.key as AudienceKey)
                      ? "border-brand-500 bg-brand-50 text-brand-800 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Placements</p>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePlacement(p.key as PlacementKey)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    selectedPlacements.includes(p.key as PlacementKey)
                      ? "border-brand-500 bg-brand-50 text-brand-800 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {selectedAudiences.length} Zielgruppe{selectedAudiences.length !== 1 ? "n" : ""} ×{" "}
            {selectedPlacements.length} Placement{selectedPlacements.length !== 1 ? "s" : ""} ={" "}
            <strong>{totalAssets} Assets</strong> pro Run
          </p>
        </CardBody>
      </Card>

      {/* Active summary */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600 space-y-1">
        <p>
          <strong>Botschaftspriorität:</strong> {MESSAGE_PRIORITY_LABELS[activePriority]}
          {priorityMode === "manuell" && <span className="ml-1 text-amber-600">(manuell)</span>}
        </p>
        <p>
          <strong>Kreativrichtung:</strong> {DIRECTION_LABELS[activeDirection]}
          {directionMode === "manuell" && <span className="ml-1 text-amber-600">(manuell)</span>}
        </p>
        <p>
          <strong>Umgebung:</strong>{" "}
          {environmentMode === "STANDARD_STUDIO" ? "Standard Studio" : "Kundenstudio aus Referenz"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleStart}
        loading={loading}
        disabled={!readiness.ready || selectedAudiences.length === 0 || selectedPlacements.length === 0}
      >
        {readiness.ready
          ? `${totalAssets} Assets generieren`
          : "Bereitschaft unvollständig – Start nicht möglich"}
      </Button>
    </div>
  );
}
