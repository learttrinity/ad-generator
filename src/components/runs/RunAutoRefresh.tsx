"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Current run status from server */
  status: string;
  /** Polling interval in ms — defaults to 3000 */
  intervalMs?: number;
};

/**
 * Invisible client component that auto-refreshes the page while a run
 * is still IN_GENERIERUNG or IN_VORBEREITUNG.
 * Placed once in the run detail page's server component tree.
 */
export function RunAutoRefresh({ status, intervalMs = 3000 }: Props) {
  const router = useRouter();
  const isActive = status === "IN_GENERIERUNG" || status === "IN_VORBEREITUNG";

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [isActive, intervalMs, router]);

  return null;
}
