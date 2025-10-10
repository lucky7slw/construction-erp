'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Edit } from 'lucide-react';
import { useTimeEntry, useApproveTimeEntry, useRejectTimeEntry, useDeleteTimeEntry } from '@/lib/query/hooks/use-time-entries';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

export default function TimeEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const timeEntryId = params?.id as string;

  const { data: timeEntry, isLoading } = useTimeEntry(timeEntryId);
  const approveTimeEntry = useApproveTimeEntry();
  const rejectTimeEntry = useRejectTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500';
      case 'REJECTED':
        return 'bg-red-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const handleApprove = async () => {
    try {
      await approveTimeEntry.mutateAsync(timeEntryId);
      toast({
        title: 'Success',
        description: 'Time entry approved successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve time entry',
      });
    }
  };

  const handleReject = async () => {
    try {
      await rejectTimeEntry.mutateAsync(timeEntryId);
      toast({
        title: 'Success',
        description: 'Time entry rejected',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject time entry',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      await deleteTimeEntry.mutateAsync(timeEntryId);
      toast({
        title: 'Success',
        description: 'Time entry deleted successfully',
      });
      router.push('/time');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete time entry',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading time entry...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeEntry) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Time entry not found</p>
            <Button className="mt-4" asChild>
              <Link href="/time">Back to Time Tracking</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/time">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Entry Details</h1>
            <p className="text-muted-foreground">
              {format(new Date(timeEntry.date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {timeEntry.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={rejectTimeEntry.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approveTimeEntry.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {approveTimeEntry.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTimeEntry.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Entry Information</CardTitle>
                <Badge className={`${getStatusColor(timeEntry.status)} text-white`}>
                  {timeEntry.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-lg">{format(new Date(timeEntry.date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hours</p>
                  <p className="text-lg font-bold">{formatDuration(Number(timeEntry.hours))}</p>
                </div>
              </div>

              {timeEntry.project && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project</p>
                  <p className="text-lg">{timeEntry.project.name}</p>
                </div>
              )}

              {timeEntry.task && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Task</p>
                  <p className="text-lg">{timeEntry.task.title}</p>
                </div>
              )}

              {timeEntry.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base whitespace-pre-wrap">{timeEntry.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeEntry.user && (
                <div>
                  <p className="text-sm text-muted-foreground">Submitted by</p>
                  <p className="font-medium">
                    {timeEntry.user.firstName} {timeEntry.user.lastName}
                  </p>
                  {timeEntry.user.email && (
                    <p className="text-sm text-muted-foreground">{timeEntry.user.email}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeEntry.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {format(new Date(timeEntry.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
              {timeEntry.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Last updated</p>
                  <p className="text-sm">
                    {format(new Date(timeEntry.updatedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
