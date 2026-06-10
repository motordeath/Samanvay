import React from 'react';
import { Activity } from 'lucide-react';

export interface ActivityData {
  id: string;
  action: string;
  actorName: string;
  entityName: string;
  timestamp: string;
}

interface ActivityItemProps {
  activity: ActivityData;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors">
      <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1">
        <Activity className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-secondary)] leading-snug">
          <span className="font-medium text-[var(--color-text-primary)]">{activity.actorName}</span>{' '}
          <span className="text-[var(--color-text-secondary)]/80">{activity.action}</span>{' '}
          <span className="font-medium text-[var(--color-text-primary)]/90">{activity.entityName}</span>
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]/60 mt-1">
          {new Date(activity.timestamp).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
};
