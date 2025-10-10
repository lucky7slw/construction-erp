import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type ChangeOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
};

export type ChangeOrder = {
  id: string;
  coNumber: string;
  projectId: string;
  title: string;
  description: string;
  reason: string;
  costImpact: number;
  timeImpact: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED' | 'CANCELLED';
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  attachments: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lineItems: ChangeOrderItem[];
};

export function useChangeOrders(params: {
  projectId: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['change-orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ projectId: params.projectId });
      if (params.status) searchParams.append('status', params.status);

      const response = await apiClient.get(`/change-orders?${searchParams.toString()}`);
      return response.data.changeOrders as ChangeOrder[];
    },
    enabled: !!params.projectId,
  });
}

export function useChangeOrder(id: string) {
  return useQuery({
    queryKey: ['change-order', id],
    queryFn: async () => {
      const response = await apiClient.get(`/change-orders/${id}`);
      return response.data.changeOrder as ChangeOrder;
    },
    enabled: !!id,
  });
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      title: string;
      description: string;
      reason: string;
      costImpact: number;
      timeImpact: number;
      lineItems?: ChangeOrderItem[];
    }) => {
      const response = await apiClient.post('/change-orders', data);
      return response.data.changeOrder as ChangeOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateChangeOrder() {
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
      };
    }) => {
      const response = await apiClient.patch(`/change-orders/${id}`, data);
      return response.data.changeOrder as ChangeOrder;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['change-orders', { projectId: variables.projectId }] });
    },
  });
}

export function useDeleteChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.delete(`/change-orders/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', { projectId: variables.projectId }] });
    },
  });
}
