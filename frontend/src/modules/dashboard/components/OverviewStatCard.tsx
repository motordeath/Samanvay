import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface OverviewStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  trendUp?: boolean;
}

export const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp
}) => {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${trendUp ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-3xl font-medium text-[var(--color-text-primary)] mb-1">{value}</h3>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)]/70 mt-2">{description}</p>}
      </div>
    </div>
  );
};
