import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { api } from '../../../shared/lib/api';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Truck, Clock } from 'lucide-react';
import { CreateTransferModal } from '../components/CreateTransferModal';

interface TransferData {
  id: string;
  resource: {
    name: string;
  };
  quantity: number;
  status: string;
  createdAt: string;
  fromOrganization: {
    name: string;
  };
  toOrganization: {
    name: string;
  };
}

export const TransfersPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTransfers = async () => {
    setIsLoading(true);
    setError(null);
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    if (orgId) {
      try {
        const res = await api<{ success: boolean; data: any[] }>(`/api/transfers?organizationId=${orgId}`);
        if (res.success) {
          setTransfers(res.data);
        } else {
          setError("Transfer coordination temporarily unavailable");
        }
      } catch (err) {
        console.error(err);
        setError("Transfer coordination temporarily unavailable");
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTransfers();
  }, [activeWorkspace]);

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">Transfer Management</h1>
          <p className="text-[var(--color-text-secondary)]">Track incoming and outgoing resource shipments.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md font-medium transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Direct Transfer
        </button>
      </div>

      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
            Loading transfers...
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-danger)] p-8">
            <p>{error}</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-muted)] flex items-center justify-center text-[var(--color-text-secondary)] mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">No Active Transfers</h3>
            <p className="text-[var(--color-text-secondary)] max-w-md">
              There are no pending or active resource transfers. Create a new direct transfer to dispatch supplies.
            </p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)] sticky top-0 z-10">
                  <th className="px-6 py-4 font-medium">Resource</th>
                  <th className="px-6 py-4 font-medium">Quantity</th>
                  <th className="px-6 py-4 font-medium">From</th>
                  <th className="px-6 py-4 font-medium">To</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {transfers.map((tr) => {
                  if (import.meta.env.VITE_STABILIZATION_DEBUG && !tr.fromOrganization) {
                    console.warn('[INVALID_TRANSFER_ORG]', tr.id);
                  }
                  return (
                    <tr 
                      key={tr.id} 
                      onClick={() => navigate(`/dashboard/transfers/${tr.id}`)}
                      className="group hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer odd:bg-[var(--color-surface)] even:bg-[var(--color-surface-muted)]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] transition-colors">
                              {tr.resource?.name ?? 'Unknown Resource'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                                <Clock className="w-3 h-3" />
                                {new Date(tr.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] font-medium">
                        {tr.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-canvas)] text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          {tr.fromOrganization?.name ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-canvas)] text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          {tr.toOrganization?.name ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          tr.status === 'PENDING' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20' :
                          tr.status === 'IN_TRANSIT' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20' :
                          tr.status === 'COMPLETED' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' :
                          tr.status === 'CANCELLED' ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]' :
                          'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                        }`}>
                          {tr.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateTransferModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchTransfers();
          }}
        />
      )}
    </div>
  );
};
