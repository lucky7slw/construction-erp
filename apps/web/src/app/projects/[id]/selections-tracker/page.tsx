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
  ListChecks,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Home,
  Calendar,
  User,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import {
  useSelections,
  useCreateSelection,
  useUpdateSelection,
  useDeleteSelection,
  useApproveSelection,
  type Selection,
  type SelectionStatus,
  type SelectionCategory,
} from '@/lib/query/hooks/use-selections';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SelectionForm } from '@/components/forms/selection-form';

const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  SELECTED: { label: 'Selected', icon: CheckCircle2, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 bg-green-100', badge: 'default' },
  ORDERED: { label: 'Ordered', icon: Package, color: 'text-purple-500 bg-purple-100', badge: 'default' },
  INSTALLED: { label: 'Installed', icon: Home, color: 'text-green-600 bg-green-100', badge: 'default' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-500 bg-red-100', badge: 'destructive' },
};

const categoryConfig: Record<SelectionCategory, { label: string }> = {
  FLOORING: { label: 'Flooring' },
  CABINETS: { label: 'Cabinets' },
  COUNTERTOPS: { label: 'Countertops' },
  APPLIANCES: { label: 'Appliances' },
  FIXTURES: { label: 'Fixtures' },
  LIGHTING: { label: 'Lighting' },
  TILE: { label: 'Tile' },
  PAINT: { label: 'Paint' },
  HARDWARE: { label: 'Hardware' },
  OTHER: { label: 'Other' },
};

export default function SelectionsTrackerPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<SelectionStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<SelectionCategory | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedSelection, setSelectedSelection] = React.useState<Selection | null>(null);

  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: selections = [], isLoading: selectionsLoading } = useSelections({
    projectId,
    status: selectedStatus || undefined,
    category: selectedCategory || undefined,
  });

  const createSelection = useCreateSelection();
  const updateSelection = useUpdateSelection();
  const deleteSelection = useDeleteSelection();
  const approveSelection = useApproveSelection();

  // Filter selections
  const filteredSelections = React.useMemo(() => {
    return selections.filter((selection: Selection) => {
      const matchesSearch =
        !searchQuery ||
        selection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (selection.description && selection.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [selections, searchQuery]);

  // Calculate selection stats
  const selectionStats = React.useMemo(() => {
    const byStatus = selections.reduce((acc: Record<string, number>, selection: Selection) => {
      acc[selection.status] = (acc[selection.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = selections.filter(
      (s: Selection) => s.dueDate && s.dueDate < new Date() && !['APPROVED', 'ORDERED', 'INSTALLED'].includes(s.status)
    ).length;

    return {
      total: selections.length,
      pending: byStatus.PENDING || 0,
      selected: byStatus.SELECTED || 0,
      approved: byStatus.APPROVED || 0,
      installed: byStatus.INSTALLED || 0,
      overdue,
    };
  }, [selections]);

  const isOverdue = (selection: Selection): boolean => {
    return !!(
      selection.dueDate &&
      selection.dueDate < new Date() &&
      !['APPROVED', 'ORDERED', 'INSTALLED'].includes(selection.status)
    );
  };

  // Handler functions
  const handleCreateSubmit = async (data: unknown) => {
    try {
      await createSelection.mutateAsync({
        projectId,
        ...data,
      });
      setCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Selection created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create selection',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (data: unknown) => {
    if (!selectedSelection) return;

    try {
      await updateSelection.mutateAsync({
        id: selectedSelection.id,
        data,
      });
      setEditDialogOpen(false);
      setSelectedSelection(null);
      toast({
        title: 'Success',
        description: 'Selection updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update selection',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedSelection) return;

    try {
      await deleteSelection.mutateAsync(selectedSelection.id);
      setDeleteDialogOpen(false);
      setSelectedSelection(null);
      toast({
        title: 'Success',
        description: 'Selection deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete selection',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (selection: Selection) => {
    try {
      await approveSelection.mutateAsync(selection.id);
      toast({
        title: 'Success',
        description: 'Selection approved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve selection',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || selectionsLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Selections Tracker</h2>
          <p className="text-muted-foreground">Track all client material and fixture selections</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Selection
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Selections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectionStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{selectionStats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectionStats.overdue > 0 && (
                <span className="text-red-600">{selectionStats.overdue} overdue</span>
              )}
              {selectionStats.overdue === 0 && <span>On track</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{selectionStats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Installed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{selectionStats.installed}</div>
            <p className="text-xs text-muted-foreground mt-1">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search selections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                  onClick={() => setSelectedStatus(status as SelectionStatus)}
                >
                  <config.icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSelections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No selections found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus(null);
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Selection
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSelections.map((selection) => {
                const statusInfo = statusConfig[selection.status];
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(selection);

                return (
                  <div
                    key={selection.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-accent transition-colors',
                      overdue && 'border-red-200 bg-red-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Selection Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              <Badge variant="outline">
                                {categoryConfig[selection.category as SelectionCategory]?.label || selection.category}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{selection.name}</h3>
                            {selection.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {selection.description}
                              </p>
                            )}

                            {/* Selected Option */}
                            {selection.selectedOptionId && selection.options && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">Selected Option</span>
                                </div>
                                {selection.options.find((o: any) => o.id === selection.selectedOptionId) && (
                                  <div>
                                    <p className="text-sm font-semibold text-blue-800">
                                      {selection.options.find((o: any) => o.id === selection.selectedOptionId).name}
                                    </p>
                                    {selection.options.find((o: any) => o.id === selection.selectedOptionId).price && (
                                      <p className="text-sm text-blue-700">
                                        $
                                        {selection.options
                                          .find((o: any) => o.id === selection.selectedOptionId)
                                          .price.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              {selection.room && (
                                <div className="flex items-center gap-1">
                                  <Home className="h-4 w-4" />
                                  <span>{selection.room}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Created by {selection.createdBy}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(selection.createdAt)}</span>
                              </div>
                              {selection.dueDate && (
                                <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                                  <Clock className="h-4 w-4" />
                                  <span>Due {formatDate(selection.dueDate)}</span>
                                </div>
                              )}
                              {selection.options && (
                                <div className="flex items-center gap-1">
                                  <ListChecks className="h-4 w-4" />
                                  <span>{selection.options.length} options</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // View selection - could navigate or show details
                                toast({
                                  title: 'Info',
                                  description: 'Selection detail view coming soon',
                                });
                              }}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {selection.status === 'SELECTED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(selection)}
                                title="Approve"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSelection(selection);
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
                                setSelectedSelection(selection);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            <Button variant="ghost" size="sm" title="More options">
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

      {/* Selection Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Selection Workflow</CardTitle>
          <CardDescription>Client material selection process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {[
              { status: 'PENDING', step: '1. Pending', description: 'Awaiting client' },
              { status: 'SELECTED', step: '2. Select', description: 'Client chooses' },
              { status: 'APPROVED', step: '3. Approve', description: 'Final approval' },
              { status: 'ORDERED', step: '4. Order', description: 'Purchase' },
              { status: 'ORDERED', step: '5. Deliver', description: 'Receive' },
              { status: 'INSTALLED', step: '6. Install', description: 'Complete' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as SelectionStatus];
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

      {/* Create Selection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Selection</DialogTitle>
            <DialogDescription>
              Create a new material or fixture selection for the client to review
            </DialogDescription>
          </DialogHeader>
          <SelectionForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createSelection.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Selection Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Selection</DialogTitle>
            <DialogDescription>
              Update selection details
            </DialogDescription>
          </DialogHeader>
          {selectedSelection && (
            <SelectionForm
              projectId={projectId}
              initialData={{
                name: selectedSelection.name,
                description: selectedSelection.description,
                category: selectedSelection.category,
                room: selectedSelection.room,
                dueDate: selectedSelection.dueDate,
                customerId: selectedSelection.customerId,
                status: selectedSelection.status,
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedSelection(null);
              }}
              isLoading={updateSelection.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Selection Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this selection? This action cannot be undone.
              All options and related data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedSelection(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSelection.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
