'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useEstimates } from '@/lib/query/hooks/use-estimates';
import { useTimeEntries } from '@/lib/query/hooks/use-time-entries';
import { useLeads } from '@/lib/query/hooks/use-leads';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('month');

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: estimates, isLoading: estimatesLoading } = useEstimates();
  const { data: timeEntries, isLoading: timeLoading } = useTimeEntries();
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const isLoading = projectsLoading || estimatesLoading || timeLoading || leadsLoading;

  // Calculate date range based on selected time range
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return { start: subMonths(now, 0.25), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'year':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const dateRange = getDateRange();

  // Project metrics
  const projectMetrics = React.useMemo(() => {
    if (!projects) return { total: 0, active: 0, completed: 0, onHold: 0, totalBudget: 0 };

    return {
      total: projects.length,
      active: projects.filter((p: any) => p.status === 'ACTIVE').length,
      completed: projects.filter((p: any) => p.status === 'COMPLETED').length,
      onHold: projects.filter((p: any) => p.status === 'ON_HOLD').length,
      totalBudget: projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0),
    };
  }, [projects]);

  // Estimate metrics
  const estimateMetrics = React.useMemo(() => {
    if (!estimates) return { total: 0, draft: 0, pending: 0, approved: 0, totalValue: 0, approvalRate: 0 };

    const total = estimates.length;
    const draft = estimates.filter((e: any) => e.status === 'DRAFT').length;
    const pending = estimates.filter((e: any) => e.status === 'PENDING').length;
    const approved = estimates.filter((e: any) => e.status === 'APPROVED').length;
    const totalValue = estimates.reduce((sum: number, e: any) => sum + (Number(e.totalAmount) || 0), 0);
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, draft, pending, approved, totalValue, approvalRate };
  }, [estimates]);

  // Time tracking metrics
  const timeMetrics = React.useMemo(() => {
    if (!timeEntries) return { totalHours: 0, billableHours: 0, approvedHours: 0, pendingHours: 0 };

    const filteredEntries = timeEntries.filter((entry: any) => {
      if (!entry.date) return false;
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, dateRange);
    });

    const totalHours = filteredEntries.reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
    const billableHours = filteredEntries
      .filter((e: any) => e.isBillable)
      .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
    const approvedHours = filteredEntries
      .filter((e: any) => e.status === 'APPROVED')
      .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
    const pendingHours = filteredEntries
      .filter((e: any) => e.status === 'PENDING')
      .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);

    return { totalHours, billableHours, approvedHours, pendingHours };
  }, [timeEntries, dateRange]);

  // CRM/Lead metrics
  const leadMetrics = React.useMemo(() => {
    if (!leads) return { total: 0, active: 0, won: 0, lost: 0, conversionRate: 0, pipelineValue: 0 };

    const total = leads.length;
    const active = leads.filter((l: any) => !['WON', 'LOST'].includes(l.status)).length;
    const won = leads.filter((l: any) => l.status === 'WON').length;
    const lost = leads.filter((l: any) => l.status === 'LOST').length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const pipelineValue = leads
      .filter((l: any) => !['WON', 'LOST'].includes(l.status))
      .reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0);

    return { total, active, won, lost, conversionRate, pipelineValue };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Insights and performance metrics across all modules
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estimateMetrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              From {estimateMetrics.total} estimates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectMetrics.active}</div>
            <p className="text-xs text-muted-foreground">
              {projectMetrics.total} total projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeMetrics.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {timeMetrics.billableHours.toFixed(1)}h billable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadMetrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {leadMetrics.won} won / {leadMetrics.total} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="crm">CRM Pipeline</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Project Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Active</span>
                  </div>
                  <span className="text-sm font-bold">{projectMetrics.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="text-sm font-bold">{projectMetrics.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">On Hold</span>
                  </div>
                  <span className="text-sm font-bold">{projectMetrics.onHold}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(projectMetrics.totalBudget)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total allocated budget
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectMetrics.total > 0
                    ? Math.round((projectMetrics.completed / projectMetrics.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {projectMetrics.completed} of {projectMetrics.total} completed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeMetrics.totalHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  This {timeRange}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeMetrics.billableHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {timeMetrics.totalHours > 0
                    ? Math.round((timeMetrics.billableHours / timeMetrics.totalHours) * 100)
                    : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Approved Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeMetrics.approvedHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ready for invoicing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeMetrics.pendingHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Estimates</span>
                  <span className="text-sm font-bold">{estimateMetrics.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approved</span>
                  <span className="text-sm font-bold text-green-600">{estimateMetrics.approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <span className="text-sm font-bold text-yellow-600">{estimateMetrics.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Draft</span>
                  <span className="text-sm font-bold text-gray-600">{estimateMetrics.draft}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Estimate Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(estimateMetrics.totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across all estimates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estimateMetrics.approvalRate}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Estimate approval success
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadMetrics.total}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {leadMetrics.active} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(leadMetrics.pipelineValue)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{leadMetrics.won}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Successful conversions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadMetrics.conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lead to customer
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Lead Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Leads</span>
                <span className="text-sm font-bold">{leadMetrics.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Won</span>
                <span className="text-sm font-bold text-green-600">{leadMetrics.won}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Lost</span>
                <span className="text-sm font-bold text-red-600">{leadMetrics.lost}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
