import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/store/auth-store';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useTasks(params?: { projectId?: string; assignedToId?: string; status?: string }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: taskKeys.list(params || {}),
    queryFn: async () => {
      const response = await apiClient.getTasks(params);
      return response.tasks || [];
    },
    enabled: isAuthenticated,
  });
}

export function useTask(id: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getTask(id);
      return response.task;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.createTask(data);
      return response.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.updateTask(id, data);
      return response.task;
    },
    onSuccess: (task) => {
      if (task) {
        queryClient.setQueryData(taskKeys.detail(task.id), task);
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteTask(id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
