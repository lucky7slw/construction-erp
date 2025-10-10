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
  bidType: z.enum(['GENERAL_CONTRACTOR', 'SUBCONTRACTOR', 'MATERIAL_SUPPLIER', 'EQUIPMENT_RENTAL', 'CONSULTANT']),
  scopeOfWork: z.string().min(1, 'Scope of work is required'),
  supplierId: z.string().optional(),
  dueDate: z.string().optional(),
  validUntil: z.string().optional(),
  bondRequired: z.boolean().optional(),
  bondAmount: z.string().optional(),
  taxPercent: z.string().optional(),
  notes: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BidFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const bidTypeOptions = [
  { value: 'GENERAL_CONTRACTOR', label: 'General Contractor' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  { value: 'MATERIAL_SUPPLIER', label: 'Material Supplier' },
  { value: 'EQUIPMENT_RENTAL', label: 'Equipment Rental' },
  { value: 'CONSULTANT', label: 'Consultant' },
];

export function BidForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: BidFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bidType: initialData?.bidType || 'SUBCONTRACTOR',
      scopeOfWork: initialData?.scopeOfWork || '',
      supplierId: initialData?.supplierId || '',
      dueDate: initialData?.dueDate || '',
      validUntil: initialData?.validUntil || '',
      bondRequired: initialData?.bondRequired || false,
      bondAmount: initialData?.bondAmount || '',
      taxPercent: initialData?.taxPercent || '',
      notes: initialData?.notes || '',
      contactName: initialData?.contactName || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
    },
  });

  const bidType = watch('bidType');
  const bondRequired = watch('bondRequired');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Bid Type */}
      <div className="space-y-2">
        <Label htmlFor="bidType">Bid Type *</Label>
        <Select
          value={bidType}
          onValueChange={(value) => setValue('bidType', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select bid type" />
          </SelectTrigger>
          <SelectContent>
            {bidTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.bidType && (
          <p className="text-sm text-destructive">{errors.bidType.message}</p>
        )}
      </div>

      {/* Scope of Work */}
      <div className="space-y-2">
        <Label htmlFor="scopeOfWork">Scope of Work *</Label>
        <Textarea
          id="scopeOfWork"
          {...register('scopeOfWork')}
          placeholder="Describe the work to be bid"
          rows={4}
        />
        {errors.scopeOfWork && (
          <p className="text-sm text-destructive">{errors.scopeOfWork.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Supplier ID */}
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier/Vendor ID</Label>
          <Input
            id="supplierId"
            {...register('supplierId')}
            placeholder="Optional supplier identifier"
          />
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Valid Until */}
        <div className="space-y-2">
          <Label htmlFor="validUntil">Valid Until</Label>
          <Input
            id="validUntil"
            type="date"
            {...register('validUntil')}
          />
        </div>

        {/* Tax Percent */}
        <div className="space-y-2">
          <Label htmlFor="taxPercent">Tax Percent</Label>
          <Input
            id="taxPercent"
            type="number"
            step="0.01"
            {...register('taxPercent')}
            placeholder="e.g., 8.5"
          />
        </div>
      </div>

      {/* Bond Section */}
      <div className="space-y-3 p-4 border rounded-lg">
        <h4 className="font-medium text-sm">Bond Requirements</h4>

        <div className="space-y-2">
          <Label htmlFor="bondRequired">Bond Required</Label>
          <Select
            value={bondRequired ? 'true' : 'false'}
            onValueChange={(value) => setValue('bondRequired', value === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">No Bond Required</SelectItem>
              <SelectItem value="true">Bond Required</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {bondRequired && (
          <div className="space-y-2">
            <Label htmlFor="bondAmount">Bond Amount</Label>
            <Input
              id="bondAmount"
              type="number"
              step="0.01"
              {...register('bondAmount')}
              placeholder="Enter bond amount"
            />
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-3 p-4 border rounded-lg">
        <h4 className="font-medium text-sm">Contact Information</h4>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            {...register('contactName')}
            placeholder="Primary contact person"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              {...register('contactEmail')}
              placeholder="contact@example.com"
            />
            {errors.contactEmail && (
              <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              {...register('contactPhone')}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or requirements"
          rows={3}
        />
      </div>

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Line items can be added after creating the bid.
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
          {mode === 'create' ? 'Create Bid' : 'Update Bid'}
        </Button>
      </div>
    </form>
  );
}
