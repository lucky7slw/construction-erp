import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/store/auth-store';

export const timeEntryKeys = {
  all: ['timeEntries'] as const,
  lists: () => [...timeEntryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...timeEntryKeys.lists(), filters] as const,
  details: () => [...timeEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...timeEntryKeys.details(), id] as const,
};

export function useTimeEntries(params?: { projectId?: string; userId?: string; startDate?: string; endDate?: string }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: timeEntryKeys.list(params || {}),
    queryFn: async () => {
      const response = await apiClient.getTimeEntries(params);
      return response.timeEntries || [];
    },
    enabled: isAuthenticated,
  });
}

export function useTimeEntry(id: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: timeEntryKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getTimeEntry(id);
      return response.timeEntry;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.createTimeEntry(data);
      return response.timeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.updateTimeEntry(id, data);
      return response.timeEntry;
    },
    onSuccess: (timeEntry) => {
      if (timeEntry) {
        queryClient.setQueryData(timeEntryKeys.detail(timeEntry.id), timeEntry);
      }
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteTimeEntry(id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: timeEntryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.approveTimeEntry(id);
      return response.timeEntry;
    },
    onSuccess: (timeEntry) => {
      if (timeEntry) {
        queryClient.setQueryData(timeEntryKeys.detail(timeEntry.id), timeEntry);
      }
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.rejectTimeEntry(id);
      return response.timeEntry;
    },
    onSuccess: (timeEntry) => {
      if (timeEntry) {
        queryClient.setQueryData(timeEntryKeys.detail(timeEntry.id), timeEntry);
      }
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
  });
}
