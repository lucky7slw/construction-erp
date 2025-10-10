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
  category: z.enum([
    'FLOORING',
    'CABINETS',
    'COUNTERTOPS',
    'APPLIANCES',
    'FIXTURES',
    'LIGHTING',
    'TILE',
    'PAINT',
    'HARDWARE',
    'OTHER',
  ]),
  room: z.string().optional(),
  dueDate: z.date().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'SELECTED', 'APPROVED', 'ORDERED', 'INSTALLED', 'REJECTED']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SelectionFormProps {
  projectId: string;
  initialData?: Partial<FormData & { dueDate?: string | Date }>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const categoryOptions = [
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'CABINETS', label: 'Cabinets' },
  { value: 'COUNTERTOPS', label: 'Countertops' },
  { value: 'APPLIANCES', label: 'Appliances' },
  { value: 'FIXTURES', label: 'Fixtures' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'TILE', label: 'Tile' },
  { value: 'PAINT', label: 'Paint' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'OTHER', label: 'Other' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'INSTALLED', label: 'Installed' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function SelectionForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: SelectionFormProps) {
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
      category: initialData?.category || 'OTHER',
      room: initialData?.room || '',
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      customerId: initialData?.customerId || '',
      status: initialData?.status || 'PENDING',
    },
  });

  const category = watch('category');
  const status = watch('status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Selection Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Kitchen Countertops"
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
          placeholder="Brief description of this selection"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={category}
            onValueChange={(value) => setValue('category', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>

        {/* Room */}
        <div className="space-y-2">
          <Label htmlFor="room">Room</Label>
          <Input
            id="room"
            {...register('room')}
            placeholder="e.g., Kitchen, Master Bath"
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
            {...register('dueDate', {
              setValueAs: (v) => (v ? new Date(v) : undefined),
            })}
          />
        </div>

        {/* Customer ID */}
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer ID (Optional)</Label>
          <Input
            id="customerId"
            {...register('customerId')}
            placeholder="Link to customer"
          />
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
            <strong>Note:</strong> Options and selections can be added after creating this item.
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
          {mode === 'create' ? 'Create Selection' : 'Update Selection'}
        </Button>
      </div>
    </form>
  );
}
