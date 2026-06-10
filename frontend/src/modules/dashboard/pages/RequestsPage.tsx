import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { api } from '../../../shared/lib/api';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, FileText, Clock } from 'lucide-react';
import { CreateRequestModal } from '../components/CreateRequestModal';

interface RequestData {
  id: string;
  resource: {
    name: string;
  };
  quantity: number;
  status: string;
  notes: string;
  createdAt: string;
  organization: {
    name: string;
  };
}

export const RequestsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    if (orgId) {
      try {
        const res = await api<{ success: boolean; data: any[] }>(`/api/needs?organizationId=${orgId}`);
        if (res.success) {
          setRequests(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [activeWorkspace]);

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white mb-1">Requests Management</h1>
          <p className="text-slate-400">Coordinate and track resource needs across organizations.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create Request
        </button>
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Active Requests</h3>
            <p className="text-slate-400 max-w-md">
              There are no pending resource needs. Create a new request to coordinate supplies.
            </p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-900/80 sticky top-0 z-10">
                  <th className="px-6 py-4 font-medium">Resource</th>
                  <th className="px-6 py-4 font-medium">Quantity</th>
                  <th className="px-6 py-4 font-medium">Organization</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {requests.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/dashboard/requests/${req.id}`)}
                    className="group hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center text-indigo-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                            {req.resource?.name || 'Unknown Resource'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {req.quantity}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 text-xs font-medium text-slate-300 border border-slate-700">
                        {req.organization?.name || 'Unknown Organization'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${req.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          req.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            req.status === 'CANCELLED' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                              'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateRequestModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};
