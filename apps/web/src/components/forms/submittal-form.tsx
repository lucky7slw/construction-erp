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
  type: z.enum(['SHOP_DRAWING', 'PRODUCT_DATA', 'SAMPLE', 'MOCK_UP', 'TEST_REPORT', 'CERTIFICATION', 'WARRANTY', 'OTHER']),
  description: z.string().optional(),
  specSection: z.string().optional(),
  drawingReference: z.string().optional(),
  dueDate: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'APPROVED_WITH_COMMENTS', 'REJECTED', 'RESUBMIT_REQUIRED']).optional(),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmittalFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const typeOptions = [
  { value: 'SHOP_DRAWING', label: 'Shop Drawing' },
  { value: 'PRODUCT_DATA', label: 'Product Data' },
  { value: 'SAMPLE', label: 'Sample' },
  { value: 'MOCK_UP', label: 'Mock-up' },
  { value: 'TEST_REPORT', label: 'Test Report' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'WARRANTY', label: 'Warranty' },
  { value: 'OTHER', label: 'Other' },
];

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'APPROVED_WITH_COMMENTS', label: 'Approved with Comments' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESUBMIT_REQUIRED', label: 'Resubmit Required' },
];

export function SubmittalForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: SubmittalFormProps) {
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
      type: initialData?.type || 'SHOP_DRAWING',
      description: initialData?.description || '',
      specSection: initialData?.specSection || '',
      drawingReference: initialData?.drawingReference || '',
      dueDate: initialData?.dueDate || '',
      manufacturer: initialData?.manufacturer || '',
      model: initialData?.model || '',
      status: initialData?.status || 'DRAFT',
      comments: initialData?.comments || '',
    },
  });

  const type = watch('type');
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
          placeholder="Brief description of submittal"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select
            value={type}
            onValueChange={(value) => setValue('type', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
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
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Detailed description of submittal"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Spec Section */}
        <div className="space-y-2">
          <Label htmlFor="specSection">Spec Section</Label>
          <Input
            id="specSection"
            {...register('specSection')}
            placeholder="e.g., 03300"
          />
        </div>

        {/* Drawing Reference */}
        <div className="space-y-2">
          <Label htmlFor="drawingReference">Drawing Reference</Label>
          <Input
            id="drawingReference"
            {...register('drawingReference')}
            placeholder="e.g., A-101"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate')}
          />
        </div>

        {/* Manufacturer */}
        <div className="space-y-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            {...register('manufacturer')}
            placeholder="Manufacturer name"
          />
        </div>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label htmlFor="model">Model / Product Number</Label>
        <Input
          id="model"
          {...register('model')}
          placeholder="Model or product number"
        />
      </div>

      {/* Review Comments (only in edit mode) */}
      {mode === 'edit' && (
        <div className="space-y-2">
          <Label htmlFor="comments">Review Comments</Label>
          <Textarea
            id="comments"
            {...register('comments')}
            placeholder="Comments from review process"
            rows={3}
          />
        </div>
      )}

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Files can be attached after creating the submittal.
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
          {mode === 'create' ? 'Create Submittal' : 'Update Submittal'}
        </Button>
      </div>
    </form>
  );
}
