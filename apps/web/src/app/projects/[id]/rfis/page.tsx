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
  Filter,
  MessageSquare,
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
  Send,
  Paperclip,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useRFIs, useCreateRFI, useUpdateRFI, useDeleteRFI, type RFI } from '@/lib/query/hooks/use-rfis';
import { RFIForm } from '@/components/forms/rfi-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type RFIStatus = 'DRAFT' | 'OPEN' | 'ANSWERED' | 'CLOSED' | 'CANCELLED';
type RFIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  OPEN: { label: 'Open', icon: MessageSquare, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  ANSWERED: { label: 'Answered', icon: CheckCircle2, color: 'text-green-500 bg-green-100', badge: 'default' },
  CLOSED: { label: 'Closed', icon: XCircle, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-red-500 bg-red-100', badge: 'destructive' },
};

const priorityConfig = {
  LOW: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
  MEDIUM: { label: 'Medium', color: 'text-blue-600 bg-blue-100' },
  HIGH: { label: 'High', color: 'text-orange-600 bg-orange-100' },
  URGENT: { label: 'Urgent', color: 'text-red-600 bg-red-100' },
};

export default function RFIsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<RFIStatus | null>(null);
  const [selectedPriority, setSelectedPriority] = React.useState<RFIPriority | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedRFI, setSelectedRFI] = React.useState<RFI | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: rfis = [], isLoading: rfisLoading } = useRFIs({
    projectId,
    status: selectedStatus || undefined,
    priority: selectedPriority || undefined,
  });

  const createRFI = useCreateRFI();
  const updateRFI = useUpdateRFI();
  const deleteRFI = useDeleteRFI();

  // Filter RFIs (filtering by status/priority is done by the API, this is just for search)
  const filteredRFIs = React.useMemo(() => {
    return rfis.filter((rfi) => {
      const matchesSearch =
        !searchQuery ||
        rfi.rfiNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfi.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfi.question.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [rfis, searchQuery]);

  // Calculate RFI stats
  const rfiStats = React.useMemo(() => {
    const byStatus = rfis.reduce((acc, rfi) => {
      acc[rfi.status] = (acc[rfi.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = rfis.filter(
      (rfi) => rfi.dueDate && rfi.dueDate < new Date() && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED'
    ).length;

    const avgResponseTime = rfis
      .filter((rfi) => rfi.answeredDate)
      .reduce((sum, rfi) => {
        const days = Math.ceil(
          (rfi.answeredDate!.getTime() - rfi.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);

    return {
      total: rfis.length,
      open: byStatus.OPEN || 0,
      answered: byStatus.ANSWERED || 0,
      closed: byStatus.CLOSED || 0,
      overdue,
      avgResponseDays: rfis.filter((r) => r.answeredDate).length > 0
        ? Math.round(avgResponseTime / rfis.filter((r) => r.answeredDate).length)
        : 0,
    };
  }, [rfis]);

  const isOverdue = (rfi: RFI): boolean => {
    return !!(rfi.dueDate && rfi.dueDate < new Date() && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED');
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createRFI.mutateAsync({
        projectId,
        title: data.title,
        question: data.question,
        priority: data.priority,
        discipline: data.discipline,
        drawingReference: data.drawingReference,
        specReference: data.specReference,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      toast({
        title: 'Success',
        description: 'RFI created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create RFI',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedRFI) return;
    try {
      await updateRFI.mutateAsync({
        id: selectedRFI.id,
        data: {
          title: data.title,
          question: data.question,
          status: data.status,
          priority: data.priority,
          assignedTo: data.assignedTo,
          answer: data.answer,
        },
      });
      toast({
        title: 'Success',
        description: 'RFI updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedRFI(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update RFI',
        variant: 'destructive',
      });
    }
  };

  const handleAnswerSubmit = async (data: any) => {
    if (!selectedRFI) return;
    try {
      await updateRFI.mutateAsync({
        id: selectedRFI.id,
        data: {
          answer: data.answer,
          status: 'ANSWERED',
        },
      });
      toast({
        title: 'Success',
        description: 'RFI answered successfully',
      });
      setAnswerDialogOpen(false);
      setSelectedRFI(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to answer RFI',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedRFI) return;
    try {
      await deleteRFI.mutateAsync(selectedRFI.id);
      toast({
        title: 'Success',
        description: 'RFI deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedRFI(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete RFI',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || rfisLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">RFIs</h2>
          <p className="text-muted-foreground">Requests for Information management</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New RFI
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total RFIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfiStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{rfiStats.open}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rfiStats.overdue > 0 && (
                <span className="text-red-600">{rfiStats.overdue} overdue</span>
              )}
              {rfiStats.overdue === 0 && <span>On track</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Answered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{rfiStats.answered}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending closure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{rfiStats.avgResponseDays}</div>
            <p className="text-xs text-muted-foreground mt-1">Days to answer</p>
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
                  placeholder="Search RFIs..."
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
                    onClick={() => setSelectedStatus(status as RFIStatus)}
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
          {filteredRFIs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No RFIs found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus(null);
                    setSelectedPriority(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First RFI
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRFIs.map((rfi) => {
                const statusInfo = statusConfig[rfi.status];
                const priorityInfo = priorityConfig[rfi.priority];
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(rfi);

                return (
                  <div
                    key={rfi.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-accent transition-colors',
                      overdue && 'border-red-200 bg-red-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* RFI Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* RFI Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {rfi.rfiNumber}
                              </Badge>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              <Badge className={priorityInfo.color}>
                                {priorityInfo.label}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{rfi.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {rfi.question}
                            </p>

                            {/* Response (if answered) */}
                            {rfi.answer && (
                              <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-900">Response</span>
                                </div>
                                <p className="text-sm text-green-800">{rfi.answer}</p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Submitted by user {rfi.submittedBy}</span>
                              </div>
                              {rfi.assignedTo && (
                                <div className="flex items-center gap-1">
                                  <ArrowRight className="h-4 w-4" />
                                  <span>Assigned to user {rfi.assignedTo}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(rfi.createdAt)}</span>
                              </div>
                              {rfi.dueDate && (
                                <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                                  <Clock className="h-4 w-4" />
                                  <span>Due {formatDate(rfi.dueDate)}</span>
                                </div>
                              )}
                              {rfi.attachments && rfi.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-4 w-4" />
                                  <span>{rfi.attachments.length} attachments</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {rfi.status === 'OPEN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRFI(rfi);
                                  setAnswerDialogOpen(true);
                                }}
                                title="Answer RFI"
                              >
                                <Send className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRFI(rfi);
                                setEditDialogOpen(true);
                              }}
                              title="Edit RFI"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRFI(rfi);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete RFI"
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

      {/* RFI Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>RFI Workflow</CardTitle>
          <CardDescription>Understanding the RFI process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { status: 'DRAFT', step: '1. Draft', description: 'Create and refine RFI' },
              { status: 'OPEN', step: '2. Submit', description: 'Send to responsible party' },
              { status: 'ANSWERED', step: '3. Answer', description: 'Receive response' },
              { status: 'CLOSED', step: '4. Review', description: 'Accept and close' },
              { status: 'CLOSED', step: '5. Complete', description: 'RFI resolved' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as RFIStatus];
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

      {/* Create RFI Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create RFI</DialogTitle>
            <DialogDescription>Submit a new Request for Information</DialogDescription>
          </DialogHeader>
          <RFIForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createRFI.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit RFI Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit RFI</DialogTitle>
            <DialogDescription>Update RFI details</DialogDescription>
          </DialogHeader>
          {selectedRFI && (
            <RFIForm
              projectId={projectId}
              initialData={{
                title: selectedRFI.title,
                question: selectedRFI.question,
                priority: selectedRFI.priority,
                discipline: selectedRFI.discipline,
                drawingReference: selectedRFI.drawingReference,
                specReference: selectedRFI.specReference,
                dueDate: selectedRFI.dueDate ? new Date(selectedRFI.dueDate).toISOString().split('T')[0] : '',
                status: selectedRFI.status,
                answer: selectedRFI.answer,
                assignedTo: selectedRFI.assignedTo,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedRFI(null);
              }}
              isLoading={updateRFI.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Answer RFI Dialog */}
      <Dialog open={answerDialogOpen} onOpenChange={setAnswerDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Answer RFI</DialogTitle>
            <DialogDescription>Provide response to this RFI</DialogDescription>
          </DialogHeader>
          {selectedRFI && (
            <RFIForm
              projectId={projectId}
              initialData={{
                title: selectedRFI.title,
                question: selectedRFI.question,
                priority: selectedRFI.priority,
                discipline: selectedRFI.discipline,
                drawingReference: selectedRFI.drawingReference,
                specReference: selectedRFI.specReference,
                answer: selectedRFI.answer,
              }}
              onSubmit={handleAnswerSubmit}
              onCancel={() => {
                setAnswerDialogOpen(false);
                setSelectedRFI(null);
              }}
              isLoading={updateRFI.isPending}
              mode="answer"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete RFI Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete RFI</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete RFI "{selectedRFI?.rfiNumber}: {selectedRFI?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedRFI(null);
              }}
              disabled={deleteRFI.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRFI.isPending}
            >
              {deleteRFI.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete RFI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
