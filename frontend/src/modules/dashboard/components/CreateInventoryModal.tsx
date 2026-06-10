import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/lib/api';
import { X } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';

interface CreateInventoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateInventoryModal: React.FC<CreateInventoryModalProps> = ({ onClose, onSuccess }) => {
  const { activeWorkspace } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await api<{ success: boolean; data: any[] }>('/api/resources');
        if (res.success && res.data) {
          setResources(res.data);
          if (res.data.length > 0) {
            setResourceId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch resources', err);
      }
    };
    fetchResources();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    if (!orgId || !resourceId || !quantity) return;

    setIsSubmitting(true);
    try {
      const payload = {
        organizationId: orgId,
        resourceId,
        quantity: parseInt(quantity, 10),
        notes
      };

      const res = await api<{ success: boolean }>('/api/resource-lots', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to create inventory', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-canvas)]/80">
      <div className="w-full max-w-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-elevated)]">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">Add Inventory Record</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Resource Type</label>
            <select
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
              required
            >
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Initial Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
              placeholder="e.g. 100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Location / Notes <span className="text-[var(--color-text-secondary)]/70 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
              placeholder="Warehouse A, Aisle 3"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !resourceId || !quantity}
              className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
