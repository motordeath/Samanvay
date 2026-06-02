import { transferService } from '../modules/resources/transfer/service';
import { TransferStatus } from '@prisma/client';

export const updateTransferStatus = async (transferId: string, newStatus: string, userId: string = 'system') => {
  return await transferService.updateTransferStatus(transferId, newStatus as TransferStatus, userId);
};

export const getTransferById = async (id: string) => {
  return await transferService.getTransferById(id);
};

export const getTransfers = async (filters: any, skip: number = 0, take: number = 20) => {
  return await transferService.getTransfers(filters, skip, take);
};