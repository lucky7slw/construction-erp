'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  FileSpreadsheet,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Calendar,
  User,
  FileText,
  Eye,
  Trash2,
  MoreVertical,
  Copy,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useEstimates, useCreateEstimate, useUpdateEstimate, useApproveEstimate, useDeleteEstimate } from '@/lib/query/hooks/use-estimates';
import { EstimateForm } from '@/components/forms/estimate-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type EstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  SENT: { label: 'Sent', icon: Clock, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 bg-green-100', badge: 'default' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-500 bg-red-100', badge: 'destructive' },
  EXPIRED: { label: 'Expired', icon: Clock, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
};

export default function EstimatesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<EstimateStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedEstimate, setSelectedEstimate] = React.useState<any>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: estimates = [], isLoading: estimatesLoading } = useEstimates();

  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const approveEstimate = useApproveEstimate();
  const deleteEstimate = useDeleteEstimate();

  // Filter estimates by project and search
  const filteredEstimates = React.useMemo(() => {
    return estimates
      .filter((estimate: any) => estimate.projectId === projectId)
      .filter((estimate: any) => {
        if (selectedStatus && estimate.status !== selectedStatus) return false;

        const matchesSearch =
          !searchQuery ||
          (estimate.name && estimate.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (estimate.description && estimate.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
      });
  }, [estimates, projectId, searchQuery, selectedStatus]);

  // Calculate estimate stats
  const estimateStats = React.useMemo(() => {
    const projectEstimates = estimates.filter((e: any) => e.projectId === projectId);

    const byStatus = projectEstimates.reduce((acc: any, estimate: any) => {
      acc[estimate.status] = (acc[estimate.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = projectEstimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
    const approvedValue = projectEstimates
      .filter((e: any) => e.status === 'APPROVED')
      .reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

    return {
      total: projectEstimates.length,
      draft: byStatus.DRAFT || 0,
      sent: byStatus.SENT || 0,
      approved: byStatus.APPROVED || 0,
      totalValue,
      approvedValue,
    };
  }, [estimates, projectId]);

  const handleCreateSubmit = async (data: any) => {
    try {
      await createEstimate.mutateAsync({
        title: data.title,
        description: data.description,
        projectId,
        customerId: data.customerId,
        validUntil: data.validUntil,
        notes: data.notes,
      });
      toast({
        title: 'Success',
        description: 'Estimate created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create estimate',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedEstimate) return;
    try {
      await updateEstimate.mutateAsync({
        id: selectedEstimate.id,
        data: {
          title: data.title,
          description: data.description,
          customerId: data.customerId,
          validUntil: data.validUntil,
          notes: data.notes,
        },
      });
      toast({
        title: 'Success',
        description: 'Estimate updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedEstimate(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update estimate',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (estimate: any) => {
    try {
      await approveEstimate.mutateAsync(estimate.id);
      toast({
        title: 'Success',
        description: 'Estimate approved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve estimate',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedEstimate) return;
    try {
      await deleteEstimate.mutateAsync(selectedEstimate.id);
      toast({
        title: 'Success',
        description: 'Estimate deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedEstimate(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete estimate',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || estimatesLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Estimates</h2>
          <p className="text-muted-foreground">Create and manage project estimates</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Estimate
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimateStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">This project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estimateStats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estimateStats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Accepted by client</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${estimateStats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${estimateStats.approvedValue.toLocaleString()} approved
            </p>
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
                  placeholder="Search estimates..."
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
                    onClick={() => setSelectedStatus(status as EstimateStatus)}
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
          {filteredEstimates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No estimates found</p>
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
                  Create First Estimate
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEstimates.map((estimate: any) => {
                const statusInfo = statusConfig[estimate.status as EstimateStatus];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={estimate.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Estimate Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Estimate Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {estimate.estimateNumber && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {estimate.estimateNumber}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{estimate.name || 'Untitled Estimate'}</h3>
                            {estimate.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {estimate.description}
                              </p>
                            )}

                            {/* Estimate Amount */}
                            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">Total Amount</span>
                                  </div>
                                  <p className="text-2xl font-bold text-green-800">
                                    ${estimate.totalAmount?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                {estimate.lineItems && (
                                  <div className="text-right">
                                    <div className="flex items-center gap-2 mb-1">
                                      <FileText className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-900">Line Items</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-800">{estimate.lineItems.length}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Created by {estimate.createdBy || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(estimate.createdAt)}</span>
                              </div>
                              {estimate.expiresAt && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Expires {formatDate(estimate.expiresAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {estimate.status === 'SENT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(estimate)}
                                title="Approve"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEstimate(estimate);
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
                                setSelectedEstimate(estimate);
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

      {/* Estimate Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Estimate Workflow</CardTitle>
          <CardDescription>Project estimation process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { status: 'DRAFT', step: '1. Draft', description: 'Create and refine' },
              { status: 'SENT', step: '2. Send', description: 'Share with client' },
              { status: 'SENT', step: '3. Review', description: 'Client reviews' },
              { status: 'APPROVED', step: '4. Approve', description: 'Client accepts' },
              { status: 'APPROVED', step: '5. Execute', description: 'Begin work' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as EstimateStatus];
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

      {/* Create Estimate Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Estimate</DialogTitle>
            <DialogDescription>Create a new estimate for this project</DialogDescription>
          </DialogHeader>
          <EstimateForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createEstimate.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Estimate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Estimate</DialogTitle>
            <DialogDescription>Update estimate details</DialogDescription>
          </DialogHeader>
          {selectedEstimate && (
            <EstimateForm
              projectId={projectId}
              initialData={{
                title: selectedEstimate.name,
                description: selectedEstimate.description,
                customerId: selectedEstimate.customerId,
                validUntil: selectedEstimate.expiresAt
                  ? new Date(selectedEstimate.expiresAt).toISOString().split('T')[0]
                  : undefined,
                notes: selectedEstimate.notes,
                status: selectedEstimate.status,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedEstimate(null);
              }}
              isLoading={updateEstimate.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Estimate Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Estimate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedEstimate(null);
              }}
              disabled={deleteEstimate.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteEstimate.isPending}
            >
              {deleteEstimate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
