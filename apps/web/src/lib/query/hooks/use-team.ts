import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type TeamMember = {
  id: string;
  userId: string;
  projectId: string;
  role: 'manager' | 'member' | 'viewer';
  joinedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export function useTeamMembers(projectId: string) {
  return useQuery({
    queryKey: ['team', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/team?projectId=${projectId}`);
      return response.data.members as TeamMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      userId: string;
      role?: 'manager' | 'member' | 'viewer';
    }) => {
      const response = await apiClient.post('/team', data);
      return response.data.member as TeamMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      role,
    }: {
      id: string;
      projectId: string;
      role: 'manager' | 'member' | 'viewer';
    }) => {
      const response = await apiClient.patch(`/team/${id}`, { role });
      return response.data.member as TeamMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', { projectId: variables.projectId }] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.delete(`/team/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', { projectId: variables.projectId }] });
    },
  });
}
