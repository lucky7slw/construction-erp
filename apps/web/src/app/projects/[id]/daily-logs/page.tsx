'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Users,
  Package,
  Truck,
  AlertTriangle,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Clock,
  ChevronRight,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useDailyLogs, useCreateDailyLog, useUpdateDailyLog, useDeleteDailyLog, type DailyLog } from '@/lib/query/hooks/use-daily-logs';
import { DailyLogForm } from '@/components/forms/daily-log-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type WeatherDisplay = {
  temp?: number;
  conditions?: string;
  rain?: boolean;
  wind?: string;
};

export default function DailyLogsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [dateRange, setDateRange] = React.useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<DailyLog | null>(null);

  const { data: logs = [], isLoading } = useDailyLogs({
    projectId,
    ...dateRange,
  });

  const createLog = useCreateDailyLog();
  const updateLog = useUpdateDailyLog();
  const deleteLog = useDeleteDailyLog();

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalDays = logs.length;
    const totalCrew = logs.reduce((sum, log) => sum + (log._count?.crewPresent || 0), 0);
    const totalDeliveries = logs.reduce((sum, log) => sum + (log._count?.deliveries || 0), 0);
    const totalEquipment = logs.reduce((sum, log) => sum + (log._count?.equipmentUsed || 0), 0);
    const totalIncidents = logs.reduce((sum, log) => sum + (log._count?.incidents || 0), 0);

    return {
      totalDays,
      totalCrew,
      totalDeliveries,
      totalEquipment,
      totalIncidents,
    };
  }, [logs]);

  const handleCreateSubmit = async (data: any) => {
    try {
      await createLog.mutateAsync({
        projectId,
        date: new Date(data.date),
        weather: {
          temp: data.weatherTemp ? parseFloat(data.weatherTemp) : undefined,
          conditions: data.weatherConditions || undefined,
          rain: data.weatherRain !== 'no',
          wind: data.weatherWind || undefined,
        },
        workCompleted: data.workCompleted,
        notes: data.notes,
      });
      toast({
        title: 'Success',
        description: 'Daily log created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create daily log',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedLog) return;
    try {
      await updateLog.mutateAsync({
        id: selectedLog.id,
        data: {
          weather: {
            temp: data.weatherTemp ? parseFloat(data.weatherTemp) : undefined,
            conditions: data.weatherConditions || undefined,
            rain: data.weatherRain !== 'no',
            wind: data.weatherWind || undefined,
          },
          workCompleted: data.workCompleted,
          notes: data.notes,
        },
      });
      toast({
        title: 'Success',
        description: 'Daily log updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedLog(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update daily log',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedLog) return;
    try {
      await deleteLog.mutateAsync(selectedLog.id);
      toast({
        title: 'Success',
        description: 'Daily log deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedLog(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete daily log',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
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
          <h2 className="text-3xl font-bold tracking-tight">Daily Logs</h2>
          <p className="text-muted-foreground">Track daily site activities, crew, and incidents</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Daily Log
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Crew Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalCrew}</div>
            <p className="text-xs text-muted-foreground mt-1">Total attendance entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">Materials received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalEquipment}</div>
            <p className="text-xs text-muted-foreground mt-1">Usage entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.totalIncidents > 0 ? "text-red-600" : "text-gray-400"
            )}>
              {stats.totalIncidents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Safety reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Activity Logs</CardTitle>
              <CardDescription>{logs.length} days logged</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Filter by Date
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No daily logs found</p>
                <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Log
                </Button>
              </div>
            ) : (
              logs.map((log) => {
                const weather = log.weather as WeatherDisplay;
                const hasIncidents = (log._count?.incidents || 0) > 0;

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "border rounded-lg p-4 hover:bg-accent transition-colors",
                      hasIncidents && "border-red-200 bg-red-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      {/* Left side - Date and Summary */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {formatDate(new Date(log.date))}
                            </h3>
                            {log.createdBy && (
                              <p className="text-xs text-muted-foreground">
                                by {log.createdBy.firstName} {log.createdBy.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Weather */}
                        {weather && (
                          <div className="flex items-center gap-4 mb-3 text-sm">
                            {weather.temp !== undefined && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Thermometer className="h-4 w-4" />
                                <span>{weather.temp}°F</span>
                              </div>
                            )}
                            {weather.conditions && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                {weather.rain ? (
                                  <CloudRain className="h-4 w-4" />
                                ) : (
                                  <Cloud className="h-4 w-4" />
                                )}
                                <span>{weather.conditions}</span>
                              </div>
                            )}
                            {weather.wind && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Wind className="h-4 w-4" />
                                <span>{weather.wind}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Work Completed */}
                        {log.workCompleted && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Work Completed</p>
                            <p className="text-sm">{log.workCompleted}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {log.notes && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm text-muted-foreground">{log.notes}</p>
                          </div>
                        )}

                        {/* Activity Summary */}
                        <div className="flex items-center gap-4 mt-3">
                          {log._count && (
                            <>
                              {log._count.crewPresent > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Users className="h-3 w-3 text-blue-500" />
                                  <span className="font-medium">{log._count.crewPresent}</span>
                                  <span className="text-muted-foreground">crew</span>
                                </div>
                              )}
                              {log._count.deliveries > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Truck className="h-3 w-3 text-green-500" />
                                  <span className="font-medium">{log._count.deliveries}</span>
                                  <span className="text-muted-foreground">deliveries</span>
                                </div>
                              )}
                              {log._count.equipmentUsed > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Package className="h-3 w-3 text-purple-500" />
                                  <span className="font-medium">{log._count.equipmentUsed}</span>
                                  <span className="text-muted-foreground">equipment</span>
                                </div>
                              )}
                              {log._count.incidents > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                  <span className="font-medium text-red-600">{log._count.incidents}</span>
                                  <span className="text-red-600">incidents</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setEditDialogOpen(true);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Photos */}
                    {log.photos && log.photos.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          {log.photos.length} photo{log.photos.length > 1 ? 's' : ''} attached
                        </p>
                        {/* Photo thumbnails would go here */}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Daily Log Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Daily Log</DialogTitle>
            <DialogDescription>Record today's site activities, weather, and progress</DialogDescription>
          </DialogHeader>
          <DailyLogForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createLog.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Daily Log Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Daily Log</DialogTitle>
            <DialogDescription>Update daily log details</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <DailyLogForm
              projectId={projectId}
              initialData={{
                date: new Date(selectedLog.date).toISOString().split('T')[0],
                weatherTemp: selectedLog.weather?.temp?.toString() || '',
                weatherConditions: selectedLog.weather?.conditions || '',
                weatherRain: selectedLog.weather?.rain ? 'moderate' : 'no',
                weatherWind: selectedLog.weather?.wind || '',
                workCompleted: selectedLog.workCompleted || '',
                notes: selectedLog.notes || '',
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedLog(null);
              }}
              isLoading={updateLog.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Daily Log Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Daily Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the daily log for {selectedLog && formatDate(new Date(selectedLog.date))}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedLog(null);
              }}
              disabled={deleteLog.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLog.isPending}
            >
              {deleteLog.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Daily Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
