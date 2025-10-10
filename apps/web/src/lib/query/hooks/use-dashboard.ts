import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth-store';
import { useProjects } from './use-projects';
import { useEstimates } from './use-estimates';

export type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  totalEstimates: number;
  pendingEstimates: number;
  approvedEstimates: number;
  totalBudget: number;
  totalSpent: number;
  recentActivity: Array<{
    id: string;
    type: 'project' | 'estimate' | 'task';
    action: string;
    timestamp: string;
    user?: string;
  }>;
};

export function useDashboardStats() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: projects } = useProjects();
  const { data: estimates } = useEstimates();

  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Calculate stats from existing data
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter((p) => p.status === 'ACTIVE').length || 0;

      const totalEstimates = estimates?.length || 0;
      const pendingEstimates = estimates?.filter((e) => e.status === 'PENDING').length || 0;
      const approvedEstimates = estimates?.filter((e) => e.status === 'APPROVED').length || 0;

      const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const totalSpent = projects?.reduce((sum, p) => sum + (p.actualCost || 0), 0) || 0;

      // Build recent activity from projects and estimates
      const recentActivity: DashboardStats['recentActivity'] = [];

      // Add recent projects
      if (projects) {
        projects.slice(0, 3).forEach((project) => {
          recentActivity.push({
            id: project.id,
            type: 'project',
            action: `Project "${project.name}" was created`,
            timestamp: project.createdAt,
          });
        });
      }

      // Add recent estimates
      if (estimates) {
        estimates.slice(0, 3).forEach((estimate) => {
          recentActivity.push({
            id: estimate.id,
            type: 'estimate',
            action: `Estimate "${estimate.title}" was ${estimate.status.toLowerCase()}`,
            timestamp: estimate.createdAt,
          });
        });
      }

      // Sort by timestamp
      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        totalProjects,
        activeProjects,
        totalEstimates,
        pendingEstimates,
        approvedEstimates,
        totalBudget,
        totalSpent,
        recentActivity: recentActivity.slice(0, 5),
      };
    },
    enabled: isAuthenticated && (!!projects || !!estimates),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
