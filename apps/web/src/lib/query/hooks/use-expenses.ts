import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useExpenses(params?: {
  projectId?: string;
  category?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  billable?: string;
}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const response = await apiClient.getExpenses(params);
      return response;
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const response = await apiClient.getExpense(id);
      return response.expense;
    },
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      description: string;
      amount: number;
      category?: string;
      date: string;
      receipt?: string;
      billable?: boolean;
      reimbursable?: boolean;
      projectId?: string;
      supplierId?: string;
      autoCategorize?: boolean;
    }) => {
      const response = await apiClient.createExpense(data);
      return response.expense;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
      }
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        description?: string;
        amount?: number;
        category?: string;
        date?: string;
        receipt?: string;
        billable?: boolean;
        reimbursable?: boolean;
      };
    }) => {
      const response = await apiClient.updateExpense(id, data);
      return response.expense;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', data.id] });
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['projects', data.projectId] });
      }
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deleteExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useCategorizeExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.categorizeExpense(id);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', data.expense.id] });
    },
  });
}
