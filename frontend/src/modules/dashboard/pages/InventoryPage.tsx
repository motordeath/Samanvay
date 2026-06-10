import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { api } from '../../../shared/lib/api';
import { InventoryTable } from '../components/InventoryTable';
import type { ResourceLotData } from '../components/InventoryTable';
import { InventoryFilters } from '../components/InventoryFilters';
import { CreateInventoryModal } from '../components/CreateInventoryModal';
import { Plus } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  
  const [lots, setLots] = useState<ResourceLotData[]>([]);
  const [filteredLots, setFilteredLots] = useState<ResourceLotData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInventory = useCallback(async () => {
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    if (!orgId) {
      setLots([]);
      setFilteredLots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api<{ success: boolean; data: ResourceLotData[] }>(`/api/resource-lots?organizationId=${orgId}`);
      if (res.success && res.data) {
        setLots(res.data);
        setFilteredLots(res.data);
      } else {
        setError("Inventory feed unavailable");
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError("Inventory feed unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Handle filtering
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLots(lots);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = lots.filter(lot => 
      (lot.resource?.name ?? '').toLowerCase().includes(lower) ||
      ((lot.notes ?? '').toLowerCase().includes(lower))
    );
    setFilteredLots(filtered);
  }, [searchTerm, lots]);

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">Inventory Management</h1>
          <p className="text-[var(--color-text-secondary)]">Track and manage operational resources in this context.</p>
        </div>
        
        {workspaceUtils.isOrganizationWorkspace(activeWorkspace) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md font-medium transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Record
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <InventoryFilters 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
        />
        
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-rose-500 border border-rose-800/50 rounded-xl bg-rose-900/20">
            <p>{error}</p>
          </div>
        ) : (
          <InventoryTable 
            lots={filteredLots} 
            isLoading={isLoading} 
          />
        )}
      </div>

      {isModalOpen && (
        <CreateInventoryModal 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchInventory();
          }}
        />
      )}
    </div>
  );
};
