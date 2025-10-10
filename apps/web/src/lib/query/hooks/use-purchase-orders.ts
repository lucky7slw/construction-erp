import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type PurchaseOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
  taskId?: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  projectId: string;
  supplierId: string;
  status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'INVOICED' | 'CANCELLED';
  subtotal: number;
  tax: number;
  total: number;
  deliveryDate?: Date;
  deliveryAddress?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lineItems: PurchaseOrderItem[];
};

export function usePurchaseOrders(params: {
  projectId: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ projectId: params.projectId });
      if (params.status) searchParams.append('status', params.status);

      const response = await apiClient.get(`/purchase-orders?${searchParams.toString()}`);
      return response.data.purchaseOrders as PurchaseOrder[];
    },
    enabled: !!params.projectId,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const response = await apiClient.get(`/purchase-orders/${id}`);
      return response.data.purchaseOrder as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      supplierId: string;
      deliveryDate?: Date;
      deliveryAddress?: string;
      notes?: string;
      lineItems: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        taskId?: string;
      }>;
    }) => {
      const response = await apiClient.post('/purchase-orders', {
        ...data,
        deliveryDate: data.deliveryDate?.toISOString(),
      });
      return response.data.purchaseOrder as PurchaseOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      data,
    }: {
      id: string;
      projectId: string;
      data: {
        status?: string;
        notes?: string;
        deliveryDate?: Date;
      };
    }) => {
      const response = await apiClient.patch(`/purchase-orders/${id}`, {
        ...data,
        deliveryDate: data.deliveryDate?.toISOString(),
      });
      return response.data.purchaseOrder as PurchaseOrder;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', { projectId: variables.projectId }] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.delete(`/purchase-orders/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', { projectId: variables.projectId }] });
    },
  });
}
