'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Clock,
  Receipt,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useSendInvoice, useRecordPayment } from '@/lib/query/hooks/use-invoices';
import { InvoiceForm } from '@/components/forms/invoice-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  dueDate: string;
  paidAt?: string;
  sentAt?: string;
  notes?: string;
  companyId: string;
  customerId: string;
  projectId?: string;
  quoteId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  project?: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    createdAt: string;
  }>;
}

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100' },
  SENT: { label: 'Sent', icon: Send, color: 'text-blue-500 bg-blue-100' },
  PAID: { label: 'Paid', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
  PARTIALLY_PAID: { label: 'Partially Paid', icon: DollarSign, color: 'text-orange-500 bg-orange-100' },
  OVERDUE: { label: 'Overdue', icon: AlertCircle, color: 'text-red-500 bg-red-100' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-gray-500 bg-gray-100' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function InvoicesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<InvoiceStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = React.useState('');
  const [paymentNotes, setPaymentNotes] = React.useState('');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({
    projectId,
    status: selectedStatus || undefined,
  });

  const invoices = invoicesResponse?.invoices || [];

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const recordPayment = useRecordPayment();

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((invoice: Invoice) => {
      const matchesSearch =
        !searchQuery ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [invoices, searchQuery]);

  // Calculate invoice stats
  const invoiceStats = React.useMemo(() => {
    const totalInvoiced = invoices.reduce((sum: number, inv: Invoice) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum: number, inv: Invoice) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices
      .filter((inv: Invoice) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .reduce((sum: number, inv: Invoice) => sum + (inv.total - inv.paidAmount), 0);

    const overdue = invoices.filter(
      (inv: Invoice) =>
        new Date(inv.dueDate) < new Date() &&
        inv.status !== 'PAID' &&
        inv.status !== 'CANCELLED'
    ).length;

    const byStatus = invoices.reduce((acc: any, inv: Invoice) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: invoices.length,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdue,
      paid: byStatus.PAID || 0,
      sent: byStatus.SENT || 0,
      draft: byStatus.DRAFT || 0,
    };
  }, [invoices]);

  const isOverdue = (invoice: Invoice): boolean => {
    return !!(
      new Date(invoice.dueDate) < new Date() &&
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED'
    );
  };

  const handleCreateSubmit = async (data: any) => {
    if (!project) return;

    try {
      await createInvoice.mutateAsync({
        companyId: project.companyId,
        customerId: data.customerId,
        projectId: data.projectId || projectId,
        quoteId: data.quoteId,
        title: data.title,
        description: data.description,
        taxRate: data.taxRate,
        dueDate: data.dueDate,
        notes: data.notes,
        items: data.items,
      });
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedInvoice) return;
    try {
      await updateInvoice.mutateAsync({
        id: selectedInvoice.id,
        data: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          notes: data.notes,
        },
      });
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice',
        variant: 'destructive',
      });
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      await sendInvoice.mutateAsync(invoice.id);
      toast({
        title: 'Success',
        description: 'Invoice sent to customer',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice',
        variant: 'destructive',
      });
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      await recordPayment.mutateAsync({
        id: selectedInvoice.id,
        data: {
          amount,
          paymentMethod,
          reference: paymentReference || undefined,
          notes: paymentNotes || undefined,
        },
      });
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      setPaymentMethod('BANK_TRANSFER');
      setPaymentReference('');
      setPaymentNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    try {
      await deleteInvoice.mutateAsync(selectedInvoice.id);
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || invoicesLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage customer invoices and payments</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoiceStats.totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoiceStats.total} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(invoiceStats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoiceStats.paid} paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(invoiceStats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceStats.overdue > 0 && (
                <span className="text-red-600">{invoiceStats.overdue} overdue</span>
              )}
              {invoiceStats.overdue === 0 && <span>All current</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{invoiceStats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
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
                    placeholder="Search invoices..."
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
              {(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as InvoiceStatus[]).map((status) => {
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
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
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
              {filteredInvoices.map((invoice: Invoice) => {
                const statusInfo = statusConfig[invoice.status];
                const StatusIcon = statusInfo.icon;
                const overdue = isOverdue(invoice);
                const outstandingAmount = invoice.total - invoice.paidAmount;

                return (
                  <div
                    key={invoice.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-accent transition-colors',
                      overdue && 'border-red-200 bg-red-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Invoice Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Invoice Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {invoice.invoiceNumber}
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

                            <h3 className="font-semibold mb-1">{invoice.title}</h3>

                            {/* Customer Info */}
                            <div className="flex items-center gap-4 mb-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{invoice.customer.name}</span>
                              </div>
                              {invoice.customer.email && (
                                <span className="text-muted-foreground">{invoice.customer.email}</span>
                              )}
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                                  <p className="font-semibold">{formatCurrency(invoice.subtotal)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Tax ({invoice.taxRate}%)</p>
                                  <p className="font-semibold">{formatCurrency(invoice.taxAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                                  <p className="text-lg font-bold text-blue-900">{formatCurrency(invoice.total)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Paid</p>
                                  <p className={cn("font-semibold", invoice.paidAmount > 0 && "text-green-600")}>
                                    {formatCurrency(invoice.paidAmount)}
                                  </p>
                                </div>
                              </div>
                              {invoice.paidAmount < invoice.total && (
                                <div className="mt-2 pt-2 border-t border-blue-300">
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs font-medium text-blue-900">Outstanding:</p>
                                    <p className="font-bold text-orange-600">{formatCurrency(outstandingAmount)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Line Items Summary */}
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Items ({invoice.items.length})
                              </p>
                              <div className="space-y-1">
                                {invoice.items.slice(0, 2).map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span>{item.description}</span>
                                    <span className="text-muted-foreground">
                                      {item.quantity} × {formatCurrency(item.unitPrice)}
                                    </span>
                                  </div>
                                ))}
                                {invoice.items.length > 2 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{invoice.items.length - 2} more items
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {invoice.createdBy.firstName} {invoice.createdBy.lastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(invoice.createdAt)}</span>
                              </div>
                              <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                                <Clock className="h-4 w-4" />
                                <span>Due {formatDate(invoice.dueDate)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2">
                            {invoice.status === 'DRAFT' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSendInvoice(invoice)}
                                disabled={sendInvoice.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </Button>
                            )}
                            {(invoice.status === 'SENT' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentAmount((invoice.total - invoice.paidAmount).toString());
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                Record Payment
                              </Button>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setEditDialogOpen(true);
                                }}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {invoice.status === 'DRAFT' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
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

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for your customer</DialogDescription>
          </DialogHeader>
          <InvoiceForm
            companyId={project?.companyId || ''}
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createInvoice.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>Update invoice details</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceForm
              companyId={selectedInvoice.companyId}
              projectId={selectedInvoice.projectId}
              initialData={{
                companyId: selectedInvoice.companyId,
                customerId: selectedInvoice.customerId,
                projectId: selectedInvoice.projectId,
                quoteId: selectedInvoice.quoteId,
                title: selectedInvoice.title,
                description: selectedInvoice.description,
                taxRate: selectedInvoice.taxRate,
                dueDate: new Date(selectedInvoice.dueDate).toISOString().split('T')[0],
                notes: selectedInvoice.notes,
                items: selectedInvoice.items,
              }}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedInvoice(null);
              }}
              isLoading={updateInvoice.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Invoice Total:</span>
                  <span className="font-semibold">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Already Paid:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="font-medium">Outstanding:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(selectedInvoice.total - selectedInvoice.paidAmount)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference Number</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or check number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Input
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setSelectedInvoice(null);
                  setPaymentAmount('');
                  setPaymentMethod('BANK_TRANSFER');
                  setPaymentReference('');
                  setPaymentNotes('');
                }}
                disabled={recordPayment.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={recordPayment.isPending}
              >
                {recordPayment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice "{selectedInvoice?.invoiceNumber}"? This action cannot be undone.
              <br />
              <span className="text-red-600 text-sm mt-2 block">Note: Only draft invoices can be deleted.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedInvoice(null);
              }}
              disabled={deleteInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
