import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Estimate, type CreateEstimateRequest } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

export const estimateKeys = {
  all: ['estimates'] as const,
  lists: () => [...estimateKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...estimateKeys.lists(), filters] as const,
  details: () => [...estimateKeys.all, 'detail'] as const,
  detail: (id: string) => [...estimateKeys.details(), id] as const,
};

export function useEstimates() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: estimateKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.getEstimates();
      return response.estimates || [];
    },
    enabled: isAuthenticated,
  });
}

export function useEstimate(id: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: estimateKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getEstimate(id);
      return response.estimate;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEstimateRequest) => {
      const response = await apiClient.createEstimate(data);
      return response.estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateEstimateRequest> }) => {
      const response = await apiClient.updateEstimate(id, data);
      return response.estimate;
    },
    onSuccess: (estimate) => {
      if (estimate) {
        queryClient.setQueryData(estimateKeys.detail(estimate.id), estimate);
      }
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

export function useApproveEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.approveEstimate(id);
      return response.estimate;
    },
    onSuccess: (estimate) => {
      if (estimate) {
        queryClient.setQueryData(estimateKeys.detail(estimate.id), estimate);
      }
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteEstimate(id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: estimateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

export function useAddLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estimateId, data }: { estimateId: string; data: any }) => {
      const response = await apiClient.addLineItem(estimateId, data);
      return response.lineItem;
    },
    onSuccess: (_, { estimateId }) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(estimateId) });
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}
