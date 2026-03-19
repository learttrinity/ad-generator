"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ClientTabId = "uebersicht" | "markenprofil" | "assets" | "kampagnen" | "drive";

const TABS: { id: ClientTabId; label: string }[] = [
  { id: "uebersicht",   label: "Übersicht"     },
  { id: "markenprofil", label: "Markenprofil"  },
  { id: "assets",       label: "Assets"        },
  { id: "kampagnen",    label: "Kampagnen"     },
  { id: "drive",        label: "Drive-Mapping" },
];

export function ClientTabs({ activeTab }: { activeTab: ClientTabId }) {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-0 overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`${pathname}?tab=${tab.id}`}
          className={cn(
            "whitespace-nowrap px-5 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === tab.id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
