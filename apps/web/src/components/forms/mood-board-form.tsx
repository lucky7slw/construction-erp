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
  room: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'SHARED', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MoodBoardFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SHARED', label: 'Shared' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function MoodBoardForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: MoodBoardFormProps) {
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
      room: initialData?.room || '',
      customerId: initialData?.customerId || '',
      status: initialData?.status || 'DRAFT',
    },
  });

  const status = watch('status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Mood Board Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Living Room Inspiration"
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
          placeholder="Brief description of this mood board"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Room */}
        <div className="space-y-2">
          <Label htmlFor="room">Room</Label>
          <Input
            id="room"
            {...register('room')}
            placeholder="e.g., Kitchen, Bedroom"
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
            <strong>Note:</strong> Items, images, and comments can be added after creating the mood board.
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
          {mode === 'create' ? 'Create Mood Board' : 'Update Mood Board'}
        </Button>
      </div>
    </form>
  );
}
