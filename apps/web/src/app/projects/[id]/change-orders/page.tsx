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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useChangeOrders, useCreateChangeOrder, useUpdateChangeOrder, useDeleteChangeOrder, type ChangeOrder } from '@/lib/query/hooks/use-change-orders';
import { ChangeOrderForm } from '@/components/forms/change-order-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type ChangeOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED' | 'CANCELLED';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100' },
  PENDING_APPROVAL: { label: 'Pending Approval', icon: Clock, color: 'text-yellow-500 bg-yellow-100' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-500 bg-red-100' },
  IMPLEMENTED: { label: 'Implemented', icon: CheckCircle2, color: 'text-blue-500 bg-blue-100' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-gray-500 bg-gray-100' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ChangeOrdersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<ChangeOrderStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedCO, setSelectedCO] = React.useState<ChangeOrder | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: changeOrders = [], isLoading: changeOrdersLoading } = useChangeOrders({
    projectId,
    status: selectedStatus || undefined,
  });

  const createCO = useCreateChangeOrder();
  const updateCO = useUpdateChangeOrder();
  const deleteCO = useDeleteChangeOrder();

  // Filter change orders
  const filteredChangeOrders = React.useMemo(() => {
    return changeOrders.filter((co) => {
      const matchesSearch =
        !searchQuery ||
        co.coNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        co.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        co.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [changeOrders, searchQuery]);

  // Calculate change order stats
  const coStats = React.useMemo(() => {
    const totalCostImpact = changeOrders
      .filter((co) => co.status === 'APPROVED' || co.status === 'IMPLEMENTED')
      .reduce((sum, co) => sum + co.costImpact, 0);

    const totalTimeImpact = changeOrders
      .filter((co) => co.status === 'APPROVED' || co.status === 'IMPLEMENTED')
      .reduce((sum, co) => sum + co.timeImpact, 0);

    const pendingValue = changeOrders
      .filter((co) => co.status === 'PENDING_APPROVAL')
      .reduce((sum, co) => sum + co.costImpact, 0);

    const byStatus = changeOrders.reduce((acc, co) => {
      acc[co.status] = (acc[co.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: changeOrders.length,
      approved: (byStatus.APPROVED || 0) + (byStatus.IMPLEMENTED || 0),
      pending: byStatus.PENDING_APPROVAL || 0,
      rejected: byStatus.REJECTED || 0,
      totalCostImpact,
      totalTimeImpact,
      pendingValue,
    };
  }, [changeOrders]);

  const handleCreateSubmit = async (data: any) => {
    try {
      await createCO.mutateAsync({
        projectId,
        title: data.title,
        description: data.description,
        reason: data.reason,
        costImpact: data.costImpact,
        timeImpact: data.timeImpact,
      });
      toast({
        title: 'Success',
        description: 'Change order created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create change order',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedCO) return;
    try {
      await updateCO.mutateAsync({
        id: selectedCO.id,
        projectId,
        data: {
          status: data.status,
          notes: data.notes,
        },
      });
      toast({
        title: 'Success',
        description: 'Change order updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedCO(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update change order',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (co: ChangeOrder) => {
    try {
      await updateCO.mutateAsync({
        id: co.id,
        projectId,
        data: { status: 'APPROVED' },
      });
      toast({
        title: 'Success',
        description: 'Change order approved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve change order',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (co: ChangeOrder) => {
    try {
      await updateCO.mutateAsync({
        id: co.id,
        projectId,
        data: { status: 'REJECTED' },
      });
      toast({
        title: 'Success',
        description: 'Change order rejected',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject change order',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedCO) return;
    try {
      await deleteCO.mutateAsync({ id: selectedCO.id, projectId });
      toast({
        title: 'Success',
        description: 'Change order deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedCO(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete change order',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || changeOrdersLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Change Orders</h2>
          <p className="text-muted-foreground">Track project scope and cost changes</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Change Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              coStats.totalCostImpact > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {formatCurrency(Math.abs(coStats.totalCostImpact))}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {coStats.totalCostImpact > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-600" />
                  <span>Budget increase</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span>Budget savings</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              coStats.totalTimeImpact > 0 ? 'text-orange-600' : 'text-green-600'
            )}>
              {coStats.totalTimeImpact} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">Additional time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{coStats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(Math.abs(coStats.pendingValue))} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{coStats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Active/completed</p>
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
                    placeholder="Search change orders..."
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
              {(['PENDING_APPROVAL', 'APPROVED', 'IMPLEMENTED', 'REJECTED'] as ChangeOrderStatus[]).map((status) => {
                const config = statusConfig[status];
                return (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                  >
                    <config.icon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredChangeOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No change orders found</p>
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
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChangeOrders.map((co) => {
                const statusInfo = statusConfig[co.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={co.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* CO Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* CO Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {co.coNumber}
                              </Badge>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                            </div>

                            <h3 className="font-semibold text-lg mb-1">{co.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {co.description}
                            </p>

                            {/* Cost and Time Impact */}
                            <div className="flex items-center gap-6 mb-3 p-3 bg-muted/50 rounded">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Cost Impact</p>
                                <div className={cn(
                                  'text-lg font-bold flex items-center gap-1',
                                  co.costImpact > 0 ? 'text-red-600' : 'text-green-600'
                                )}>
                                  {co.costImpact > 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                  <span>{formatCurrency(Math.abs(co.costImpact))}</span>
                                </div>
                              </div>
                              <div className="border-l pl-6">
                                <p className="text-xs text-muted-foreground mb-1">Schedule Impact</p>
                                <div className={cn(
                                  'text-lg font-bold flex items-center gap-1',
                                  co.timeImpact > 0 ? 'text-orange-600' : 'text-gray-600'
                                )}>
                                  <Clock className="h-4 w-4" />
                                  <span>{co.timeImpact > 0 ? `+${co.timeImpact}` : co.timeImpact} days</span>
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            {co.notes && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                <p className="text-sm font-medium text-blue-900 mb-1">Notes</p>
                                <p className="text-sm text-blue-800">{co.notes}</p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {co.requester.firstName} {co.requester.lastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Requested {formatDate(co.requestedAt)}</span>
                              </div>
                              {co.approvedAt && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Approved {formatDate(co.approvedAt)}</span>
                                </div>
                              )}
                              {co.attachments && co.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-4 w-4" />
                                  <span>{co.attachments.length} attachments</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {co.status === 'PENDING_APPROVAL' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(co)}
                                  title="Approve"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(co)}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCO(co);
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
                                setSelectedCO(co);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Create Change Order Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Change Order</DialogTitle>
            <DialogDescription>Submit a new change order request</DialogDescription>
          </DialogHeader>
          <ChangeOrderForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createCO.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Change Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Change Order</DialogTitle>
            <DialogDescription>Update change order details</DialogDescription>
          </DialogHeader>
          {selectedCO && (
            <ChangeOrderForm
              projectId={projectId}
              initialData={{
                title: selectedCO.title,
                description: selectedCO.description,
                reason: selectedCO.reason,
                costImpact: selectedCO.costImpact,
                timeImpact: selectedCO.timeImpact,
                status: selectedCO.status,
                notes: selectedCO.notes,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedCO(null);
              }}
              isLoading={updateCO.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Change Order Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Change Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete change order "{selectedCO?.coNumber}: {selectedCO?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedCO(null);
              }}
              disabled={deleteCO.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCO.isPending}
            >
              {deleteCO.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Change Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
