import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

// Types
export type RFI = {
  id: string;
  rfiNumber: string;
  projectId: string;
  title: string;
  question: string;
  status: 'DRAFT' | 'OPEN' | 'ANSWERED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  discipline?: string;
  drawingReference?: string;
  specReference?: string;
  costImpact?: number;
  scheduleImpact?: number;
  submittedBy: string;
  submittedDate?: Date;
  assignedTo?: string;
  dueDate?: Date;
  answer?: string;
  answeredBy?: string;
  answeredDate?: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
};

// Hooks
export function useRFIs(params: {
  projectId: string;
  status?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: ['rfis', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        projectId: params.projectId,
      });

      if (params.status) {
        searchParams.append('status', params.status);
      }
      if (params.priority) {
        searchParams.append('priority', params.priority);
      }

      const response = await apiClient.get(`/rfis?${searchParams.toString()}`);
      return response.data.rfis as RFI[];
    },
  });
}

export function useRFI(id: string) {
  return useQuery({
    queryKey: ['rfi', id],
    queryFn: async () => {
      const response = await apiClient.get(`/rfis/${id}`);
      return response.data.rfi as RFI;
    },
    enabled: !!id,
  });
}

export function useCreateRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      title: string;
      question: string;
      priority?: string;
      discipline?: string;
      drawingReference?: string;
      specReference?: string;
      dueDate?: Date;
    }) => {
      const response = await apiClient.post('/rfis', {
        ...data,
        dueDate: data.dueDate?.toISOString(),
      });
      return response.data.rfi as RFI;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        question?: string;
        status?: string;
        priority?: string;
        answer?: string;
        assignedTo?: string;
      };
    }) => {
      const response = await apiClient.patch(`/rfis/${id}`, data);
      return response.data.rfi as RFI;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfi', data.id] });
      queryClient.invalidateQueries({ queryKey: ['rfis', { projectId: data.projectId }] });
    },
  });
}

export function useDeleteRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/rfis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
    },
  });
}
