import type { ReactNode } from "react";

interface ResearchSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ResearchSection({ title, icon, badge, children, className = "" }: ResearchSectionProps) {
  return (
    <section className={`rounded-lg border border-border-subtle bg-surface-card shadow-soft ${className}`}>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gold">{icon}</span>}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
