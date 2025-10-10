import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useInvoices(params?: {
  companyId?: string;
  projectId?: string;
  customerId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const response = await apiClient.getInvoices(params);
      return response;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const response = await apiClient.getInvoice(id);
      return response.invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      companyId: string;
      customerId: string;
      projectId?: string;
      quoteId?: string;
      title: string;
      description?: string;
      taxRate?: number;
      dueDate: string;
      notes?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    }) => {
      const response = await apiClient.createInvoice(data);
      return response.invoice;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
      }
    },
  });
}

export function useUpdateInvoice() {
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
        dueDate?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.updateInvoice(id, data);
      return response.invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', data.id] });
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', data.projectId] });
      }
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteInvoice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.sendInvoice(id);
      return response.invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', data.id] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        amount: number;
        paymentMethod?: string;
        reference?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.recordPayment(id, data);
      return response.invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', data.id] });
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', data.projectId] });
      }
    },
  });
}
