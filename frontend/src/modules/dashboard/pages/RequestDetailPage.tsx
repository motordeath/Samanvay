import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/lib/api';
import { ArrowLeft, Calendar, Info, Package, AlertCircle } from 'lucide-react';
import { RequestMatchCard } from '../components/RequestMatchCard';
import type { RequestMatchData } from '../components/RequestMatchCard';

interface RequestDetailData {
  id: string;
  resourceId: string;
  quantity: number;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  resource: {
    id: string;
    name: string;
    unit: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestDetailData | null>(null);
  const [matches, setMatches] = useState<RequestMatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRequestAndMatches = async () => {
      try {
        const [resReq, resMatches] = await Promise.all([
          api<{ success: boolean; data: RequestDetailData }>(`/api/needs/${id}`),
          api<{ success: boolean; data: RequestMatchData[] }>(`/api/needs/${id}/matches`)
        ]);
        if (isMounted) {
          if (resReq.success) setRequest(resReq.data);
          if (resMatches.success) setMatches(resMatches.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (id) fetchRequestAndMatches();
    return () => { isMounted = false; };
  }, [id]);

  const handleInitiateTransfer = (match: RequestMatchData) => {
    // In a real application this would open a pre-filled CreateTransferModal
    alert(`Initiating transfer with ${match.organization.name}`);
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-slate-500">Loading request details...</div>;
  }

  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
        <AlertCircle className="w-12 h-12 text-slate-600" />
        <p>Request not found.</p>
        <button onClick={() => navigate('/dashboard/requests')} className="text-indigo-400 hover:text-indigo-300">
          Return to requests
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/dashboard/requests')}
          className="mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-light text-white tracking-tight">Request Details</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${request.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  request.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    request.status === 'CANCELLED' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>
                {request.status}
              </span>
            </div>
            <p className="text-slate-400 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Resource Info */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Resource Requirements
            </h3>

            <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 block mb-1">Requested Resource</span>
                <span className="text-xl font-medium text-white">{request.resource?.name || 'Unknown Resource'}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 block mb-1">Quantity Needed</span>
                <span className="text-3xl font-light text-white tracking-tight">{request.quantity} <span className="text-sm font-normal text-slate-500">{request.resource?.unit}</span></span>
              </div>
            </div>

            {request.notes && (
              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <span className="text-sm font-medium text-slate-400 mb-2 block">Operational Notes</span>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-950/30 p-4 rounded-lg border border-slate-800/30">
                  {request.notes}
                </p>
              </div>
            )}
          </div>

          {request.status === 'OPEN' && matches.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
              <h3 className="text-lg font-medium text-white mb-4">Potential Fulfillment Sources</h3>
              <div className="flex flex-col gap-3">
                {matches.map(match => (
                  <RequestMatchCard
                    key={match.resourceLotId}
                    match={match}
                    onInitiateTransfer={handleInitiateTransfer}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              Context
            </h3>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Requesting Organization</span>
                <span className="text-slate-300 font-medium">{request.organization?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Need ID</span>
                <span className="text-slate-400 font-mono text-sm">{request.id}</span>
              </div>
              <div>
                <span className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Last Updated</span>
                <span className="text-slate-300 text-sm">{new Date(request.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
