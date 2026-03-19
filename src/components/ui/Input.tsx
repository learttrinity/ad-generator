import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-ink bg-white",
            "placeholder:text-ink-faint",
            "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500",
            "transition-colors duration-150",
            error ? "border-danger" : "border-border-medium",
            "disabled:bg-surface disabled:text-ink-muted disabled:cursor-not-allowed",
            "shadow-inner-sm",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
        {error && <p className="text-xs text-danger-text">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
