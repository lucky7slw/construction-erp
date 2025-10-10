import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  type BudgetSummary,
  type BudgetLineItem,
  type CreateBudgetLineItemRequest,
  type UpdateBudgetLineItemRequest
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

// Query keys
export const budgetKeys = {
  all: ['budget'] as const,
  summaries: () => [...budgetKeys.all, 'summary'] as const,
  summary: (projectId: string) => [...budgetKeys.summaries(), projectId] as const,
  lineItems: () => [...budgetKeys.all, 'lineItems'] as const,
  lineItemsForProject: (projectId: string) => [...budgetKeys.lineItems(), projectId] as const,
};

// Custom hooks for budget
export function useBudgetSummary(projectId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: budgetKeys.summary(projectId),
    queryFn: async () => {
      return await apiClient.getBudgetSummary(projectId);
    },
    enabled: isAuthenticated && !!projectId,
  });
}

export function useBudgetLineItems(projectId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: budgetKeys.lineItemsForProject(projectId),
    queryFn: async () => {
      const response = await apiClient.getBudgetLineItems(projectId);
      return response.budgetLines || [];
    },
    enabled: isAuthenticated && !!projectId,
  });
}

export function useCreateBudgetLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBudgetLineItemRequest) => {
      const response = await apiClient.createBudgetLineItem(data);
      return response.budgetLine;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItemsForProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(variables.projectId) });
    },
  });
}

export function useUpdateBudgetLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: string; projectId: string; data: UpdateBudgetLineItemRequest }) => {
      const response = await apiClient.updateBudgetLineItem(id, data);
      return response.budgetLine;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItemsForProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(variables.projectId) });
    },
  });
}

export function useDeleteBudgetLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await apiClient.deleteBudgetLineItem(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItemsForProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(variables.projectId) });
    },
  });
}
