'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Calendar,
  Flag,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
  Users,
} from 'lucide-react';
import { useTasks } from '@/lib/query/hooks/use-tasks';
import { useProject } from '@/lib/query/hooks/use-projects';
import { formatDate, cn } from '@/lib/utils';

type TimeScale = 'day' | 'week' | 'month';
type GanttTask = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
  isMilestone: boolean;
  assignees?: any[];
  dependencies?: string[];
  progress: number;
};

const statusConfig = {
  TODO: { label: 'To Do', icon: Circle, color: 'text-gray-500 bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', icon: Timer, color: 'text-blue-500 bg-blue-100' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  CANCELLED: { label: 'Cancelled', icon: AlertCircle, color: 'text-red-500 bg-red-100' },
};

export default function GanttPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [timeScale, setTimeScale] = React.useState<TimeScale>('week');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [showMilestonesOnly, setShowMilestonesOnly] = React.useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ projectId });

  // Process tasks into Gantt format
  const ganttTasks = React.useMemo(() => {
    return tasks
      .filter((task: any) => task.startDate && task.dueDate)
      .filter((task: any) => !showMilestonesOnly || task.isMilestone)
      .map((task: any) => ({
        id: task.id,
        title: task.title,
        startDate: new Date(task.startDate),
        endDate: new Date(task.dueDate),
        status: task.status,
        isMilestone: task.isMilestone,
        assignees: task.assignees,
        dependencies: task.dependencies,
        progress: task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0,
      })) as GanttTask[];
  }, [tasks, showMilestonesOnly]);

  // Calculate date range for Gantt chart
  const dateRange = React.useMemo(() => {
    if (ganttTasks.length === 0) {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }

    const allDates = ganttTasks.flatMap((task) => [task.startDate, task.endDate]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [ganttTasks]);

  // Generate time periods based on scale
  const timePeriods = React.useMemo(() => {
    const periods: { date: Date; label: string }[] = [];
    const current = new Date(dateRange.start);
    const end = dateRange.end;

    while (current <= end) {
      periods.push({
        date: new Date(current),
        label:
          timeScale === 'day'
            ? `${current.getDate()}`
            : timeScale === 'week'
            ? `Week ${Math.ceil(current.getDate() / 7)}`
            : current.toLocaleDateString('en-US', { month: 'short' }),
      });

      if (timeScale === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (timeScale === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return periods;
  }, [dateRange, timeScale]);

  // Calculate task bar position and width
  const getTaskBarStyle = (task: GanttTask) => {
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const startOffset = Math.ceil(
      (task.startDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.ceil(
      (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  // Calculate critical path (simplified - tasks without dependencies)
  const criticalPath = React.useMemo(() => {
    return ganttTasks.filter((task) => !task.dependencies || task.dependencies.length === 0);
  }, [ganttTasks]);

  // Project timeline stats
  const projectStats = React.useMemo(() => {
    if (!project || ganttTasks.length === 0) return null;

    const today = new Date();
    const projectStart = dateRange.start;
    const projectEnd = dateRange.end;

    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(Math.ceil((projectEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
    const percentComplete = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);

    const onTrack = ganttTasks.filter((task) => {
      if (task.status === 'COMPLETED') return true;
      if (task.endDate < today && task.status !== 'COMPLETED') return false;
      return true;
    });

    const delayed = ganttTasks.filter((task) => {
      return task.endDate < today && task.status !== 'COMPLETED';
    });

    return {
      totalTasks: ganttTasks.length,
      totalDays,
      daysRemaining,
      percentComplete,
      onTrack: onTrack.length,
      delayed: delayed.length,
      milestones: ganttTasks.filter((t) => t.isMilestone).length,
      criticalPath: criticalPath.length,
    };
  }, [project, ganttTasks, dateRange, criticalPath]);

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const zoomIn = () => {
    if (timeScale === 'month') setTimeScale('week');
    else if (timeScale === 'week') setTimeScale('day');
  };

  const zoomOut = () => {
    if (timeScale === 'day') setTimeScale('week');
    else if (timeScale === 'week') setTimeScale('month');
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gantt Chart</h2>
          <p className="text-muted-foreground">Project timeline and dependencies visualization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMilestonesOnly(!showMilestonesOnly)}>
            <Flag className="mr-2 h-4 w-4" />
            {showMilestonesOnly ? 'All Tasks' : 'Milestones Only'}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {projectStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectStats.totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.milestones} milestones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectStats.totalDays} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.daysRemaining} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectStats.percentComplete.toFixed(0)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${projectStats.percentComplete}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{projectStats.onTrack}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.delayed > 0 && (
                  <span className="text-red-600">{projectStats.delayed} delayed</span>
                )}
                {projectStats.delayed === 0 && <span>All on track</span>}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Timeline View</CardTitle>
              <CardDescription>
                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={zoomOut} disabled={timeScale === 'month'}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="outline">{timeScale}</Badge>
              <Button variant="ghost" size="sm" onClick={zoomIn} disabled={timeScale === 'day'}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ganttTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks with dates found</p>
              <Button className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add First Task
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Timeline header */}
                <div className="flex border-b">
                  <div className="w-64 flex-shrink-0 p-3 font-medium text-sm border-r bg-muted/50">
                    Task
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex h-12 items-center">
                      {timePeriods.map((period, index) => (
                        <div
                          key={index}
                          className="flex-1 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
                        >
                          {period.label}
                        </div>
                      ))}
                    </div>
                    {/* Today indicator */}
                    {(() => {
                      const today = new Date();
                      if (today >= dateRange.start && today <= dateRange.end) {
                        const totalDays = Math.ceil(
                          (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const offset = Math.ceil(
                          (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const left = (offset / totalDays) * 100;

                        return (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                            style={{ left: `${left}%` }}
                          >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs text-blue-600 font-medium whitespace-nowrap">
                              Today
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Task rows */}
                <div className="divide-y">
                  {ganttTasks.map((task) => {
                    const StatusIcon = statusConfig[task.status as keyof typeof statusConfig].icon;
                    const barStyle = getTaskBarStyle(task);
                    const isDelayed = task.endDate < new Date() && task.status !== 'COMPLETED';
                    const isCritical = criticalPath.some((t) => t.id === task.id);

                    return (
                      <div key={task.id} className="flex hover:bg-accent transition-colors">
                        <div className="w-64 flex-shrink-0 p-3 border-r">
                          <div className="flex items-start gap-2">
                            <StatusIcon className={cn('h-4 w-4 mt-0.5', statusConfig[task.status as keyof typeof statusConfig].color.split(' ')[0])} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {task.isMilestone && <Flag className="h-3 w-3 text-purple-500" />}
                                {isCritical && <AlertCircle className="h-3 w-3 text-orange-500" />}
                                <h4 className="font-medium text-sm truncate">{task.title}</h4>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(task.startDate)} - {formatDate(task.endDate)}
                                </p>
                                {task.assignees && task.assignees.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    {task.assignees.length}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 relative h-16 border-b">
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex">
                            {timePeriods.map((_, index) => (
                              <div key={index} className="flex-1 border-r last:border-r-0" />
                            ))}
                          </div>

                          {/* Task bar */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-8 rounded flex items-center px-2 cursor-pointer transition-all hover:opacity-80"
                            style={{
                              ...barStyle,
                              backgroundColor:
                                task.status === 'COMPLETED'
                                  ? '#22c55e'
                                  : task.status === 'IN_PROGRESS'
                                  ? '#3b82f6'
                                  : isDelayed
                                  ? '#ef4444'
                                  : '#94a3b8',
                            }}
                          >
                            {/* Progress bar */}
                            {task.status === 'IN_PROGRESS' && (
                              <div
                                className="absolute inset-0 bg-green-500 rounded opacity-50"
                                style={{ width: `${task.progress}%` }}
                              />
                            )}
                            <span className="text-xs font-medium text-white relative z-10 truncate">
                              {task.title}
                            </span>
                            {task.isMilestone && <Flag className="h-3 w-3 text-white ml-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-purple-500" />
              <span>Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span>Critical Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-blue-500" />
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
