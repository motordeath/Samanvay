import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/lib/api';
import { X, Send } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';

interface CreateRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ onClose, onSuccess }) => {
  const { activeWorkspace, user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchResources = async () => {
      try {
        const res = await api<{ success: boolean; data: any[] }>('/api/resources');
        if (isMounted && res.success) {
          setResources(res.data);
          if (res.data.length > 0) {
            setResourceId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchResources();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    if (!orgId) {
      setError('No active organization workspace selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        organizationId: orgId,
        resourceId,
        quantity: parseInt(quantity, 10),
        notes,
        createdById: user?.id,
      };

      const res = await api<{ success: boolean }>('/api/needs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        onSuccess();
      } else {
        setError('Request could not be created. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-lg font-medium text-white tracking-tight">Create Resource Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">Signal a need to the network</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Resource Category</label>
            <select
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            >
              <option value="" disabled>Select Resource</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Quantity Needed</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Operational Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Urgency, specific variants needed, delivery instructions..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !resourceId || !quantity}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};