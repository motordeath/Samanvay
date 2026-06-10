import React from 'react';

export type InventoryStatus = 'Available' | 'Low Stock' | 'Critical' | 'Reserved' | 'Transferred';

interface InventoryStatusBadgeProps {
  status: InventoryStatus;
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({ status }) => {
  let styleClasses = '';
  
  switch (status) {
    case 'Available':
      styleClasses = 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20';
      break;
    case 'Low Stock':
      styleClasses = 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20';
      break;
    case 'Critical':
      styleClasses = 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20';
      break;
    case 'Reserved':
      styleClasses = 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20';
      break;
    case 'Transferred':
      styleClasses = 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
      break;
    default:
      styleClasses = 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styleClasses}`}>
      {status}
    </span>
  );
};

export const computeInventoryStatus = (quantity: number, availableQuantity: number): InventoryStatus => {
  if (availableQuantity === 0) return 'Critical';
  if (availableQuantity < 10) return 'Low Stock'; // Simplified threshold for demo
  if (availableQuantity < quantity) return 'Reserved'; // Some are reserved
  return 'Available';
};
