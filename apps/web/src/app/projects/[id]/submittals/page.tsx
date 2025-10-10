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
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Paperclip,
  MessageSquare,
  Download,
  Upload,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useSubmittals, useCreateSubmittal, useUpdateSubmittal, useDeleteSubmittal, type Submittal } from '@/lib/query/hooks/use-submittals';
import { SubmittalForm } from '@/components/forms/submittal-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type SubmittalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'APPROVED_WITH_COMMENTS'
  | 'REJECTED'
  | 'RESUBMIT_REQUIRED';

type SubmittalType =
  | 'SHOP_DRAWING'
  | 'PRODUCT_DATA'
  | 'SAMPLE'
  | 'MOCK_UP'
  | 'TEST_REPORT'
  | 'CERTIFICATION'
  | 'WARRANTY'
  | 'OTHER';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100' },
  SUBMITTED: { label: 'Submitted', icon: Upload, color: 'text-blue-500 bg-blue-100' },
  UNDER_REVIEW: { label: 'Under Review', icon: Clock, color: 'text-yellow-500 bg-yellow-100' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  APPROVED_WITH_COMMENTS: { label: 'Approved w/ Comments', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-500 bg-red-100' },
  RESUBMIT_REQUIRED: { label: 'Resubmit Required', icon: RefreshCw, color: 'text-orange-500 bg-orange-100' },
};

const typeConfig = {
  SHOP_DRAWING: { label: 'Shop Drawing', icon: FileText },
  PRODUCT_DATA: { label: 'Product Data', icon: FileText },
  SAMPLE: { label: 'Sample', icon: FileText },
  MOCK_UP: { label: 'Mock-up', icon: FileText },
  TEST_REPORT: { label: 'Test Report', icon: FileText },
  CERTIFICATION: { label: 'Certification', icon: FileText },
  WARRANTY: { label: 'Warranty', icon: FileText },
  OTHER: { label: 'Other', icon: FileText },
};

export default function SubmittalsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<SubmittalStatus | null>(null);
  const [selectedType, setSelectedType] = React.useState<SubmittalType | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedSubmittal, setSelectedSubmittal] = React.useState<Submittal | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: submittals = [], isLoading: submittalsLoading } = useSubmittals({
    projectId,
    status: selectedStatus || undefined,
    type: selectedType || undefined,
  });

  const createSubmittal = useCreateSubmittal();
  const updateSubmittal = useUpdateSubmittal();
  const deleteSubmittal = useDeleteSubmittal();

  // Filter submittals (filtering by status/type is done by the API, this is just for search)
  const filteredSubmittals = React.useMemo(() => {
    return submittals.filter((submittal) => {
      const matchesSearch =
        !searchQuery ||
        submittal.submittalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submittal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submittal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submittal.specSection?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [submittals, searchQuery]);

  // Calculate submittal stats
  const submittalStats = React.useMemo(() => {
    const byStatus = submittals.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = submittals.filter(
      (sub) =>
        sub.dueDate &&
        sub.dueDate < new Date() &&
        !['APPROVED', 'APPROVED_WITH_COMMENTS'].includes(sub.status)
    ).length;

    const avgReviewDays = submittals
      .filter((sub) => sub.reviewedDate && sub.submittedDate)
      .reduce((sum, sub) => {
        const days = Math.ceil(
          (sub.reviewedDate!.getTime() - sub.submittedDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);

    const reviewed = submittals.filter((sub) => sub.reviewedDate).length;

    return {
      total: submittals.length,
      submitted: byStatus.SUBMITTED || 0,
      underReview: byStatus.UNDER_REVIEW || 0,
      approved: (byStatus.APPROVED || 0) + (byStatus.APPROVED_WITH_COMMENTS || 0),
      rejected: byStatus.REJECTED || 0,
      overdue,
      avgReviewDays: reviewed > 0 ? Math.round(avgReviewDays / reviewed) : 0,
    };
  }, [submittals]);

  const isOverdue = (submittal: Submittal): boolean => {
    return !!(
      submittal.dueDate &&
      submittal.dueDate < new Date() &&
      !['APPROVED', 'APPROVED_WITH_COMMENTS'].includes(submittal.status)
    );
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createSubmittal.mutateAsync({
        projectId,
        title: data.title,
        type: data.type,
        description: data.description,
        specSection: data.specSection,
        drawingReference: data.drawingReference,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        manufacturer: data.manufacturer,
        model: data.model,
      });
      toast({
        title: 'Success',
        description: 'Submittal created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create submittal',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedSubmittal) return;
    try {
      await updateSubmittal.mutateAsync({
        id: selectedSubmittal.id,
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          comments: data.comments,
        },
      });
      toast({
        title: 'Success',
        description: 'Submittal updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedSubmittal(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update submittal',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (submittal: Submittal) => {
    try {
      await updateSubmittal.mutateAsync({
        id: submittal.id,
        data: { status: 'APPROVED' },
      });
      toast({
        title: 'Success',
        description: 'Submittal approved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve submittal',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedSubmittal) return;
    try {
      await deleteSubmittal.mutateAsync(selectedSubmittal.id);
      toast({
        title: 'Success',
        description: 'Submittal deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedSubmittal(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete submittal',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || submittalsLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Submittals</h2>
          <p className="text-muted-foreground">Track shop drawings, product data, and approvals</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Submittal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submittals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittalStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All revisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {submittalStats.underReview}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {submittalStats.overdue > 0 && (
                <span className="text-red-600">{submittalStats.overdue} overdue</span>
              )}
              {submittalStats.overdue === 0 && <span>On schedule</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{submittalStats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for work</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Review Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {submittalStats.avgReviewDays}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Days to review</p>
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
                    placeholder="Search submittals..."
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
              {(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as SubmittalStatus[]).map((status) => {
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
          {filteredSubmittals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submittals found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus(null);
                    setSelectedType(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmittals.map((submittal) => {
                const statusInfo = statusConfig[submittal.status];
                const typeInfo = typeConfig[submittal.type];
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(submittal);

                return (
                  <div
                    key={submittal.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-accent transition-colors',
                      overdue && 'border-red-200 bg-red-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Submittal Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Submittal Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {submittal.submittalNumber}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Rev {submittal.revision}
                              </Badge>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {submittal.specSection && (
                                <Badge variant="outline" className="text-xs">
                                  {submittal.specSection}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {typeInfo.label}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>

                            <h3 className="font-semibold text-lg mb-1">{submittal.title}</h3>
                            {submittal.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {submittal.description}
                              </p>
                            )}

                            {/* Review Comments */}
                            {submittal.comments && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">Review Comments</span>
                                </div>
                                <p className="text-sm text-blue-800">{submittal.comments}</p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Submitted by user {submittal.submittedBy}</span>
                              </div>
                              {submittal.reviewedBy && (
                                <div className="flex items-center gap-1">
                                  <ArrowRight className="h-4 w-4" />
                                  <span>Reviewed by user {submittal.reviewedBy}</span>
                                </div>
                              )}
                              {submittal.submittedDate && (
                                <div className="flex items-center gap-1">
                                  <Upload className="h-4 w-4" />
                                  <span>Submitted {formatDate(submittal.submittedDate)}</span>
                                </div>
                              )}
                              {submittal.dueDate && (
                                <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                                  <Clock className="h-4 w-4" />
                                  <span>Due {formatDate(submittal.dueDate)}</span>
                                </div>
                              )}
                              {submittal.attachments && submittal.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-4 w-4" />
                                  <span>{submittal.attachments.length} files</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {submittal.status === 'UNDER_REVIEW' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(submittal)}
                                title="Approve"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSubmittal(submittal);
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
                                setSelectedSubmittal(submittal);
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

      {/* Submittal Types Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Submittal Types</CardTitle>
          <CardDescription>Common construction submittal categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(typeConfig).filter(([key]) => key !== 'OTHER').slice(0, 4).map(([type, config]) => (
              <div key={type} className="flex items-start gap-2">
                <div className="p-2 rounded bg-blue-100 text-blue-600">
                  <config.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{config.label}</h4>
                  <p className="text-xs text-muted-foreground">
                    {type === 'SHOP_DRAWING' && 'Fabrication drawings'}
                    {type === 'PRODUCT_DATA' && 'Material specifications'}
                    {type === 'SAMPLE' && 'Physical samples'}
                    {type === 'TEST_REPORT' && 'Quality testing'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Submittal Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Submittal</DialogTitle>
            <DialogDescription>Submit a new shop drawing, product data, or sample</DialogDescription>
          </DialogHeader>
          <SubmittalForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createSubmittal.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Submittal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submittal</DialogTitle>
            <DialogDescription>Update submittal details and status</DialogDescription>
          </DialogHeader>
          {selectedSubmittal && (
            <SubmittalForm
              projectId={projectId}
              initialData={{
                title: selectedSubmittal.title,
                type: selectedSubmittal.type,
                description: selectedSubmittal.description,
                specSection: selectedSubmittal.specSection,
                drawingReference: selectedSubmittal.drawingReference,
                dueDate: selectedSubmittal.dueDate ? new Date(selectedSubmittal.dueDate).toISOString().split('T')[0] : '',
                manufacturer: selectedSubmittal.manufacturer,
                model: selectedSubmittal.model,
                status: selectedSubmittal.status,
                comments: selectedSubmittal.comments,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedSubmittal(null);
              }}
              isLoading={updateSubmittal.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Submittal Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submittal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete submittal "{selectedSubmittal?.submittalNumber}: {selectedSubmittal?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedSubmittal(null);
              }}
              disabled={deleteSubmittal.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSubmittal.isPending}
            >
              {deleteSubmittal.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Submittal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
