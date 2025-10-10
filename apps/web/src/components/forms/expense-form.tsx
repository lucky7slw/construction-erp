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
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  category: z.enum([
    'MATERIALS',
    'EQUIPMENT',
    'LABOR',
    'TRANSPORTATION',
    'PERMITS',
    'UTILITIES',
    'INSURANCE',
    'OTHER',
  ]).optional(),
  date: z.date(),
  receipt: z.string().optional(),
  billable: z.boolean().optional(),
  reimbursable: z.boolean().optional(),
  supplierId: z.string().optional(),
  autoCategorize: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  projectId?: string;
  initialData?: Partial<FormData & { date?: string | Date }>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const categoryOptions = [
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'PERMITS', label: 'Permits' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'OTHER', label: 'Other' },
];

export function ExpenseForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || 0,
      category: initialData?.category || undefined,
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      receipt: initialData?.receipt || '',
      billable: initialData?.billable ?? false,
      reimbursable: initialData?.reimbursable ?? false,
      supplierId: initialData?.supplierId || '',
      autoCategorize: mode === 'create' ? true : false,
    },
  });

  const category = watch('category');
  const billable = watch('billable');
  const reimbursable = watch('reimbursable');
  const autoCategorize = watch('autoCategorize');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="What was this expense for?"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            {...register('amount', {
              setValueAs: (v) => (v ? parseFloat(v) : 0),
            })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

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
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category {mode === 'create' && autoCategorize ? '(AI will suggest)' : ''}
        </Label>
        <Select
          value={category}
          onValueChange={(value) => setValue('category', value as any)}
          disabled={mode === 'create' && autoCategorize}
        >
          <SelectTrigger>
            <SelectValue placeholder={autoCategorize ? 'AI will categorize...' : 'Select category'} />
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

      {/* AI Auto-Categorize (create mode only) */}
      {mode === 'create' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoCategorize"
            checked={autoCategorize}
            onCheckedChange={(checked) => setValue('autoCategorize', checked as boolean)}
          />
          <Label
            htmlFor="autoCategorize"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Use AI to automatically categorize this expense
          </Label>
        </div>
      )}

      {/* Receipt URL */}
      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt URL (Optional)</Label>
        <Input
          id="receipt"
          {...register('receipt')}
          placeholder="https://example.com/receipt.pdf"
        />
      </div>

      {/* Supplier ID */}
      <div className="space-y-2">
        <Label htmlFor="supplierId">Supplier ID (Optional)</Label>
        <Input
          id="supplierId"
          {...register('supplierId')}
          placeholder="Link to supplier"
        />
      </div>

      {/* Billable and Reimbursable Checkboxes */}
      <div className="space-y-2">
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
            Billable to client
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="reimbursable"
            checked={reimbursable}
            onCheckedChange={(checked) => setValue('reimbursable', checked as boolean)}
          />
          <Label
            htmlFor="reimbursable"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Reimbursable expense
          </Label>
        </div>
      </div>

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> {autoCategorize
              ? 'AI will suggest a category based on your description.'
              : 'Select a category manually or enable AI categorization.'}
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
          {mode === 'create' ? 'Add Expense' : 'Update Expense'}
        </Button>
      </div>
    </form>
  );
}
