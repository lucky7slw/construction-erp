'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Clock } from 'lucide-react';
import { useCreateTimeEntry } from '@/lib/query/hooks/use-time-entries';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useTasks } from '@/lib/query/hooks/use-tasks';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';

type TimerState = {
  isRunning: boolean;
  startTime: Date | null;
  projectId: string;
  taskId: string;
  description: string;
};

export function TimeTracker() {
  const { toast } = useToast();
  const createTimeEntry = useCreateTimeEntry();
  const { data: projects } = useProjects();

  const [timer, setTimer] = React.useState<TimerState>({
    isRunning: false,
    startTime: null,
    projectId: '',
    taskId: '',
    description: '',
  });

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const { data: tasks } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  const [elapsedTime, setElapsedTime] = React.useState<string>('0h 0m');

  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer.isRunning && timer.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - timer.startTime!.getTime();
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        setElapsedTime(`${hours}h ${minutes}m`);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.startTime]);

  const handleStart = () => {
    setTimer({
      ...timer,
      isRunning: true,
      startTime: new Date(),
    });
    setElapsedTime('0h 0m');
  };

  const handleStop = async () => {
    if (!timer.startTime) return;

    const now = new Date();
    const diff = now.getTime() - timer.startTime.getTime();
    const hours = diff / 1000 / 60 / 60;

    try {
      await createTimeEntry.mutateAsync({
        projectId: timer.projectId || undefined,
        taskId: timer.taskId || undefined,
        date: timer.startTime.toISOString(),
        hours: Number(hours.toFixed(2)),
        description: timer.description || undefined,
      });

      toast({
        title: 'Success',
        description: `Time entry created: ${hours.toFixed(2)} hours`,
      });

      setTimer({
        isRunning: false,
        startTime: null,
        projectId: '',
        taskId: '',
        description: '',
      });
      setSelectedProjectId('');
      setElapsedTime('0h 0m');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create time entry',
      });
    }
  };

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    setTimer({ ...timer, projectId: value, taskId: '' });
  };

  const handleTaskChange = (value: string) => {
    setTimer({ ...timer, taskId: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Time Tracker</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center py-6">
          <div className="text-5xl font-bold font-mono text-primary">
            {elapsedTime}
          </div>
          {timer.startTime && (
            <p className="text-sm text-muted-foreground mt-2">
              Started {formatDistanceToNow(timer.startTime, { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Project Selection */}
        <div className="space-y-2">
          <Label htmlFor="tracker-project">Project</Label>
          <Select
            value={timer.projectId}
            onValueChange={handleProjectChange}
            disabled={timer.isRunning}
          >
            <SelectTrigger id="tracker-project">
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {!projects || projects.length === 0 ? (
                <SelectItem value="no-projects" disabled>No projects available</SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Task Selection */}
        <div className="space-y-2">
          <Label htmlFor="tracker-task">Task</Label>
          <Select
            value={timer.taskId}
            onValueChange={handleTaskChange}
            disabled={timer.isRunning || !selectedProjectId}
          >
            <SelectTrigger id="tracker-task">
              <SelectValue placeholder={selectedProjectId ? "Select a task (optional)" : "Select a project first"} />
            </SelectTrigger>
            <SelectContent>
              {!tasks || tasks.length === 0 ? (
                <SelectItem value="no-tasks" disabled>No tasks available</SelectItem>
              ) : (
                tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="tracker-description">Description</Label>
          <Textarea
            id="tracker-description"
            placeholder="What are you working on?"
            rows={3}
            value={timer.description}
            onChange={(e) => setTimer({ ...timer, description: e.target.value })}
            disabled={timer.isRunning}
          />
        </div>

        {/* Start/Stop Button */}
        <div className="pt-2">
          {!timer.isRunning ? (
            <Button
              onClick={handleStart}
              className="w-full"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Timer
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              className="w-full"
              size="lg"
              variant="destructive"
              disabled={createTimeEntry.isPending}
            >
              <Square className="mr-2 h-5 w-5" />
              {createTimeEntry.isPending ? 'Saving...' : 'Stop & Save'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
