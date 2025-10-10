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
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  date: z.date(),
  hours: z.number().positive('Hours must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  billable: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TimeEntryFormProps {
  projectId: string;
  initialData?: Partial<FormData & { date?: string | Date }>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function TimeEntryForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: TimeEntryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      hours: initialData?.hours || 0,
      description: initialData?.description || '',
      billable: initialData?.billable ?? true,
      notes: initialData?.notes || '',
      status: initialData?.status || 'PENDING',
    },
  });

  const status = watch('status');
  const billable = watch('billable');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            {...register('date', {
              setValueAs: (v) => (v ? new Date(v) : new Date()),
            })}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* Hours */}
        <div className="space-y-2">
          <Label htmlFor="hours">Hours *</Label>
          <Input
            id="hours"
            type="number"
            step="0.25"
            min="0"
            {...register('hours', {
              setValueAs: (v) => (v ? parseFloat(v) : 0),
            })}
            placeholder="e.g., 8.5"
          />
          {errors.hours && (
            <p className="text-sm text-destructive">{errors.hours.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="What work was performed?"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or details"
          rows={2}
        />
      </div>

      {/* Billable Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="billable"
          checked={billable}
          onCheckedChange={(checked) => setValue('billable', checked as boolean)}
        />
        <Label
          htmlFor="billable"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Billable time
        </Label>
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

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Time entry will be submitted for approval.
          </p>
        </div>
      )}

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
          {mode === 'create' ? 'Log Time' : 'Update Time Entry'}
        </Button>
      </div>
    </form>
  );
}
