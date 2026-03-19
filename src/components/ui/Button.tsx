import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-600 text-white hover:bg-accent-700 focus-visible:ring-accent-500 shadow-sm hover:shadow-md",
  secondary:
    "bg-white text-ink border border-border-medium hover:bg-surface hover:border-border-strong focus-visible:ring-border-strong shadow-card",
  danger:
    "bg-danger text-white hover:bg-danger-text focus-visible:ring-danger shadow-sm",
  ghost:
    "text-ink-muted hover:bg-border hover:text-ink focus-visible:ring-border-strong",
  dark:
    "bg-ink text-white hover:bg-ink-secondary focus-visible:ring-ink shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-[13px] gap-2 rounded-lg",
  lg: "px-5 py-2.5 text-sm gap-2 rounded-xl",
};

export function getButtonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center font-semibold",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={getButtonClasses(variant, size, className)}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={getButtonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
