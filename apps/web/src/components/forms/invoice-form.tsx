'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or greater'),
});

const formSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  customerId: z.string().min(1, 'Customer is required'),
  projectId: z.string().optional(),
  quoteId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type FormData = z.infer<typeof formSchema>;
type LineItem = z.infer<typeof lineItemSchema>;

interface InvoiceFormProps {
  companyId: string;
  projectId?: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function InvoiceForm({
  companyId,
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: InvoiceFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: companyId,
      customerId: initialData?.customerId || '',
      projectId: projectId || initialData?.projectId || '',
      quoteId: initialData?.quoteId || '',
      title: initialData?.title || '',
      description: initialData?.description || '',
      taxRate: initialData?.taxRate || 0,
      dueDate: initialData?.dueDate || '',
      notes: initialData?.notes || '',
      items: initialData?.items || [
        { description: '', quantity: 1, unitPrice: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const taxRate = watch('taxRate');

  // Calculate totals
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = subtotal * ((taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  const addLineItem = () => {
    append({ description: '', quantity: 1, unitPrice: 0 });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    // Calculate totals for each line item
    const itemsWithTotals = data.items.map((item) => ({
      ...item,
      total: Number(item.quantity) * Number(item.unitPrice),
    }));

    await onSubmit({
      ...data,
      items: itemsWithTotals,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Invoice Details</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Customer ID */}
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID *</Label>
            <Input
              id="customerId"
              {...register('customerId')}
              placeholder="Enter customer ID"
              disabled={mode === 'edit'}
            />
            {errors.customerId && (
              <p className="text-sm text-destructive">{errors.customerId.message}</p>
            )}
          </div>

          {/* Project ID */}
          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              {...register('projectId')}
              placeholder="Optional project ID"
              disabled={!!projectId}
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Invoice Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g., Kitchen Renovation - Phase 1"
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Invoice description"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tax Rate */}
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              {...register('taxRate', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.taxRate && (
              <p className="text-sm text-destructive">{errors.taxRate.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              {...register('dueDate')}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </div>
        </div>

        {/* Quote ID */}
        <div className="space-y-2">
          <Label htmlFor="quoteId">Quote ID (Optional)</Label>
          <Input
            id="quoteId"
            {...register('quoteId')}
            placeholder="Link to existing quote"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Line Items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {errors.items && !Array.isArray(errors.items) && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor={`items.${index}.description`}>Description *</Label>
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Item description"
                />
                {errors.items?.[index]?.description && (
                  <p className="text-sm text-destructive">
                    {errors.items[index]?.description?.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    placeholder="1"
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                {/* Unit Price */}
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.unitPrice`}>Unit Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.items?.[index]?.unitPrice && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.unitPrice?.message}
                    </p>
                  )}
                </div>

                {/* Total (calculated) */}
                <div className="space-y-2">
                  <Label>Total</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                    ${((Number(items[index]?.quantity) || 0) * (Number(items[index]?.unitPrice) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax ({taxRate}%):</span>
          <span className="font-medium">${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold pt-2 border-t">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or payment terms"
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
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
          {mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
        </Button>
      </div>
    </form>
  );
}
