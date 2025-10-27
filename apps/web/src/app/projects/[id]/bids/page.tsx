'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Gavel,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Building2,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
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
  useBids,
  useCreateBid,
  useUpdateBid,
  useAwardBid,
  useDeclineBid,
  useDeleteBid,
  type Bid,
} from '@/lib/query/hooks/use-bids';
import { BidForm } from '@/components/forms/bid-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type BidStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'AWARDED' | 'DECLINED' | 'EXPIRED';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  SUBMITTED: { label: 'Submitted', icon: Send, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  UNDER_REVIEW: { label: 'Under Review', icon: Clock, color: 'text-orange-500 bg-orange-100', badge: 'default' },
  AWARDED: { label: 'Awarded', icon: Award, color: 'text-green-500 bg-green-100', badge: 'default' },
  DECLINED: { label: 'Declined', icon: XCircle, color: 'text-red-500 bg-red-100', badge: 'destructive' },
  EXPIRED: { label: 'Expired', icon: Clock, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
};

export default function BidsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<BidStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedBid, setSelectedBid] = React.useState<Bid | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: bids = [], isLoading: bidsLoading } = useBids({
    projectId,
    status: selectedStatus || undefined,
  }) as { data: any[]; isLoading: boolean };

  const createBid = useCreateBid();
  const updateBid = useUpdateBid();
  const awardBid = useAwardBid();
  const declineBid = useDeclineBid();
  const deleteBid = useDeleteBid();

  // Filter bids
  const filteredBids = React.useMemo(() => {
    return bids.filter((bid: any) => {
      const matchesSearch =
        !searchQuery ||
        bid.bidNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bid.supplierName && bid.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (bid.description && bid.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [bids, searchQuery]);

  // Calculate bid stats
  const bidStats = React.useMemo(() => {
    const byStatus = bids.reduce((acc, bid) => {
      acc[bid.status] = (acc[bid.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = bids.reduce((sum, bid) => sum + (bid.totalAmount || 0), 0);
    const awardedValue = bids
      .filter((b) => b.status === 'AWARDED')
      .reduce((sum, bid) => sum + (bid.totalAmount || 0), 0);

    return {
      total: bids.length,
      submitted: byStatus.SUBMITTED || 0,
      underReview: byStatus.UNDER_REVIEW || 0,
      awarded: byStatus.AWARDED || 0,
      totalValue,
      awardedValue,
    };
  }, [bids]);

  const handleCreateSubmit = async (data: any) => {
    try {
      await createBid.mutateAsync({
        projectId,
        bidType: data.bidType,
        scopeOfWork: data.scopeOfWork,
        supplierId: data.supplierId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        bondRequired: data.bondRequired,
        bondAmount: data.bondAmount ? parseFloat(data.bondAmount) : undefined,
        taxPercent: data.taxPercent ? parseFloat(data.taxPercent) : undefined,
        notes: data.notes,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      });
      toast({
        title: 'Success',
        description: 'Bid created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bid',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedBid) return;
    try {
      await updateBid.mutateAsync({
        id: selectedBid.id,
        data: {
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          notes: data.notes,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
        },
      });
      toast({
        title: 'Success',
        description: 'Bid updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedBid(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bid',
        variant: 'destructive',
      });
    }
  };

  const handleAward = async (bid: Bid) => {
    try {
      await awardBid.mutateAsync(bid.id);
      toast({
        title: 'Success',
        description: 'Bid awarded',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to award bid',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineSubmit = async () => {
    if (!selectedBid) return;
    try {
      await declineBid.mutateAsync({
        bidId: selectedBid.id,
        reason: declineReason,
      });
      toast({
        title: 'Success',
        description: 'Bid declined',
      });
      setDeclineDialogOpen(false);
      setSelectedBid(null);
      setDeclineReason('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline bid',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedBid) return;
    try {
      await deleteBid.mutateAsync(selectedBid.id);
      toast({
        title: 'Success',
        description: 'Bid deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedBid(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bid',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || bidsLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Bids</h2>
          <p className="text-muted-foreground">Manage contractor bids and proposals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Create Bid Package
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Bid
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bidStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{bidStats.underReview}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs evaluation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awarded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{bidStats.awarded}</div>
            <p className="text-xs text-muted-foreground mt-1">Contracts awarded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awarded Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${bidStats.awardedValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${bidStats.totalValue.toLocaleString()} total
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
                  placeholder="Search bids..."
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
                    onClick={() => setSelectedStatus(status as BidStatus)}
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
          {filteredBids.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bids found</p>
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
                  Request First Bid
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBids.map((bid: any) => {
                const statusInfo = statusConfig[bid.status as BidStatus];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={bid.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Bid Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Bid Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {bid.bidNumber}
                              </Badge>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {bid.type && (
                                <Badge variant="outline">{bid.type.replace('_', ' ')}</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-semibold text-lg">{bid.supplierName || 'Unknown Supplier'}</h3>
                            </div>

                            {bid.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {bid.description}
                              </p>
                            )}

                            {/* Bid Amount */}
                            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">Bid Amount</span>
                                  </div>
                                  <p className="text-2xl font-bold text-green-800">
                                    ${bid.totalAmount?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                {bid.score !== undefined && (
                                  <div className="text-right">
                                    <div className="flex items-center gap-2 mb-1">
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-900">Score</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-800">{bid.score}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Submitted by {bid.supplierId}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Submitted {formatDate(bid.submittedAt || bid.createdAt)}</span>
                              </div>
                              {bid.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Due {formatDate(bid.dueDate)}</span>
                                </div>
                              )}
                              {bid.lineItems && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  <span>{bid.lineItems.length} line items</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {bid.status === 'UNDER_REVIEW' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAward(bid)}
                                  title="Award Bid"
                                >
                                  <Award className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBid(bid);
                                    setDeclineDialogOpen(true);
                                  }}
                                  title="Decline Bid"
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBid(bid);
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
                                setSelectedBid(bid);
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

      {/* Bid Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Bid Workflow</CardTitle>
          <CardDescription>Procurement process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { status: 'DRAFT', step: '1. Draft', description: 'Prepare bid package' },
              { status: 'SUBMITTED', step: '2. Request', description: 'Send to suppliers' },
              { status: 'UNDER_REVIEW', step: '3. Review', description: 'Evaluate proposals' },
              { status: 'AWARDED', step: '4. Award', description: 'Select winner' },
              { status: 'AWARDED', step: '5. Contract', description: 'Finalize agreement' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as BidStatus];
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

      {/* Create Bid Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Bid</DialogTitle>
            <DialogDescription>Create a new bid request</DialogDescription>
          </DialogHeader>
          <BidForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createBid.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Bid Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bid</DialogTitle>
            <DialogDescription>Update bid details</DialogDescription>
          </DialogHeader>
          {selectedBid && (
            <BidForm
              projectId={projectId}
              initialData={{
                bidType: selectedBid.bidType,
                scopeOfWork: selectedBid.scopeOfWork,
                supplierId: selectedBid.supplierId,
                dueDate: selectedBid.dueDate
                  ? new Date(selectedBid.dueDate).toISOString().split('T')[0]
                  : undefined,
                validUntil: selectedBid.validUntil
                  ? new Date(selectedBid.validUntil).toISOString().split('T')[0]
                  : undefined,
                bondRequired: selectedBid.bondRequired,
                bondAmount: selectedBid.bondAmount?.toString(),
                taxPercent: selectedBid.taxPercent?.toString(),
                notes: selectedBid.notes,
                contactName: selectedBid.contactName,
                contactEmail: selectedBid.contactEmail,
                contactPhone: selectedBid.contactPhone,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedBid(null);
              }}
              isLoading={updateBid.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Decline Bid Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Bid</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this bid. This will be sent to the supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason for Declining</Label>
              <Textarea
                id="declineReason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Explain why this bid is being declined..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeclineDialogOpen(false);
                  setSelectedBid(null);
                  setDeclineReason('');
                }}
                disabled={declineBid.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeclineSubmit}
                disabled={declineBid.isPending || !declineReason.trim()}
              >
                {declineBid.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Decline Bid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Bid Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bid? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedBid(null);
              }}
              disabled={deleteBid.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBid.isPending}
            >
              {deleteBid.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
