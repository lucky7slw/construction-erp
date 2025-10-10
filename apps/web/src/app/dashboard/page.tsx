'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useEstimates } from '@/lib/query/hooks/use-estimates';
import { useDashboardStats } from '@/lib/query/hooks/use-dashboard';
import { useAuthStore } from '@/lib/store/auth-store';
import { useWebSocket } from '@/lib/websocket/provider';
import {
  FolderOpen,
  FileText,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Wifi,
  WifiOff,
  Users,
  Calendar,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isConnected } = useWebSocket();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: estimates, isLoading: estimatesLoading } = useEstimates();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const isLoading = projectsLoading || estimatesLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your projects today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? 'default' : 'secondary'} className="flex items-center gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              out of {stats?.totalProjects || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingEstimates || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.approvedEstimates || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalBudget || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Spent: {formatCurrency(stats?.totalSpent || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentActivity?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              updates today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Projects
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">View all</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!projects || projects.length === 0 ? (
                <div className="text-center py-6">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-muted-foreground">
                    No projects yet
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get started by creating your first project.
                  </p>
                  <div className="mt-6">
                    <Button asChild>
                      <Link href="/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between space-x-4 hover:bg-accent p-2 rounded-md transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {project.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Project
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/team">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/time">
                  <Clock className="mr-2 h-4 w-4" />
                  Track Time
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/reports">
                  <Building2 className="mr-2 h-4 w-4" />
                  View Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Agenda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Today&apos;s Agenda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">
              No events scheduled
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your schedule is clear for today.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}