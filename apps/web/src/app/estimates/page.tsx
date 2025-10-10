'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Calendar, DollarSign, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEstimates, useApproveEstimate } from '@/lib/query/hooks/use-estimates';
import { useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function EstimatesPage() {
  const { user } = useAuthStore();
  const { data: estimates, isLoading, error } = useEstimates();
  const { toast } = useToast();
  const approveEstimate = useApproveEstimate();

  const handleApprove = async (estimateId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await approveEstimate.mutateAsync(estimateId);
      toast({
        title: 'Success',
        description: 'Estimate approved successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve estimate',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estimates & Quotes</h1>
            <p className="text-muted-foreground">Loading estimates...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted"></CardHeader>
              <CardContent className="h-40 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estimates & Quotes</h1>
            <p className="text-muted-foreground text-destructive">
              Error loading estimates: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500';
      case 'DRAFT':
        return 'bg-blue-500';
      case 'SENT':
        return 'bg-purple-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates & Quotes</h1>
          <p className="text-muted-foreground">
            Create and manage estimates for your construction projects.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/estimates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Estimate
            </Link>
          </Button>
        </div>
      </div>

      {!estimates || estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No estimates yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Get started by creating your first estimate or quote for a project.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/estimates/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Estimate
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {estimates.map((estimate) => (
            <Link key={estimate.id} href={`/estimates/${estimate.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{estimate.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {estimate.project?.name || 'No Project'}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(estimate.status)} text-white flex items-center gap-1`}
                    >
                      {getStatusIcon(estimate.status)}
                      {formatStatus(estimate.status)}
                    </Badge>
                  </div>
                  {estimate.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {estimate.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(estimate.totalAmount)}
                    </span>
                  </div>
                  {estimate.validUntil && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Valid until {new Date(estimate.validUntil).toLocaleDateString()}
                    </div>
                  )}
                  {estimate.createdAt && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Created {formatDistanceToNow(new Date(estimate.createdAt), { addSuffix: true })}
                    </div>
                  )}
                  {estimate.status === 'PENDING' && (
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => handleApprove(estimate.id, e)}
                      disabled={approveEstimate.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve Estimate
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
