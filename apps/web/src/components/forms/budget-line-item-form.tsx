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
import { BudgetCategorySchema, type BudgetCategory } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  category: BudgetCategorySchema,
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.coerce.number().min(0, 'Must be a positive number'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BudgetLineItemFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const categoryLabels: Record<BudgetCategory, string> = {
  LABOR: 'Labor',
  MATERIALS: 'Materials',
  EQUIPMENT: 'Equipment',
  SUBCONTRACTORS: 'Subcontractors',
  PERMITS: 'Permits',
  OVERHEAD: 'Overhead',
  CONTINGENCY: 'Contingency',
  OTHER: 'Other',
};

export function BudgetLineItemForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: BudgetLineItemFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialData?.category || 'MATERIALS',
      name: initialData?.name || '',
      description: initialData?.description || '',
      costCode: initialData?.costCode || '',
      budgetedAmount: initialData?.budgetedAmount || 0,
      notes: initialData?.notes || '',
    },
  });

  const category = watch('category');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={category}
          onValueChange={(value) => setValue('category', value as BudgetCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Framing lumber, Electrician labor"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="costCode">Cost Code</Label>
        <Input
          id="costCode"
          {...register('costCode')}
          placeholder="e.g., 03-100"
        />
        {errors.costCode && (
          <p className="text-sm text-destructive">{errors.costCode.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="budgetedAmount">Budgeted Amount *</Label>
        <Input
          id="budgetedAmount"
          type="number"
          step="0.01"
          {...register('budgetedAmount')}
          placeholder="0.00"
        />
        {errors.budgetedAmount && (
          <p className="text-sm text-destructive">{errors.budgetedAmount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Optional description of this line item"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes"
          rows={2}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

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
          {initialData ? 'Update' : 'Create'} Line Item
        </Button>
      </div>
    </form>
  );
}
