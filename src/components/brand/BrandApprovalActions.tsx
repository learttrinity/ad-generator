"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandStatusBadge } from "@/components/brand/BrandStatusBadge";
import type { BrandProfileStatus } from "@prisma/client";

interface Props {
  clientId: string;
  currentStatus: BrandProfileStatus;
}

const TRANSITIONS: Record<BrandProfileStatus, { label: string; next: BrandProfileStatus; style: string }[]> = {
  ENTWURF: [
    {
      label: "Zur Prüfung markieren",
      next: "IN_PRUEFUNG",
      style: "border-yellow-300 text-yellow-700 hover:bg-yellow-50",
    },
    {
      label: "Direkt freigeben",
      next: "FREIGEGEBEN",
      style: "border-green-300 text-green-700 hover:bg-green-50",
    },
  ],
  IN_PRUEFUNG: [
    {
      label: "Als Entwurf zurücksetzen",
      next: "ENTWURF",
      style: "border-gray-300 text-gray-600 hover:bg-gray-50",
    },
    {
      label: "Freigeben",
      next: "FREIGEGEBEN",
      style: "border-green-300 text-green-700 hover:bg-green-50",
    },
  ],
  FREIGEGEBEN: [
    {
      label: "Freigabe zurückziehen",
      next: "IN_PRUEFUNG",
      style: "border-yellow-300 text-yellow-700 hover:bg-yellow-50",
    },
  ],
};

export function BrandApprovalActions({ clientId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<BrandProfileStatus | null>(null);
  const [error, setError] = useState("");

  async function setStatus(status: BrandProfileStatus) {
    setLoading(status);
    setError("");
    try {
      const res = await fetch(`/api/markenprofile/${clientId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Statusänderung fehlgeschlagen");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  const actions = TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Aktuell:</span>
        <BrandStatusBadge status={currentStatus} />
      </div>

      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.next}
              type="button"
              disabled={!!loading}
              onClick={() => setStatus(action.next)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left
                ${action.style} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === action.next ? "Wird gespeichert…" : action.label}
            </button>
          ))}
        </div>
      )}

      {currentStatus === "FREIGEGEBEN" && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Freigegeben – bereit für die Generierung
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
