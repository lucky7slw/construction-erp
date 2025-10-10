'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Edit,
  Trash2,
  Plus,
  Pencil,
} from 'lucide-react';
import { useEstimate, useApproveEstimate, useDeleteEstimate, useAddLineItem } from '@/lib/query/hooks/use-estimates';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { LineItemForm } from '@/components/estimates/line-item-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const estimateId = params.id as string;

  const { data: estimate, isLoading, error } = useEstimate(estimateId);
  const approveEstimate = useApproveEstimate();
  const deleteEstimate = useDeleteEstimate();
  const addLineItem = useAddLineItem();

  const [showLineItemForm, setShowLineItemForm] = React.useState(false);

  const handleApprove = async () => {
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this estimate?')) {
      return;
    }

    try {
      await deleteEstimate.mutateAsync(estimateId);
      toast({
        title: 'Success',
        description: 'Estimate deleted successfully',
      });
      router.push('/estimates');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete estimate',
      });
    }
  };

  const handleAddLineItem = async (values: any) => {
    try {
      await addLineItem.mutateAsync({
        estimateId,
        data: values,
      });
      toast({
        title: 'Success',
        description: 'Line item added successfully',
      });
      setShowLineItemForm(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add line item',
      });
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500';
      case 'IN_REVIEW': return 'bg-blue-500';
      case 'DRAFT': return 'bg-gray-500';
      case 'CONVERTED': return 'bg-purple-500';
      case 'ARCHIVED': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading estimate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Estimate Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'The estimate you are looking for does not exist.'}
            </p>
            <Button asChild>
              <Link href="/estimates">Back to Estimates</Link>
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
            <Link href="/estimates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{estimate.name}</h1>
            <p className="text-muted-foreground">
              Estimate #{estimate.estimateNumber} • Created {format(new Date(estimate.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(estimate.status)}>
            {estimate.status}
          </Badge>
          {estimate.status === 'DRAFT' && (
            <Button onClick={handleApprove} disabled={approveEstimate.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteEstimate.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subtotal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(estimate.subtotal))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overhead ({estimate.overheadPercent}%)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(estimate.overheadAmount))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit ({estimate.profitPercent}%)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(estimate.profitAmount))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(estimate.total))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="line-items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="line-items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>{estimate.lineItems?.length || 0} items in this estimate</CardDescription>
                </div>
                {estimate.status === 'DRAFT' && (
                  <Button onClick={() => setShowLineItemForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!estimate.lineItems || estimate.lineItems.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-muted-foreground">No line items</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add line items to this estimate.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Category</th>
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-left p-2 font-medium">Unit</th>
                        <th className="text-right p-2 font-medium">Unit Cost</th>
                        <th className="text-right p-2 font-medium">Subtotal</th>
                        <th className="text-right p-2 font-medium">Markup</th>
                        <th className="text-right p-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.lineItems.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-accent">
                          <td className="p-2">
                            <Badge variant="outline">{item.category}</Badge>
                          </td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{Number(item.quantity).toFixed(2)}</td>
                          <td className="p-2">{item.unit}</td>
                          <td className="p-2 text-right">{formatCurrency(Number(item.unitCost))}</td>
                          <td className="p-2 text-right">{formatCurrency(Number(item.subtotal))}</td>
                          <td className="p-2 text-right">{Number(item.markup).toFixed(2)}%</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={7} className="p-2 text-right">Grand Total:</td>
                        <td className="p-2 text-right">{formatCurrency(Number(estimate.total))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="text-sm">{estimate.project?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Version</label>
                  <p className="text-sm">v{estimate.version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <p className="text-sm">
                    {estimate.createdBy?.firstName} {estimate.createdBy?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                  <p className="text-sm">
                    {estimate.validUntil ? format(new Date(estimate.validUntil), 'MMM d, yyyy') : 'No expiration'}
                  </p>
                </div>
              </div>
              {estimate.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1">{estimate.description}</p>
                </div>
              )}
              {estimate.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{estimate.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Line Item Form Dialog */}
      <Dialog open={showLineItemForm} onOpenChange={setShowLineItemForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Add a new line item to this estimate. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <LineItemForm
            onSubmit={handleAddLineItem}
            onCancel={() => setShowLineItemForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
