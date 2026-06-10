import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { Shield, Calendar, MapPin, UserCheck } from 'lucide-react';

interface AssignmentData {
  id: string;
  volunteerName: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
}

export const VolunteerAssignmentPanel: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAssignments = async () => {
      const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
      if (!orgId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await api<{ success: boolean; data: AssignmentData[] }>(`/api/assignments?organizationId=${orgId}`);
        if (isMounted && res.success) {
          setAssignments(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch assignments', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAssignments();
    return () => { isMounted = false; };
  }, [activeWorkspace]);

  if (isLoading) {
    return <div className="text-slate-500 text-sm py-4">Loading active deployments...</div>;
  }

  if (assignments.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-md mb-6">
      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-indigo-400" />
        Active Deployments
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map(assignment => (
          <div key={assignment.id} className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-slate-900/80">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-medium flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  {assignment.volunteerName}
                </h4>
                <p className="text-sm text-slate-400 mt-0.5">{assignment.title}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                {assignment.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(assignment.startDate).toLocaleDateString()}
              </span>
              {assignment.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {assignment.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
