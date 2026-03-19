import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white border border-border shadow-card",
        hover && "transition-all duration-150 hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: Omit<CardProps, "hover">) {
  return (
    <div className={cn("border-b border-border px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: Omit<CardProps, "hover">) {
  return <div className={cn("px-5 py-5", className)}>{children}</div>;
}

export function CardFooter({ children, className }: Omit<CardProps, "hover">) {
  return (
    <div className={cn("border-t border-border px-5 py-4", className)}>
      {children}
    </div>
  );
}
