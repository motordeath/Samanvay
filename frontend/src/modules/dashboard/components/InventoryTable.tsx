import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InventoryStatusBadge, computeInventoryStatus } from './InventoryStatusBadge';

export interface ResourceLotData {
  id: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  notes?: string;
  updatedAt: string;
  resource: {
    id?: string;
    name: string;
    unit: string;
  };
}

interface InventoryTableProps {
  lots: ResourceLotData[];
  isLoading: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ lots, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 border border-slate-800/50 rounded-xl bg-slate-900/20">
        Loading inventory data...
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-slate-800/50 rounded-xl bg-slate-900/20">
        <p>No inventory records found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {lots.map((lot) => {
        if (import.meta.env.VITE_STABILIZATION_DEBUG && !lot.resource) {
          console.warn('[INVALID_RESOURCE_LOT]', lot.id);
        }
        
        const status = computeInventoryStatus(lot.quantity, lot.availableQuantity);
        
        return (
          <div 
            key={lot.id}
            onClick={() => navigate(`/dashboard/inventory/${lot.id}`)}
            className="group flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-all cursor-pointer odd:bg-[var(--color-surface)] even:bg-[var(--color-surface-muted)]"
          >
            {/* Left Side: Progressive Density */}
            <div className="flex flex-col gap-1 min-w-0 pr-4">
              {/* Primary */}
              <div className="font-medium text-[var(--color-text-primary)] truncate text-base">
                {lot.resource?.name ?? 'Unknown Resource'}
              </div>
              
              {/* Secondary */}
              <div className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                <span>{lot.resource?.unit ?? ''}</span>
                <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                <span className="truncate max-w-[200px]">{lot.notes || 'Main Storage'}</span>
              </div>
              
              {/* Tertiary */}
              <div className="text-[10px] text-[var(--color-text-secondary)]/80 uppercase tracking-wider font-semibold mt-1">
                Updated {new Date(lot.updatedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Right Side: Status + Quantity */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <InventoryStatusBadge status={status} />
              <div className="text-xl font-medium text-[var(--color-text-primary)] tracking-tight">
                {lot.availableQuantity} <span className="text-sm text-[var(--color-text-secondary)]">/ {lot.quantity}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
