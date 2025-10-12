'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Task {
  id: string;
  title: string;
  startDate: Date;
  dueDate: Date;
  status: string;
  assignedTo?: { name: string };
}

interface GanttChartProps {
  projectId: string;
  accessToken: string | null;
}

export function GanttChart({ projectId, accessToken }: GanttChartProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks');
    }
  };

  const getTaskWidth = (start: Date, end: Date, totalDays: number) => {
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return (duration / totalDays) * 100;
  };

  const getTaskOffset = (start: Date, minDate: Date, totalDays: number) => {
    const offset = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return (offset / totalDays) * 100;
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tasks to display</p>
        </CardContent>
      </Card>
    );
  }

  const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.dueDate)]);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const statusColors: Record<string, string> = {
    TODO: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-500',
    COMPLETED: 'bg-green-500',
    BLOCKED: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline header */}
          <div className="flex text-xs text-muted-foreground border-b pb-2">
            <div className="w-48">Task</div>
            <div className="flex-1 flex justify-between px-2">
              <span>{minDate.toLocaleDateString()}</span>
              <span>{maxDate.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Tasks */}
          {tasks.map(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.dueDate);
            const width = getTaskWidth(start, end, totalDays);
            const offset = getTaskOffset(start, minDate, totalDays);

            return (
              <div key={task.id} className="flex items-center">
                <div className="w-48 pr-4">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.assignedTo?.name || 'Unassigned'}</p>
                </div>
                <div className="flex-1 relative h-8 bg-muted rounded">
                  <div
                    className={`absolute h-6 top-1 rounded ${statusColors[task.status] || 'bg-gray-400'}`}
                    style={{
                      left: `${offset}%`,
                      width: `${width}%`,
                    }}
                    title={`${task.title} (${task.status})`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
