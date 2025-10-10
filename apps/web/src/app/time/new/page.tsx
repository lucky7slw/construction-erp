'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateTimeEntry } from '@/lib/query/hooks/use-time-entries';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useTasks } from '@/lib/query/hooks/use-tasks';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

const formSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  hours: z.number().positive('Hours must be greater than 0'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewTimeEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createTimeEntry = useCreateTimeEntry();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const { data: tasks, isLoading: tasksLoading } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
      taskId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: 0,
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        projectId: values.projectId || undefined,
        taskId: values.taskId || undefined,
        date: new Date(values.date).toISOString(),
        hours: values.hours,
        description: values.description || undefined,
      };

      await createTimeEntry.mutateAsync(payload);

      toast({
        title: 'Success',
        description: 'Time entry created successfully',
      });

      router.push('/time');
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
    form.setValue('projectId', value);
    form.setValue('taskId', '');
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/time">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Time Entry</h1>
          <p className="text-muted-foreground">
            Record time spent on projects and tasks
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Time Entry Details</CardTitle>
            <CardDescription>
              Fill in the details for your time entry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                  ) : !projects || projects.length === 0 ? (
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
              <Label htmlFor="taskId">Task</Label>
              <Select
                value={form.watch('taskId')}
                onValueChange={(value) => form.setValue('taskId', value)}
                disabled={!selectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedProjectId ? "Select a task (optional)" : "Select a project first"} />
                </SelectTrigger>
                <SelectContent>
                  {tasksLoading ? (
                    <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                  ) : !tasks || tasks.length === 0 ? (
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
              <p className="text-sm text-muted-foreground">
                Tasks are only available when a project is selected
              </p>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                placeholder="e.g., 8.5"
                {...form.register('hours', { valueAsNumber: true })}
              />
              {form.formState.errors.hours && (
                <p className="text-sm text-destructive">{form.formState.errors.hours.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Use decimal format (e.g., 1.5 for 1 hour 30 minutes)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What did you work on?"
                rows={4}
                {...form.register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/time">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createTimeEntry.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createTimeEntry.isPending ? 'Creating...' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
