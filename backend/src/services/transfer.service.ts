import { transferService } from '../modules/resources/transfer/service';
import { TransferStatus } from '@prisma/client';

export const updateTransferStatus = async (transferId: string, newStatus: string, userId: string = 'system') => {
  const transfer = await transferService.getTransferById(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }

  const currentStatus = transfer.status;

  if (currentStatus === 'PENDING' && newStatus === 'IN_TRANSIT') {
    await transferService.updateTransferStatus(transferId, 'APPROVED', userId);
    return await transferService.updateTransferStatus(transferId, 'IN_TRANSIT', userId);
  }

  if (currentStatus === 'PENDING' && newStatus === 'COMPLETED') {
    await transferService.updateTransferStatus(transferId, 'APPROVED', userId);
    await transferService.updateTransferStatus(transferId, 'IN_TRANSIT', userId);
    return await transferService.updateTransferStatus(transferId, 'COMPLETED', userId);
  }

  if (currentStatus === 'APPROVED' && newStatus === 'COMPLETED') {
    await transferService.updateTransferStatus(transferId, 'IN_TRANSIT', userId);
    return await transferService.updateTransferStatus(transferId, 'COMPLETED', userId);
  }

  return await transferService.updateTransferStatus(transferId, newStatus as TransferStatus, userId);
};

export const getTransferById = async (id: string) => {
  return await transferService.getTransferById(id);
};

export const getTransfers = async (filters: any, skip: number = 0, take: number = 20) => {
  return await transferService.getTransfers(filters, skip, take);
};