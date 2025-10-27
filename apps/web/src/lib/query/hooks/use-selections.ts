import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type SelectionStatus = 'PENDING' | 'SELECTED' | 'APPROVED' | 'ORDERED' | 'INSTALLED' | 'REJECTED';
export type SelectionCategory = 'FLOORING' | 'CABINETS' | 'COUNTERTOPS' | 'APPLIANCES' | 'FIXTURES' | 'LIGHTING' | 'TILE' | 'PAINT' | 'HARDWARE' | 'OTHER';

export interface Selection {
  id: string;
  projectId: string;
  customerId?: string | null;
  category: SelectionCategory;
  name: string;
  description?: string | null;
  status: SelectionStatus;
  manufacturer?: string | null;
  model?: string | null;
  sku?: string | null;
  color?: string | null;
  finish?: string | null;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  totalPrice?: number | null;
  budgetAmount?: number | null;
  variance?: number | null;
  vendorName?: string | null;
  vendorContact?: string | null;
  leadTime?: number | null;
  dueDate?: Date | null;
  selectedDate?: Date | null;
  approvedDate?: Date | null;
  orderedDate?: Date | null;
  installedDate?: Date | null;
  notes?: string | null;
  imageUrls?: unknown;
  specSheetUrl?: string | null;
  approvedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function useSelections(params: { projectId: string; status?: SelectionStatus; category?: SelectionCategory; customerId?: string }) {
  return useQuery({
    queryKey: ['selections', params],
    queryFn: async () => {
      const sp = new URLSearchParams({ projectId: params.projectId });
      if (params.status) sp.append('status', params.status);
      if (params.category) sp.append('category', params.category);
      if (params.customerId) sp.append('customerId', params.customerId);
      const response = await apiClient.get(`/selections?${sp}`);
      return response.data.selections;
    },
  });
}

export function useSelection(id: string) {
  return useQuery({
    queryKey: ['selection', id],
    queryFn: async () => {
      const response = await apiClient.get(`/selections/${id}`);
      return response.data.selection;
    },
    enabled: !!id,
  });
}

export function useCreateSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/selections', { ...data, dueDate: data.dueDate?.toISOString() });
      return response.data.selection;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['selections', { projectId: v.projectId }] }),
  });
}

export function useUpdateSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/selections/${id}`, data);
      return response.data.selection;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['selection', d.id] });
      qc.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

export function useDeleteSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await apiClient.delete(`/selections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['selections'] }),
  });
}

export function useAddSelectionOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ selectionId, data }: { selectionId: string; data: any }) => {
      const response = await apiClient.post(`/selections/${selectionId}/options`, data);
      return response.data.option;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['selection', v.selectionId] }),
  });
}

export function useSelectOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ selectionId, optionId }: { selectionId: string; optionId: string }) => {
      const response = await apiClient.post(`/selections/${selectionId}/select-option`, { optionId });
      return response.data.selection;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['selection', d.id] });
      qc.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

export function useApproveSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (selectionId: string) => {
      const response = await apiClient.post(`/selections/${selectionId}/approve`);
      return response.data.selection;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['selection', d.id] });
      qc.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

export function useMarkSelectionOrdered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (selectionId: string) => {
      const response = await apiClient.post(`/selections/${selectionId}/order`);
      return response.data.selection;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['selection', d.id] });
      qc.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

export function useMarkSelectionInstalled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (selectionId: string) => {
      const response = await apiClient.post(`/selections/${selectionId}/install`);
      return response.data.selection;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['selection', d.id] });
      qc.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

export function useSelectionsSummary(projectId: string) {
  return useQuery({
    queryKey: ['selections-summary', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/selections-summary?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useOverdueSelections(projectId: string) {
  return useQuery({
    queryKey: ['selections-overdue', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/selections-overdue?projectId=${projectId}`);
      return response.data.overdue;
    },
    enabled: !!projectId,
  });
}

export function useExportSelections() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiClient.get(`/selections-export?projectId=${projectId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `selections-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return response.data;
    },
  });
}
