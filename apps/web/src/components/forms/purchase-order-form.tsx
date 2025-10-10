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
  supplierId: z.string().min(1, 'Supplier is required'),
  deliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED', 'CANCELLED']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'INVOICED', label: 'Invoiced' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function PurchaseOrderForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: PurchaseOrderFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: initialData?.supplierId || '',
      deliveryDate: initialData?.deliveryDate || '',
      deliveryAddress: initialData?.deliveryAddress || '',
      notes: initialData?.notes || '',
      status: initialData?.status || 'DRAFT',
    },
  });

  const status = watch('status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Supplier ID */}
      <div className="space-y-2">
        <Label htmlFor="supplierId">Supplier ID *</Label>
        <Input
          id="supplierId"
          {...register('supplierId')}
          placeholder="Enter supplier ID"
          disabled={mode === 'edit'}
        />
        {errors.supplierId && (
          <p className="text-sm text-destructive">{errors.supplierId.message}</p>
        )}
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground">
            Supplier cannot be changed after creation
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Delivery Date */}
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            {...register('deliveryDate')}
          />
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

      {/* Delivery Address */}
      <div className="space-y-2">
        <Label htmlFor="deliveryAddress">Delivery Address</Label>
        <Textarea
          id="deliveryAddress"
          {...register('deliveryAddress')}
          placeholder="Delivery address"
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or special instructions"
          rows={3}
        />
      </div>

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Line items will be added after creating the purchase order.
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
          {mode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order'}
        </Button>
      </div>
    </form>
  );
}
