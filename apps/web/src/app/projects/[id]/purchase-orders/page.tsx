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
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Calendar,
  User,
  Building2,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder, type PurchaseOrder } from '@/lib/query/hooks/use-purchase-orders';
import { PurchaseOrderForm } from '@/components/forms/purchase-order-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type POStatus = 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'INVOICED' | 'CANCELLED';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100' },
  SENT: { label: 'Sent', icon: ShoppingCart, color: 'text-blue-500 bg-blue-100' },
  ACKNOWLEDGED: { label: 'Acknowledged', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', icon: Package, color: 'text-orange-500 bg-orange-100' },
  RECEIVED: { label: 'Received', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  INVOICED: { label: 'Invoiced', icon: FileText, color: 'text-purple-500 bg-purple-100' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-red-500 bg-red-100' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function PurchaseOrdersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<POStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedPO, setSelectedPO] = React.useState<PurchaseOrder | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = usePurchaseOrders({
    projectId,
    status: selectedStatus || undefined,
  });

  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();

  // Filter purchase orders
  const filteredPOs = React.useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplier.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [purchaseOrders, searchQuery]);

  // Calculate PO stats
  const poStats = React.useMemo(() => {
    const totalCommitted = purchaseOrders
      .filter((po) => po.status !== 'DRAFT' && po.status !== 'CANCELLED')
      .reduce((sum, po) => sum + po.total, 0);

    const byStatus = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = purchaseOrders.filter(
      (po) =>
        po.deliveryDate &&
        new Date(po.deliveryDate) < new Date() &&
        po.status !== 'RECEIVED' &&
        po.status !== 'INVOICED' &&
        po.status !== 'CANCELLED'
    ).length;

    return {
      total: purchaseOrders.length,
      totalCommitted,
      sent: byStatus.SENT || 0,
      ordered: (byStatus.ACKNOWLEDGED || 0) + (byStatus.PARTIALLY_RECEIVED || 0),
      received: (byStatus.RECEIVED || 0) + (byStatus.INVOICED || 0),
      overdue,
    };
  }, [purchaseOrders]);

  const isOverdue = (po: PurchaseOrder): boolean => {
    return !!(
      po.deliveryDate &&
      new Date(po.deliveryDate) < new Date() &&
      po.status !== 'RECEIVED' &&
      po.status !== 'INVOICED' &&
      po.status !== 'CANCELLED'
    );
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createPO.mutateAsync({
        projectId,
        supplierId: data.supplierId,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        deliveryAddress: data.deliveryAddress,
        notes: data.notes,
        lineItems: [], // Empty line items for now
      });
      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedPO) return;
    try {
      await updatePO.mutateAsync({
        id: selectedPO.id,
        projectId,
        data: {
          status: data.status,
          notes: data.notes,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        },
      });
      toast({
        title: 'Success',
        description: 'Purchase order updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedPO(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleAcknowledge = async (po: PurchaseOrder) => {
    try {
      await updatePO.mutateAsync({
        id: po.id,
        projectId,
        data: { status: 'ACKNOWLEDGED' },
      });
      toast({
        title: 'Success',
        description: 'Purchase order acknowledged',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    try {
      await updatePO.mutateAsync({
        id: po.id,
        projectId,
        data: { status: 'RECEIVED' },
      });
      toast({
        title: 'Success',
        description: 'Purchase order marked as received',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as received',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedPO) return;
    try {
      await deletePO.mutateAsync({ id: selectedPO.id, projectId });
      toast({
        title: 'Success',
        description: 'Purchase order deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedPO(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete purchase order',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || purchaseOrdersLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">Track material and equipment procurement</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(poStats.totalCommitted)}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved & ordered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{poStats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{poStats.ordered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {poStats.overdue > 0 && (
                <span className="text-red-600">{poStats.overdue} overdue</span>
              )}
              {poStats.overdue === 0 && <span>On schedule</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{poStats.received}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed orders</p>
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
                    placeholder="Search purchase orders..."
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
              {(['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED'] as POStatus[]).map((status) => {
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
          {filteredPOs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase orders found</p>
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
              {filteredPOs.map((po) => {
                const statusInfo = statusConfig[po.status];
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(po);

                return (
                  <div
                    key={po.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-accent transition-colors',
                      overdue && 'border-red-200 bg-red-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* PO Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* PO Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {po.poNumber}
                              </Badge>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>

                            {/* Vendor Info */}
                            <div className="flex items-center gap-4 mb-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{po.supplier.name}</span>
                              </div>
                              {po.supplier.contactPerson && (
                                <span className="text-muted-foreground">{po.supplier.contactPerson}</span>
                              )}
                            </div>

                            {/* Cost Breakdown */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                                  <p className="font-semibold">{formatCurrency(po.subtotal)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Tax</p>
                                  <p className="font-semibold">{formatCurrency(po.tax)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                                  <p className="text-lg font-bold text-blue-900">{formatCurrency(po.total)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Items Summary */}
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Items ({po.lineItems.length})
                              </p>
                              <div className="space-y-1">
                                {po.lineItems.slice(0, 2).map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span>{item.description}</span>
                                    <span className="text-muted-foreground">
                                      {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                                    </span>
                                  </div>
                                ))}
                                {po.lineItems.length > 2 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{po.lineItems.length - 2} more items
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            {po.notes && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                                <p className="text-xs font-medium text-yellow-900 mb-1">Notes</p>
                                <p className="text-xs text-yellow-800">{po.notes}</p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {po.createdBy.firstName} {po.createdBy.lastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(po.createdAt)}</span>
                              </div>
                              {po.deliveryDate && (
                                <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                                  <Truck className="h-4 w-4" />
                                  <span>Expected {formatDate(po.deliveryDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {po.status === 'SENT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledge(po)}
                                title="Acknowledge"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            {(po.status === 'ACKNOWLEDGED' || po.status === 'PARTIALLY_RECEIVED') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReceive(po)}
                                title="Mark as Received"
                              >
                                <Package className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po);
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
                                setSelectedPO(po);
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

      {/* PO Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Workflow</CardTitle>
          <CardDescription>Standard procurement process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {[
              { status: 'DRAFT', step: '1. Draft', description: 'Create PO' },
              { status: 'SENT', step: '2. Send', description: 'Sent to vendor' },
              { status: 'ACKNOWLEDGED', step: '3. Acknowledge', description: 'Vendor confirms' },
              { status: 'PARTIALLY_RECEIVED', step: '4. Partial', description: 'Partial delivery' },
              { status: 'RECEIVED', step: '5. Receive', description: 'All received' },
              { status: 'INVOICED', step: '6. Invoice', description: 'Invoiced' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as POStatus];
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

      {/* Create Purchase Order Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>Create a new purchase order</DialogDescription>
          </DialogHeader>
          <PurchaseOrderForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createPO.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>Update purchase order details</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <PurchaseOrderForm
              projectId={projectId}
              initialData={{
                supplierId: selectedPO.supplierId,
                deliveryDate: selectedPO.deliveryDate ? new Date(selectedPO.deliveryDate).toISOString().split('T')[0] : '',
                deliveryAddress: selectedPO.deliveryAddress,
                notes: selectedPO.notes,
                status: selectedPO.status,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedPO(null);
              }}
              isLoading={updatePO.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Purchase Order Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete purchase order "{selectedPO?.poNumber}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedPO(null);
              }}
              disabled={deletePO.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePO.isPending}
            >
              {deletePO.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Purchase Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
