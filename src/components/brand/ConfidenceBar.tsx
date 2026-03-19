import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  /** 0–100 */
  value: number;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceBar({ value, showLabel = true, className }: ConfidenceBarProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  const color =
    pct >= 75 ? "bg-green-500" :
    pct >= 50 ? "bg-yellow-400" :
    pct >= 25 ? "bg-orange-400" :
    "bg-gray-300";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 w-8 text-right">{pct}%</span>
      )}
    </div>
  );
}
