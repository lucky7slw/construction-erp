'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Layout,
  Upload,
  Layers,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProject } from '@/lib/query/hooks/use-projects';
import {
  useTakeoffs,
  useCreateTakeoff,
  useUpdateTakeoff,
  useDeleteTakeoff,
  useDuplicateTakeoff,
  type Takeoff,
} from '@/lib/query/hooks/use-takeoffs';
import { TakeoffForm } from '@/components/forms/takeoff-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type TakeoffStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', icon: Layers, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-green-500 bg-green-100', badge: 'default' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-purple-500 bg-purple-100', badge: 'default' },
};

export default function TakeoffsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<TakeoffStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedTakeoff, setSelectedTakeoff] = React.useState<Takeoff | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: takeoffs = [], isLoading: takeoffsLoading } = useTakeoffs({
    projectId,
    status: selectedStatus || undefined,
  });

  const createTakeoff = useCreateTakeoff();
  const updateTakeoff = useUpdateTakeoff();
  const deleteTakeoff = useDeleteTakeoff();
  const duplicateTakeoff = useDuplicateTakeoff();

  // Filter takeoffs
  const filteredTakeoffs = React.useMemo(() => {
    return takeoffs.filter((takeoff) => {
      const matchesSearch =
        !searchQuery ||
        takeoff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (takeoff.description && takeoff.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [takeoffs, searchQuery]);

  // Calculate takeoff stats
  const takeoffStats = React.useMemo(() => {
    const byStatus = takeoffs.reduce((acc, takeoff) => {
      acc[takeoff.status] = (acc[takeoff.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalLayers = takeoffs.reduce((sum, t) => sum + (t.layers?.length || 0), 0);
    const totalMeasurements = takeoffs.reduce((sum, t) => sum + (t.measurements?.length || 0), 0);

    return {
      total: takeoffs.length,
      draft: byStatus.DRAFT || 0,
      inProgress: byStatus.IN_PROGRESS || 0,
      completed: byStatus.COMPLETED || 0,
      approved: byStatus.APPROVED || 0,
      totalLayers,
      totalMeasurements,
    };
  }, [takeoffs]);

  const handleCreateSubmit = async (data: any) => {
    try {
      await createTakeoff.mutateAsync({
        projectId,
        name: data.name,
        description: data.description,
        estimateId: data.estimateId,
        drawingReference: data.drawingReference,
        scale: data.scale ? parseFloat(data.scale) : undefined,
        unit: data.unit,
      });
      toast({
        title: 'Success',
        description: 'Takeoff created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create takeoff',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedTakeoff) return;
    try {
      await updateTakeoff.mutateAsync({
        id: selectedTakeoff.id,
        data: {
          name: data.name,
          description: data.description,
          status: data.status,
          drawingReference: data.drawingReference,
          scale: data.scale ? parseFloat(data.scale) : undefined,
          unit: data.unit,
        },
      });
      toast({
        title: 'Success',
        description: 'Takeoff updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedTakeoff(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update takeoff',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (takeoff: Takeoff) => {
    try {
      await duplicateTakeoff.mutateAsync({
        takeoffId: takeoff.id,
        name: `${takeoff.name} (Copy)`,
      });
      toast({
        title: 'Success',
        description: 'Takeoff duplicated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate takeoff',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedTakeoff) return;
    try {
      await deleteTakeoff.mutateAsync(selectedTakeoff.id);
      toast({
        title: 'Success',
        description: 'Takeoff deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedTakeoff(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete takeoff',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || takeoffsLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Takeoffs</h2>
          <p className="text-muted-foreground">Digital plan measurements and material takeoffs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Plans
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Takeoff
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Takeoffs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{takeoffStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{takeoffStats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">Active takeoffs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{takeoffStats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{takeoffStats.totalMeasurements}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {takeoffStats.totalLayers} layers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search takeoffs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Button
                  variant={selectedStatus === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(null)}
                >
                  All
                </Button>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status as TakeoffStatus)}
                  >
                    <config.icon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTakeoffs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No takeoffs found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Takeoff
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTakeoffs.map((takeoff) => {
                const statusInfo = statusConfig[takeoff.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={takeoff.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Takeoff Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Takeoff Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {takeoff.linkedEstimateId && (
                                <Badge variant="outline">
                                  <FileText className="mr-1 h-3 w-3" />
                                  Linked to Estimate
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{takeoff.name}</h3>
                            {takeoff.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {takeoff.description}
                              </p>
                            )}

                            {/* Measurements Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">Layers</span>
                                  </div>
                                  <p className="text-lg font-bold text-blue-800">{takeoff.layers?.length || 0}</p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Ruler className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">Measurements</span>
                                  </div>
                                  <p className="text-lg font-bold text-blue-800">{takeoff.measurements?.length || 0}</p>
                                </div>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Created by user {takeoff.createdBy}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(takeoff.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Updated {formatDate(takeoff.updatedAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(takeoff)}
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTakeoff(takeoff);
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
                                setSelectedTakeoff(takeoff);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Takeoff Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Takeoff Workflow</CardTitle>
          <CardDescription>Digital measurement process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { status: 'DRAFT', step: '1. Upload Plans', description: 'Import construction drawings' },
              { status: 'IN_PROGRESS', step: '2. Measure', description: 'Create layers and measurements' },
              { status: 'COMPLETED', step: '3. Review', description: 'Verify accuracy' },
              { status: 'APPROVED', step: '4. Export', description: 'Link to estimates' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as TakeoffStatus];
              return (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-2', statusInfo.color)}>
                    <statusInfo.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{workflow.step}</h4>
                  <p className="text-xs text-muted-foreground">{workflow.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Takeoff Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Takeoff</DialogTitle>
            <DialogDescription>Create a new quantity takeoff</DialogDescription>
          </DialogHeader>
          <TakeoffForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createTakeoff.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Takeoff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Takeoff</DialogTitle>
            <DialogDescription>Update takeoff details</DialogDescription>
          </DialogHeader>
          {selectedTakeoff && (
            <TakeoffForm
              projectId={projectId}
              initialData={{
                name: selectedTakeoff.name,
                description: selectedTakeoff.description,
                estimateId: selectedTakeoff.estimateId,
                drawingReference: selectedTakeoff.drawingReference,
                scale: selectedTakeoff.scale?.toString(),
                unit: selectedTakeoff.unit,
                status: selectedTakeoff.status,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedTakeoff(null);
              }}
              isLoading={updateTakeoff.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Takeoff Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Takeoff</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this takeoff? This will also delete all associated layers and measurements. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedTakeoff(null);
              }}
              disabled={deleteTakeoff.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTakeoff.isPending}
            >
              {deleteTakeoff.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
