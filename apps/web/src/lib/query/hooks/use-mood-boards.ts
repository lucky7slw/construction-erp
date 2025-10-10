import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type MoodBoardStatus = 'DRAFT' | 'SHARED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type MoodBoardItemType = 'IMAGE' | 'COLOR' | 'MATERIAL' | 'PRODUCT' | 'INSPIRATION' | 'NOTE';

export function useMoodBoards(params: { projectId: string; status?: MoodBoardStatus; customerId?: string; room?: string }) {
  return useQuery({
    queryKey: ['mood-boards', params],
    queryFn: async () => {
      const sp = new URLSearchParams({ projectId: params.projectId });
      if (params.status) sp.append('status', params.status);
      if (params.customerId) sp.append('customerId', params.customerId);
      if (params.room) sp.append('room', params.room);
      const response = await apiClient.get(`/mood-boards?${sp}`);
      return response.data.moodBoards;
    },
  });
}

export function useMoodBoard(id: string) {
  return useQuery({
    queryKey: ['mood-board', id],
    queryFn: async () => {
      const response = await apiClient.get(`/mood-boards/${id}`);
      return response.data.moodBoard;
    },
    enabled: !!id,
  });
}

export function useCreateMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/mood-boards', data);
      return response.data.moodBoard;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['mood-boards', { projectId: v.projectId }] }),
  });
}

export function useUpdateMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/mood-boards/${id}`, data);
      return response.data.moodBoard;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['mood-board', d.id] });
      qc.invalidateQueries({ queryKey: ['mood-boards'] });
    },
  });
}

export function useDeleteMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await apiClient.delete(`/mood-boards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mood-boards'] }),
  });
}

export function useAddMoodBoardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ moodBoardId, data }: { moodBoardId: string; data: any }) => {
      const response = await apiClient.post(`/mood-boards/${moodBoardId}/items`, data);
      return response.data.item;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['mood-board', v.moodBoardId] }),
  });
}

export function useUpdateMoodBoardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      const response = await apiClient.put(`/mood-boards/items/${itemId}`, data);
      return response.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mood-board'] }),
  });
}

export function useDeleteMoodBoardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => await apiClient.delete(`/mood-boards/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mood-board'] }),
  });
}

export function useReorderMoodBoardItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ moodBoardId, itemIds }: { moodBoardId: string; itemIds: string[] }) => {
      await apiClient.post(`/mood-boards/${moodBoardId}/reorder`, { itemIds });
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['mood-board', v.moodBoardId] }),
  });
}

export function useAddMoodBoardComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ moodBoardId, data }: { moodBoardId: string; data: { comment: string; itemId?: string } }) => {
      const response = await apiClient.post(`/mood-boards/${moodBoardId}/comments`, data);
      return response.data.comment;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['mood-board', v.moodBoardId] }),
  });
}

export function useShareMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moodBoardId: string) => {
      const response = await apiClient.post(`/mood-boards/${moodBoardId}/share`);
      return response.data.moodBoard;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['mood-board', d.id] });
      qc.invalidateQueries({ queryKey: ['mood-boards'] });
    },
  });
}

export function useApproveMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moodBoardId: string) => {
      const response = await apiClient.post(`/mood-boards/${moodBoardId}/approve`);
      return response.data.moodBoard;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['mood-board', d.id] });
      qc.invalidateQueries({ queryKey: ['mood-boards'] });
    },
  });
}

export function useMoodBoardsSummary(projectId: string) {
  return useQuery({
    queryKey: ['mood-boards-summary', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/mood-boards-summary?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function usePendingMoodBoards(projectId: string) {
  return useQuery({
    queryKey: ['mood-boards-pending', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/mood-boards-pending?projectId=${projectId}`);
      return response.data.pending;
    },
    enabled: !!projectId,
  });
}

export function useDuplicateMoodBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moodBoardId: string) => {
      const response = await apiClient.post(`/mood-boards/${moodBoardId}/duplicate`);
      return response.data.moodBoard;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['mood-boards', { projectId: d.projectId }] }),
  });
}
