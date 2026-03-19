"use client";

interface HeaderProps {
  breadcrumb?: { label: string; href?: string }[];
}

export function Header({ breadcrumb }: HeaderProps) {
  if (!breadcrumb?.length) return null;

  return (
    <div className="px-8 py-3 border-b border-gray-100 bg-white">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <span className={i === breadcrumb.length - 1 ? "text-gray-900 font-medium" : "text-gray-400"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>
    </div>
  );
}
