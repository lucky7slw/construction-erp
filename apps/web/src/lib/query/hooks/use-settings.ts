import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

// Mutation hooks for settings
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => {
      const response = await apiClient.updateProfile(data);
      return response.user;
    },
    onSuccess: (updatedUser) => {
      // Update auth store with new user data
      setUser(updatedUser);
      // Invalidate any user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.changePassword(data);
      return response;
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; address?: string; phone?: string; email?: string; website?: string } }) => {
      const response = await apiClient.updateCompany(id, data);
      return response.company;
    },
    onSuccess: () => {
      // Invalidate company-related queries
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
