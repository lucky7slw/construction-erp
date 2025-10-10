import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Project, type CreateProjectRequest } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Custom hooks for projects
export function useProjects() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.getProjects();
      return response.projects || [];
    },
    enabled: isAuthenticated,
  });
}

export function useProject(id: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getProject(id);
      return response.project;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const response = await apiClient.createProject(data);
      return response.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProjectRequest> }) => {
      const response = await apiClient.updateProject(id, data);
      return response.project;
    },
    onSuccess: (updatedProject) => {
      if (updatedProject) {
        queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject);
      }
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteProject(id);
    },
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}