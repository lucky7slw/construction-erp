'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const lineItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.number().nonnegative('Unit cost must be non-negative'),
  markup: z.number().min(0).max(100, 'Markup must be between 0 and 100').optional(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').optional(),
});

type LineItemFormValues = z.infer<typeof lineItemSchema>;

type LineItemFormProps = {
  onSubmit: (values: LineItemFormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<LineItemFormValues>;
  submitLabel?: string;
};

const CATEGORIES = [
  'Labor',
  'Materials',
  'Equipment',
  'Subcontractor',
  'Permits',
  'Other',
];

const UNITS = [
  'Each',
  'Hours',
  'Days',
  'Sq Ft',
  'Linear Ft',
  'Cubic Yards',
  'Tons',
  'Loads',
];

export function LineItemForm({ onSubmit, onCancel, defaultValues, submitLabel = 'Add Line Item' }: LineItemFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      category: defaultValues?.category || 'Labor',
      description: defaultValues?.description || '',
      quantity: defaultValues?.quantity || 1,
      unit: defaultValues?.unit || 'Hours',
      unitCost: defaultValues?.unitCost || 0,
      markup: defaultValues?.markup || 0,
      taxRate: defaultValues?.taxRate || 0,
    },
  });

  const handleSubmit = async (values: LineItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      // Error handling is done by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={form.watch('category')}
            onValueChange={(value) => form.setValue('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category && (
            <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
          )}
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select
            value={form.watch('unit')}
            onValueChange={(value) => form.setValue('unit', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.unit && (
            <p className="text-sm text-destructive">{form.formState.errors.unit.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the work or materials"
          rows={2}
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0"
            {...form.register('quantity', { valueAsNumber: true })}
          />
          {form.formState.errors.quantity && (
            <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
          )}
        </div>

        {/* Unit Cost */}
        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost *</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            min="0"
            {...form.register('unitCost', { valueAsNumber: true })}
          />
          {form.formState.errors.unitCost && (
            <p className="text-sm text-destructive">{form.formState.errors.unitCost.message}</p>
          )}
        </div>

        {/* Markup % */}
        <div className="space-y-2">
          <Label htmlFor="markup">Markup %</Label>
          <Input
            id="markup"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...form.register('markup', { valueAsNumber: true })}
          />
          {form.formState.errors.markup && (
            <p className="text-sm text-destructive">{form.formState.errors.markup.message}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
