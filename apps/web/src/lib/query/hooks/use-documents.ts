import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

// Query keys
export const documentKeys = {
  all: ['documents'] as const,
  projects: () => [...documentKeys.all, 'project'] as const,
  project: (projectId: string) => [...documentKeys.projects(), projectId] as const,
};

// Types for document operations
type UploadFileMetadata = {
  category?: string;
  description?: string;
  tags?: string[];
};

// Custom hooks for documents
export function useProjectFiles(projectId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: documentKeys.project(projectId),
    queryFn: async () => {
      const response = await apiClient.getProjectFiles(projectId);
      return response.files || [];
    },
    enabled: isAuthenticated && !!projectId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      metadata
    }: {
      projectId: string;
      file: File;
      metadata?: UploadFileMetadata;
    }) => {
      const response = await apiClient.uploadFile(projectId, file, metadata);
      return response.file;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.project(variables.projectId) });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, projectId }: { fileId: string; projectId: string }) => {
      await apiClient.deleteFile(fileId);
      return { fileId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.project(data.projectId) });
    },
  });
}
