import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects');
      return response.data.projects || [];
    },
  });
}
