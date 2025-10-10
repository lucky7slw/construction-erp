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
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  estimateId: z.string().optional(),
  drawingReference: z.string().optional(),
  scale: z.string().optional(),
  unit: z.enum(['FEET', 'METERS', 'INCHES', 'CENTIMETERS']).optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TakeoffFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const unitOptions = [
  { value: 'FEET', label: 'Feet (ft)' },
  { value: 'METERS', label: 'Meters (m)' },
  { value: 'INCHES', label: 'Inches (in)' },
  { value: 'CENTIMETERS', label: 'Centimeters (cm)' },
];

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved' },
];

export function TakeoffForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: TakeoffFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      estimateId: initialData?.estimateId || '',
      drawingReference: initialData?.drawingReference || '',
      scale: initialData?.scale || '',
      unit: initialData?.unit || 'FEET',
      status: initialData?.status || 'DRAFT',
    },
  });

  const unit = watch('unit');
  const status = watch('status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Takeoff Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Main Floor Plan Takeoff"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Brief description of this takeoff"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Drawing Reference */}
        <div className="space-y-2">
          <Label htmlFor="drawingReference">Drawing Reference</Label>
          <Input
            id="drawingReference"
            {...register('drawingReference')}
            placeholder="e.g., A-101, Sheet 5"
          />
        </div>

        {/* Estimate ID */}
        <div className="space-y-2">
          <Label htmlFor="estimateId">Estimate ID (Optional)</Label>
          <Input
            id="estimateId"
            {...register('estimateId')}
            placeholder="Link to estimate"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Scale */}
        <div className="space-y-2">
          <Label htmlFor="scale">Scale</Label>
          <Input
            id="scale"
            type="number"
            step="0.01"
            {...register('scale')}
            placeholder="e.g., 1/4 = 0.25"
          />
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="unit">Measurement Unit</Label>
          <Select
            value={unit}
            onValueChange={(value) => setValue('unit', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Layers and measurements can be added after creating the takeoff.
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
          {mode === 'create' ? 'Create Takeoff' : 'Update Takeoff'}
        </Button>
      </div>
    </form>
  );
}
