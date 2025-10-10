'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  reason: z.string().min(1, 'Reason is required'),
  costImpact: z.coerce.number(),
  timeImpact: z.coerce.number().min(0),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ChangeOrderFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'IMPLEMENTED', label: 'Implemented' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function ChangeOrderForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: ChangeOrderFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      reason: initialData?.reason || '',
      costImpact: initialData?.costImpact || 0,
      timeImpact: initialData?.timeImpact || 0,
      status: initialData?.status || 'DRAFT',
      notes: initialData?.notes || '',
    },
  });

  const status = watch('status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Brief description of the change"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Detailed description of the change order"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason *</Label>
        <Textarea
          id="reason"
          {...register('reason')}
          placeholder="Why is this change necessary?"
          rows={2}
        />
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Cost Impact */}
        <div className="space-y-2">
          <Label htmlFor="costImpact">Cost Impact ($) *</Label>
          <Input
            id="costImpact"
            type="number"
            step="0.01"
            {...register('costImpact')}
            placeholder="0.00"
          />
          {errors.costImpact && (
            <p className="text-sm text-destructive">{errors.costImpact.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Positive for additional cost, negative for savings
          </p>
        </div>

        {/* Time Impact */}
        <div className="space-y-2">
          <Label htmlFor="timeImpact">Time Impact (days) *</Label>
          <Input
            id="timeImpact"
            type="number"
            {...register('timeImpact')}
            placeholder="0"
          />
          {errors.timeImpact && (
            <p className="text-sm text-destructive">{errors.timeImpact.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Number of days added to schedule
          </p>
        </div>
      </div>

      {/* Status (only in edit mode) */}
      {mode === 'edit' && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setValue('status', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or comments"
          rows={2}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {(isSubmitting || isLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {mode === 'create' ? 'Create Change Order' : 'Update Change Order'}
        </Button>
      </div>
    </form>
  );
}
