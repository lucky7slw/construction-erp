'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateLead } from '@/lib/query/hooks/use-leads';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/lib/store/auth-store';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  source: z.string().min(1, 'Source is required'),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LEAD_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
];

const LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'EMAIL', label: 'Email Campaign' },
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'EVENT', label: 'Event' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { user } = useAuthStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'NEW',
      source: 'WEBSITE',
      value: undefined,
      probability: 50,
      expectedCloseDate: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const companyId = user?.companies?.[0]?.id;
    if (!companyId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Company information is missing',
      });
      return;
    }

    try {
      const payload = {
        companyId,
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        source: values.source,
        value: values.value,
        probability: values.probability,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : undefined,
        contactName: values.contactName,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        contactAddress: values.contactAddress || undefined,
      };

      const result = await createLead.mutateAsync(payload);

      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });

      router.push(`/crm/${result.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create lead',
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Lead</h1>
          <p className="text-muted-foreground">
            Add a new lead to your sales pipeline
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>
              Basic details about the opportunity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Lead Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Kitchen Renovation Project - Smith Residence"
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the opportunity"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.status && (
                  <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
                )}
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select
                  value={form.watch('source')}
                  onValueChange={(value) => form.setValue('source', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.source && (
                  <p className="text-sm text-destructive">{form.formState.errors.source.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Value */}
              <div className="space-y-2">
                <Label htmlFor="value">Estimated Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('value', { valueAsNumber: true })}
                />
              </div>

              {/* Probability */}
              <div className="space-y-2">
                <Label htmlFor="probability">Probability %</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  {...form.register('probability', { valueAsNumber: true })}
                />
              </div>

              {/* Expected Close Date */}
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  {...form.register('expectedCloseDate')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Details about the primary contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                placeholder="John Smith"
                {...form.register('contactName')}
              />
              {form.formState.errors.contactName && (
                <p className="text-sm text-destructive">{form.formState.errors.contactName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Contact Email */}
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="john@example.com"
                  {...form.register('contactEmail')}
                />
                {form.formState.errors.contactEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactEmail.message}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...form.register('contactPhone')}
                />
              </div>
            </div>

            {/* Contact Address */}
            <div className="space-y-2">
              <Label htmlFor="contactAddress">Address</Label>
              <Textarea
                id="contactAddress"
                placeholder="123 Main St, City, State, ZIP"
                rows={2}
                {...form.register('contactAddress')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/crm">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createLead.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </div>
  );
}
