import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type Submittal = {
  id: string;
  submittalNumber: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'SHOP_DRAWING' | 'PRODUCT_DATA' | 'SAMPLE' | 'MOCK_UP' | 'TEST_REPORT' | 'CERTIFICATION' | 'WARRANTY' | 'OTHER';
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED' | 'RESUBMIT_REQUIRED';
  specSection?: string;
  drawingReference?: string;
  revision: number;
  submittedBy: string;
  submittedDate?: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  dueDate?: Date;
  requiredOnSite?: Date;
  manufacturer?: string;
  model?: string;
  comments?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
};

export function useSubmittals(params: {
  projectId: string;
  status?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ['submittals', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ projectId: params.projectId });
      if (params.status) searchParams.append('status', params.status);
      if (params.type) searchParams.append('type', params.type);

      const response = await apiClient.get(`/submittals?${searchParams.toString()}`);
      return response.data.submittals as Submittal[];
    },
  });
}

export function useSubmittal(id: string) {
  return useQuery({
    queryKey: ['submittal', id],
    queryFn: async () => {
      const response = await apiClient.get(`/submittals/${id}`);
      return response.data.submittal as Submittal;
    },
    enabled: !!id,
  });
}

export function useCreateSubmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      title: string;
      type: string;
      description?: string;
      specSection?: string;
      drawingReference?: string;
      dueDate?: Date;
      manufacturer?: string;
      model?: string;
    }) => {
      const response = await apiClient.post('/submittals', {
        ...data,
        dueDate: data.dueDate?.toISOString(),
      });
      return response.data.submittal as Submittal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submittals', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateSubmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        status?: string;
        comments?: string;
      };
    }) => {
      const response = await apiClient.patch(`/submittals/${id}`, data);
      return response.data.submittal as Submittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submittal', data.id] });
      queryClient.invalidateQueries({ queryKey: ['submittals', { projectId: data.projectId }] });
    },
  });
}

export function useDeleteSubmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/submittals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
    },
  });
}
