'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  CheckCircle2,
  Circle,
  AlertCircle,
  Timer,
  LayoutList,
  CalendarDays,
} from 'lucide-react';
import { useTasks, useCreateTask } from '@/lib/query/hooks/use-tasks';
import { useProject } from '@/lib/query/hooks/use-projects';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type ViewMode = 'month' | 'week' | 'list';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const statusConfig = {
  TODO: { label: 'To Do', icon: Circle, color: 'text-gray-500 bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', icon: Timer, color: 'text-blue-500 bg-blue-100' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  CANCELLED: { label: 'Cancelled', icon: AlertCircle, color: 'text-red-500 bg-red-100' },
};

export default function SchedulePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [viewMode, setViewMode] = React.useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const router = useRouter();
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ projectId });

  // Filter tasks with dates
  const tasksWithDates = React.useMemo(() => {
    return tasks.filter((task: any) => task.dueDate || task.startDate);
  }, [tasks]);

  // Get calendar days for current month
  const calendarDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  // Get tasks for a specific day
  const getTasksForDay = (date: Date) => {
    return tasksWithDates.filter((task: any) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : task.startDate ? new Date(task.startDate) : null;
      if (!taskDate) return false;

      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddMilestone = () => {
    router.push(`/projects/${projectId}/tasks`);
    toast({
      title: 'Info',
      description: 'Navigate to Tasks page to add a new milestone task',
    });
  };

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!project) return null;

    const startDate = project.startDate ? new Date(project.startDate) : null;
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const today = new Date();

    if (!startDate || !endDate) return null;

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
    const percentComplete = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);

    const milestones = tasks.filter((t: any) => t.isMilestone);
    const milestonesCompleted = milestones.filter((t: any) => t.status === 'COMPLETED').length;

    return {
      startDate,
      endDate,
      totalDays,
      daysRemaining,
      percentComplete,
      milestones: milestones.length,
      milestonesCompleted,
    };
  }, [project, tasks]);

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
          <h2 className="text-3xl font-bold tracking-tight">Project Schedule</h2>
          <p className="text-muted-foreground">Timeline, milestones, and task calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button onClick={handleAddMilestone}>
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Project Timeline Stats */}
      {projectStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Project Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectStats.totalDays} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(projectStats.startDate)} - {formatDate(projectStats.endDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{projectStats.daysRemaining}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.percentComplete.toFixed(0)}% complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {projectStats.milestonesCompleted}/{projectStats.milestones}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{tasksWithDates.length}</div>
              <p className="text-xs text-muted-foreground mt-1">With due dates</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-r-none"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-center font-medium text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-24 border rounded-lg bg-muted/20" />;
                }

                const dayTasks = getTasksForDay(date);
                const isToday =
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "min-h-24 border rounded-lg p-2 hover:bg-accent transition-colors",
                      isToday && "border-blue-500 bg-blue-50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-blue-600"
                    )}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task: any) => (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs p-1 rounded truncate",
                            task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          )}
                          title={task.title}
                        >
                          {task.isMilestone && <Flag className="inline h-3 w-3 mr-1" />}
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {tasksWithDates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled tasks</p>
                </div>
              ) : (
                tasksWithDates
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.dueDate || a.startDate).getTime();
                    const dateB = new Date(b.dueDate || b.startDate).getTime();
                    return dateA - dateB;
                  })
                  .map((task: any) => {
                    const StatusIcon = statusConfig[task.status as keyof typeof statusConfig].icon;
                    const dueDate = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate);
                    const isOverdue = dueDate < new Date() && task.status !== 'COMPLETED';

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <StatusIcon className={cn('h-5 w-5', statusConfig[task.status as keyof typeof statusConfig].color.split(' ')[0])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {task.isMilestone && (
                              <Flag className="h-4 w-4 text-purple-500" />
                            )}
                            <h4 className="font-medium truncate">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                          )}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 text-sm",
                          isOverdue && "text-red-500 font-medium"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(dueDate)}</span>
                          {isOverdue && <span>(Overdue)</span>}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
