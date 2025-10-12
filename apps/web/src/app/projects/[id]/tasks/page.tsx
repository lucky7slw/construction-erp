'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Timer,
  ListTodo,
  LayoutList,
  GanttChart,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/lib/query/hooks/use-tasks';
import { TaskForm } from '@/components/forms/task-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ViewMode = 'list' | 'kanban' | 'gantt';

const statusConfig = {
  TODO: { label: 'To Do', icon: Circle, color: 'text-gray-500 bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', icon: Timer, color: 'text-blue-500 bg-blue-100' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  CANCELLED: { label: 'Cancelled', icon: AlertCircle, color: 'text-red-500 bg-red-100' },
};

const priorityConfig = {
  LOW: { label: 'Low', color: 'bg-gray-200 text-gray-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-200 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-200 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-red-200 text-red-700' },
};

export default function TasksPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'ALL'>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  const { data: tasks = [], isLoading } = useTasks({ projectId });
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task: any) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter((t: any) => t.status === 'TODO').length;
    const overdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;

    return { total, completed, inProgress, todo, overdue };
  }, [tasks]);

  // Gantt chart data
  const ganttData = React.useMemo(() => {
    const tasksWithDates = filteredTasks.filter((t: any) => t.startDate && t.dueDate);
    
    if (tasksWithDates.length === 0) {
      return null;
    }

    const dates = tasksWithDates.flatMap((t: any) => [new Date(t.startDate), new Date(t.dueDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { tasksWithDates, minDate, maxDate, totalDays };
  }, [filteredTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask.mutateAsync({
      id: taskId,
      data: { status: newStatus },
    });
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      await createTask.mutateAsync({ projectId, ...payload });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedTask) return;
    try {
      console.log('Form data received:', data);
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      console.log('Payload being sent to API:', payload);
      await updateTask.mutateAsync({ id: selectedTask.id, data: payload });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedTask(null);
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;
    try {
      await deleteTask.mutateAsync(selectedTask.id);
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedTask(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Tasks & Checklist</h2>
          <p className="text-muted-foreground">Manage and track project tasks</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-none border-x"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'gantt' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('gantt')}
              className="rounded-l-none"
            >
              <GanttChart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
            <CardDescription>{filteredTasks.length} tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found</p>
                  <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Task
                  </Button>
                </div>
              ) : (
                filteredTasks.map((task: any) => {
                  const StatusIcon = statusConfig[task.status as TaskStatus].icon;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const newStatus = task.status === 'COMPLETED' ? 'TODO' :
                                          task.status === 'TODO' ? 'IN_PROGRESS' : 'COMPLETED';
                          handleStatusChange(task.id, newStatus);
                        }}
                      >
                        <StatusIcon className={cn('h-5 w-5', statusConfig[task.status as TaskStatus].color.split(' ')[0])} />
                      </Button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          <Badge className={priorityConfig[task.priority as TaskPriority].color} variant="secondary">
                            {priorityConfig[task.priority as TaskPriority].label}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <div className={cn('flex items-center gap-1', isOverdue && 'text-red-500 font-medium')}>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(new Date(task.dueDate))}</span>
                              {isOverdue && <span className="ml-1">(Overdue)</span>}
                            </div>
                          )}
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{task.assignee.firstName} {task.assignee.lastName}</span>
                            </div>
                          )}
                          {task.estimatedHours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{task.estimatedHours}h est.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Badge className={statusConfig[task.status as TaskStatus].color}>
                        {statusConfig[task.status as TaskStatus].label}
                      </Badge>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TaskStatus[]).map((status) => {
            const statusTasks = filteredTasks.filter((t: any) => t.status === status);
            const StatusIcon = statusConfig[status].icon;

            return (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn('h-4 w-4', statusConfig[status].color.split(' ')[0])} />
                      <CardTitle className="text-sm">{statusConfig[status].label}</CardTitle>
                    </div>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statusTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks</p>
                  ) : (
                    statusTasks.map((task: any) => (
                      <div key={task.id} className="p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedTask(task);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedTask(task);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={cn("text-xs", priorityConfig[task.priority as TaskPriority].color)}>
                            {priorityConfig[task.priority as TaskPriority].label}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(new Date(task.dueDate))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'gantt' && (
        <Card>
          <CardHeader>
            <CardTitle>Gantt Chart</CardTitle>
            <CardDescription>Timeline view of all tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {!ganttData ? (
              <div className="text-center py-12 text-muted-foreground">
                <GanttChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No tasks with dates to display</p>
                <p className="text-sm">Add start and due dates to your tasks to see them on the Gantt chart</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline info */}
                <div className="text-sm text-muted-foreground">
                  {ganttData.minDate.toLocaleDateString()} - {ganttData.maxDate.toLocaleDateString()} ({ganttData.totalDays} days)
                </div>

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
                  const config = statusConfig[task.status as TaskStatus];

                  return (
                    <div key={task.id} className="flex items-center hover:bg-muted/50 p-2 rounded">
                      <div className="w-64 pr-4">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className={cn("text-xs", priorityConfig[task.priority as TaskPriority].color)}>
                            {priorityConfig[task.priority as TaskPriority].label}
                          </Badge>
                          <span>{config.label}</span>
                        </div>
                      </div>
                      <div className="flex-1 relative h-10 bg-muted/30 rounded">
                        <div
                          className={cn(
                            'absolute h-6 top-2 rounded cursor-pointer hover:opacity-80 transition-opacity',
                            config.color.split(' ')[1]
                          )}
                          style={{
                            left: `${offsetPercent}%`,
                            width: `${width}%`,
                          }}
                          title={`${task.title}\n${formatDate(new Date(task.startDate))} - ${formatDate(new Date(task.dueDate))}\nStatus: ${config.label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to this project</DialogDescription>
          </DialogHeader>
          <TaskForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createTask.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <>
              {console.log('Selected task for editing:', selectedTask)}
              <TaskForm
                projectId={projectId}
                initialData={{
                  title: selectedTask.title,
                  description: selectedTask.description,
                  status: selectedTask.status,
                  priority: selectedTask.priority,
                  startDate: selectedTask.startDate,
                  dueDate: selectedTask.dueDate,
                  estimatedHours: selectedTask.estimatedHours,
                  assigneeId: selectedTask.assigneeId,
                }}
                onSubmit={handleUpdateSubmit}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setSelectedTask(null);
                }}
                isLoading={updateTask.isPending}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedTask(null);
              }}
              disabled={deleteTask.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
