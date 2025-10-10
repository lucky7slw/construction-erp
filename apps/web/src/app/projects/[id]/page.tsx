'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Hammer,
  Package,
  Target,
  Activity,
  ArrowRight,
  BarChart3,
  Wallet,
  ShoppingBag
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useBudgetSummary } from '@/lib/query/hooks/use-budget';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type StatusCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconBgColor?: string;
  href?: string;
};

function StatusCard({ title, value, subtitle, icon: Icon, trend, trendValue, iconBgColor = 'bg-blue-100', href }: StatusCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-full ${iconBgColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trendValue && (
          <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}

type ActivityItem = {
  id: string;
  type: 'task' | 'expense' | 'po' | 'milestone' | 'document';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

export default function ProjectHomePage() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: budgetData, isLoading: budgetLoading } = useBudgetSummary(projectId);

  // Calculate project metrics
  const budget = project?.budget || 0;
  const actualCost = budgetData?.summary?.totalActual || project?.actualCost || 0;
  const committed = budgetData?.summary?.totalCommitted || 0;
  const remaining = budget - actualCost - committed;
  const percentageUsed = budget > 0 ? ((actualCost + committed) / budget) * 100 : 0;

  // Calculate schedule progress
  const startDate = project?.startDate ? new Date(project.startDate) : null;
  const endDate = project?.endDate ? new Date(project.endDate) : null;
  const today = new Date();

  let scheduleProgress = 0;
  let daysRemaining = 0;
  if (startDate && endDate) {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    scheduleProgress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
    daysRemaining = Math.max(Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
  }

  // Mock activity data - in real app, this would come from API
  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'task',
      title: 'Framing completed',
      description: 'Main structure framing work completed ahead of schedule',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: 'John Smith',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      id: '2',
      type: 'po',
      title: 'PO #1025 approved',
      description: 'Windows & doors - $32,000',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      user: 'Sarah Johnson',
      icon: ShoppingBag,
      color: 'text-blue-500',
    },
    {
      id: '3',
      type: 'expense',
      title: 'Expense submitted',
      description: 'Concrete delivery - $28,000',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      user: 'Mike Davis',
      icon: DollarSign,
      color: 'text-orange-500',
    },
  ];

  if (projectLoading || budgetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Project Dashboard</h2>
          <p className="text-muted-foreground">Real-time overview of your construction project</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${projectId}/daily-logs`}>
            <Button variant="outline" size="sm">
              <Clock className="mr-2 h-4 w-4" />
              Daily Log
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/tasks`}>
            <Button size="sm">
              <Target className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics - Top Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Total Budget"
          value={formatCurrency(budget)}
          subtitle={`${percentageUsed.toFixed(1)}% utilized`}
          icon={Wallet}
          iconBgColor="bg-blue-100"
          href={`/projects/${projectId}/budget`}
        />

        <StatusCard
          title="Actual Cost"
          value={formatCurrency(actualCost)}
          subtitle={`${budget > 0 ? ((actualCost / budget) * 100).toFixed(1) : 0}% of budget`}
          icon={DollarSign}
          trend={actualCost > budget ? 'down' : 'up'}
          trendValue={actualCost > budget ? 'Over budget' : 'On track'}
          iconBgColor="bg-green-100"
          href={`/projects/${projectId}/financial-overview`}
        />

        <StatusCard
          title="Committed Funds"
          value={formatCurrency(committed)}
          subtitle="Outstanding POs"
          icon={ShoppingBag}
          iconBgColor="bg-purple-100"
          href={`/projects/${projectId}/purchase-orders`}
        />

        <StatusCard
          title="Budget Remaining"
          value={formatCurrency(remaining)}
          subtitle={remaining < 0 ? 'Over budget' : 'Available'}
          icon={remaining < 0 ? AlertCircle : CheckCircle}
          trend={remaining < 0 ? 'down' : 'up'}
          iconBgColor={remaining < 0 ? 'bg-red-100' : 'bg-green-100'}
        />
      </div>

      {/* Schedule & Progress Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Schedule</CardTitle>
            <CardDescription>Timeline progress and milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{scheduleProgress.toFixed(0)}%</span>
              </div>
              <Progress value={scheduleProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {startDate && endDate
                    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>

            {startDate && endDate && (
              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">{formatDate(startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">{formatDate(endDate)}</span>
                </div>
              </div>
            )}

            <Link href={`/projects/${projectId}/schedule`}>
              <Button variant="outline" className="w-full mt-4">
                <Calendar className="mr-2 h-4 w-4" />
                View Full Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Health</CardTitle>
            <CardDescription>Financial performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetData?.categoryBreakdown && (
              <>
                <div className="space-y-3">
                  {Object.entries(budgetData.categoryBreakdown).slice(0, 4).map(([category, data]: [string, any]) => {
                    const percent = data.budgeted > 0 ? (data.actual / data.budgeted) * 100 : 0;
                    const isOverBudget = data.actual > data.budgeted;

                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{category}</span>
                          <span className={`font-medium ${isOverBudget ? 'text-red-500' : ''}`}>
                            {formatCurrency(data.actual)} / {formatCurrency(data.budgeted)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(percent, 100)}
                          className={`h-1.5 ${isOverBudget ? 'bg-red-100' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <Link href={`/projects/${projectId}/budget`}>
                  <Button variant="outline" className="w-full mt-4">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Full Budget
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates and changes</CardDescription>
              </div>
              <Badge variant="secondary">{recentActivity.length} updates</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className={`flex-shrink-0 ${activity.color}`}>
                    <div className="p-2 rounded-full bg-gray-100">
                      <activity.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.user && (
                        <>
                          <Users className="h-3 w-3" />
                          <span>{activity.user}</span>
                          <span>•</span>
                        </>
                      )}
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="w-full mt-4">
              View All Activity
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/projects/${projectId}/tasks`}>
              <Button variant="outline" className="w-full justify-start">
                <Target className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/purchase-orders`}>
              <Button variant="outline" className="w-full justify-start">
                <ShoppingBag className="mr-2 h-4 w-4" />
                New Purchase Order
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/files`}>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/change-orders`}>
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                Submit Change Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Project Description */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}
