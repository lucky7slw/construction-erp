import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type User } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Custom hooks for users
export function useUsers() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get('/users');
      return (response as any).data.users || [];
    },
    enabled: isAuthenticated,
  });
}

export function useUser(id: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`);
      return (response as any).data.user;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiClient.updateUser(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update user');
      }
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Update the specific user in cache
      if (updatedUser) {
        queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      }
      // Invalidate users list to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.deleteUser(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete user');
      }
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(deletedId) });
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}