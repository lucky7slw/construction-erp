import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type Photo = {
  id: string;
  projectId: string;
  category: 'PHOTO';
  filename: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  tags: string[];
  location?: string;
  description?: string;
  takenAt?: Date;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export function usePhotos(params: {
  projectId: string;
  tag?: string;
}) {
  return useQuery({
    queryKey: ['photos', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ projectId: params.projectId });
      if (params.tag) searchParams.append('tag', params.tag);

      const response = await apiClient.get(`/photos?${searchParams.toString()}`);
      return response.data.photos as Photo[];
    },
    enabled: !!params.projectId,
  });
}

export function usePhoto(id: string) {
  return useQuery({
    queryKey: ['photo', id],
    queryFn: async () => {
      const response = await apiClient.get(`/photos/${id}`);
      return response.data.photo as Photo;
    },
    enabled: !!id,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      filename: string;
      fileUrl: string;
      mimeType: string;
      size: number;
      tags?: string[];
      location?: string;
      description?: string;
      takenAt?: Date;
    }) => {
      const response = await apiClient.post('/photos', {
        ...data,
        takenAt: data.takenAt?.toISOString(),
      });
      return response.data.photo as Photo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photos', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdatePhoto() {
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
        description?: string;
        tags?: string[];
        location?: string;
      };
    }) => {
      const response = await apiClient.patch(`/photos/${id}`, data);
      return response.data.photo as Photo;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photo', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['photos', { projectId: variables.projectId }] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.delete(`/photos/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photos', { projectId: variables.projectId }] });
    },
  });
}
