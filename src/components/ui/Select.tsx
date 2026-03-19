import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-ink bg-white",
            "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500",
            "transition-colors duration-150 cursor-pointer",
            error ? "border-danger" : "border-border-medium",
            "disabled:bg-surface disabled:cursor-not-allowed",
            "shadow-inner-sm",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint  && <p className="text-xs text-ink-muted">{hint}</p>}
        {error && <p className="text-xs text-danger-text">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
