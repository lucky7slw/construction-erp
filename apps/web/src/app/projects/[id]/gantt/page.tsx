'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Circle, Timer, CheckCircle2, AlertCircle, GanttChart as GanttChartIcon } from 'lucide-react';
import { useTasks } from '@/lib/query/hooks/use-tasks';
import { formatDate, cn } from '@/lib/utils';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const statusConfig = {
  TODO: { label: 'To Do', icon: Circle, color: 'bg-gray-400' },
  IN_PROGRESS: { label: 'In Progress', icon: Timer, color: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-500' },
};

const priorityConfig = {
  LOW: { label: 'Low', color: 'bg-gray-200 text-gray-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-200 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-200 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-red-200 text-red-700' },
};

export default function GanttPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const { data: tasks = [], isLoading } = useTasks({ projectId });

  // Filter tasks with dates and calculate gantt data
  const ganttData = React.useMemo(() => {
    const tasksWithDates = tasks.filter((t: any) => t.startDate && t.dueDate);
    
    if (tasksWithDates.length === 0) {
      return null;
    }

    const dates = tasksWithDates.flatMap((t: any) => [new Date(t.startDate), new Date(t.dueDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { tasksWithDates, minDate, maxDate, totalDays };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!ganttData) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <GanttChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No tasks with dates to display</p>
              <p className="text-sm">Add start and due dates to your tasks to see them on the Gantt chart</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gantt Chart</h1>
        <div className="flex gap-2">
          {Object.entries(statusConfig).map(([key, config]) => (
            <Badge key={key} variant="outline" className="gap-1">
              <div className={`w-3 h-3 rounded ${config.color}`} />
              {config.label}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ganttData.minDate.toLocaleDateString()} - {ganttData.maxDate.toLocaleDateString()} ({ganttData.totalDays} days)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline header */}
            <div className="flex text-xs text-muted-foreground border-b pb-2">
              <div className="w-64">Task</div>
              <div className="flex-1 flex justify-between px-2">
                <span>{ganttData.minDate.toLocaleDateString()}</span>
                <span>{ganttData.maxDate.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Tasks */}
            {ganttData.tasksWithDates.map((task: any) => {
              const startDate = new Date(task.startDate);
              const endDate = new Date(task.dueDate);
              const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const width = Math.max((duration / ganttData.totalDays) * 100, 2);
              const offset = Math.ceil((startDate.getTime() - ganttData.minDate.getTime()) / (1000 * 60 * 60 * 24));
              const offsetPercent = (offset / ganttData.totalDays) * 100;
              const config = statusConfig[task.status as TaskStatus] || statusConfig.TODO;

              return (
                <div key={task.id} className="flex items-center hover:bg-muted/50 p-2 rounded">
                  <div className="w-64 pr-4">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className={cn("text-xs", priorityConfig[task.priority as TaskPriority].color)}>
                        {priorityConfig[task.priority as TaskPriority].label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      {task.assignee && <span>{task.assignee.firstName} {task.assignee.lastName}</span>}
                    </div>
                  </div>
                  <div className="flex-1 relative h-10 bg-muted/30 rounded">
                    <div
                      className={`absolute h-6 top-2 rounded ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
                      style={{
                        left: `${offsetPercent}%`,
                        width: `${width}%`,
                      }}
                      title={`${task.title}\n${formatDate(startDate)} - ${formatDate(endDate)}\nStatus: ${config.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
