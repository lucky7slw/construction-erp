import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface ProjectSettings {
  id: string;
  projectId: string;
  defaultMarkupPercent: number | null;
  defaultTaxRate: number | null;
  billableHourlyRate: number | null;
  currency: string;
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  weekStartDay: string;
  timezone: string;
  budgetAlertEnabled: boolean;
  budgetAlertThreshold: number;
  emailNotifications: boolean;
  defaultTaskPriority: string;
  autoAssignTasks: boolean;
  requireTaskApproval: boolean;
  requireDocumentApproval: boolean;
  maxFileUploadSizeMB: number;
  allowedFileTypes: string[] | null;
  quickBooksSync: boolean;
  googleCalendarSync: boolean;
  dateFormat: string;
  numberFormat: string;
  showCostToClient: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get project settings
export function useProjectSettings(projectId: string) {
  return useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${projectId}/settings`);
      return response.data.settings as ProjectSettings;
    },
    enabled: !!projectId,
  });
}

// Update project settings
export function useUpdateProjectSettings(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProjectSettings>) => {
      const response = await apiClient.put(`/projects/${projectId}/settings`, data);
      return response.data.settings as ProjectSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project-settings', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });
}

// Reset project settings to defaults
export function useResetProjectSettings(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/projects/${projectId}/settings/reset`, {});
      return response.data.settings as ProjectSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project-settings', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });
}
