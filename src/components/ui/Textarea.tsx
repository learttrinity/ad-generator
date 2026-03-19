import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-ink bg-white",
            "placeholder:text-ink-faint resize-y",
            "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500",
            "transition-colors duration-150",
            error ? "border-danger" : "border-border-medium",
            "disabled:bg-surface disabled:cursor-not-allowed",
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
Textarea.displayName = "Textarea";
