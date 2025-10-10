import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/store/auth-store';

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

export function useLeads(params?: { status?: string; assignedToId?: string; source?: string; companyId?: string }) {
  const { isAuthenticated, user } = useAuth();
  const companyId = params?.companyId || user?.companies?.[0]?.id;

  return useQuery({
    queryKey: leadKeys.list(params || {}),
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }
      const response = await apiClient.getLeads({ ...params, companyId });
      return response.leads || [];
    },
    enabled: isAuthenticated && !!companyId,
  });
}

export function useLead(id: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getLead(id);
      return response.lead;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.createLead(data);
      return response.lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.updateLead(id, data);
      return response.lead;
    },
    onSuccess: (lead) => {
      if (lead) {
        queryClient.setQueryData(leadKeys.detail(lead.id), lead);
      }
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteLead(id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.convertLead(id);
      return response.lead;
    },
    onSuccess: (lead) => {
      if (lead) {
        queryClient.setQueryData(leadKeys.detail(lead.id), lead);
      }
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
