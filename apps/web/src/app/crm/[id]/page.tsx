'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Trash2, Mail, Phone, MapPin, DollarSign, TrendingUp, Calendar, User } from 'lucide-react';
import { useLead, useUpdateLead, useDeleteLead, useConvertLead } from '@/lib/query/hooks/use-leads';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

const LEAD_STATUSES = [
  { value: 'NEW', label: 'New', color: 'bg-blue-500' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-purple-500' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-yellow-500' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'bg-orange-500' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-pink-500' },
  { value: 'WON', label: 'Won', color: 'bg-green-500' },
  { value: 'LOST', label: 'Lost', color: 'bg-gray-500' },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const leadId = params?.id as string;

  const { data: lead, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateLead.mutateAsync({
        id: leadId,
        data: { status: newStatus },
      });
      toast({
        title: 'Success',
        description: 'Lead status updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
      });
    }
  };

  const handleConvert = async () => {
    if (!confirm('Convert this lead to a customer? This will mark it as won and create a customer record.')) {
      return;
    }

    try {
      await convertLead.mutateAsync(leadId);
      toast({
        title: 'Success',
        description: 'Lead converted to customer successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to convert lead',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      await deleteLead.mutateAsync(leadId);
      toast({
        title: 'Success',
        description: 'Lead deleted successfully',
      });
      router.push('/crm');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete lead',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading lead...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Lead not found</p>
            <Button className="mt-4" asChild>
              <Link href="/crm">Back to CRM</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = LEAD_STATUSES.find(s => s.value === lead.status);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.title}</h1>
            <p className="text-muted-foreground">
              Lead Details
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {lead.status !== 'WON' && lead.status !== 'LOST' && (
            <Button
              onClick={handleConvert}
              disabled={convertLead.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {convertLead.isPending ? 'Converting...' : 'Convert to Customer'}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteLead.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Information</CardTitle>
                <Badge className={`${currentStatus?.color} text-white`}>
                  {currentStatus?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Update */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={lead.status}
                  onValueChange={handleStatusChange}
                  disabled={updateLead.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lead.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-base whitespace-pre-wrap">{lead.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {lead.value && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(Number(lead.value))}</p>
                  </div>
                )}

                {lead.probability !== null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Probability</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">{lead.probability}%</p>
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {lead.expectedCloseDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Close Date</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{format(new Date(lead.expectedCloseDate), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              )}

              {lead.source && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Source</p>
                  <p className="text-base">{lead.source}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-medium">{lead.contactName}</p>
                </div>
              </div>

              {lead.contactEmail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.contactEmail}`} className="text-base text-primary hover:underline">
                      {lead.contactEmail}
                    </a>
                  </div>
                </div>
              )}

              {lead.contactPhone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.contactPhone}`} className="text-base text-primary hover:underline">
                      {lead.contactPhone}
                    </a>
                  </div>
                </div>
              )}

              {lead.contactAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <p className="text-base">{lead.contactAddress}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.qualificationScore !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Qualification Score</p>
                  <p className="text-2xl font-bold">{lead.qualificationScore}/100</p>
                </div>
              )}

              {lead.convertedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Converted On</p>
                  <p className="text-sm">
                    {format(new Date(lead.convertedAt), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {lead.lostReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Lost Reason</p>
                  <p className="text-sm">{lead.lostReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
              {lead.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {format(new Date(lead.updatedAt), 'MMM d, yyyy h:mm a')}
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
