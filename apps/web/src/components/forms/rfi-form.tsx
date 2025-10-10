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
  question: z.string().min(1, 'Question is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  discipline: z.string().optional(),
  drawingReference: z.string().optional(),
  specReference: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'ANSWERED', 'CLOSED', 'CANCELLED']).optional(),
  answer: z.string().optional(),
  assignedTo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RFIFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit' | 'answer';
}

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function RFIForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: RFIFormProps) {
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
      question: initialData?.question || '',
      priority: initialData?.priority || 'MEDIUM',
      discipline: initialData?.discipline || '',
      drawingReference: initialData?.drawingReference || '',
      specReference: initialData?.specReference || '',
      dueDate: initialData?.dueDate || '',
      status: initialData?.status || 'DRAFT',
      answer: initialData?.answer || '',
      assignedTo: initialData?.assignedTo || '',
    },
  });

  const priority = watch('priority');
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
          placeholder="Brief description of the request"
          disabled={mode === 'answer'}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Question */}
      <div className="space-y-2">
        <Label htmlFor="question">Question/Details *</Label>
        <Textarea
          id="question"
          {...register('question')}
          placeholder="Detailed question or information request"
          rows={4}
          disabled={mode === 'answer'}
        />
        {errors.question && (
          <p className="text-sm text-destructive">{errors.question.message}</p>
        )}
      </div>

      {/* Answer (only visible in edit or answer mode) */}
      {(mode === 'edit' || mode === 'answer') && (
        <div className="space-y-2">
          <Label htmlFor="answer">Answer/Response</Label>
          <Textarea
            id="answer"
            {...register('answer')}
            placeholder="Provide answer to the RFI"
            rows={4}
          />
          {errors.answer && (
            <p className="text-sm text-destructive">{errors.answer.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select
            value={priority}
            onValueChange={(value) => setValue('priority', value as any)}
            disabled={mode === 'answer'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && (
            <p className="text-sm text-destructive">{errors.priority.message}</p>
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

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate')}
            disabled={mode === 'answer'}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Discipline */}
        <div className="space-y-2">
          <Label htmlFor="discipline">Discipline</Label>
          <Input
            id="discipline"
            {...register('discipline')}
            placeholder="e.g., Structural, Mechanical"
            disabled={mode === 'answer'}
          />
        </div>

        {/* Assigned To (only in edit mode) */}
        {mode === 'edit' && (
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To (User ID)</Label>
            <Input
              id="assignedTo"
              {...register('assignedTo')}
              placeholder="User ID"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Drawing Reference */}
        <div className="space-y-2">
          <Label htmlFor="drawingReference">Drawing Reference</Label>
          <Input
            id="drawingReference"
            {...register('drawingReference')}
            placeholder="e.g., Sheet A-101"
            disabled={mode === 'answer'}
          />
        </div>

        {/* Spec Reference */}
        <div className="space-y-2">
          <Label htmlFor="specReference">Spec Reference</Label>
          <Input
            id="specReference"
            {...register('specReference')}
            placeholder="e.g., Section 03300"
            disabled={mode === 'answer'}
          />
        </div>
      </div>

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
          {mode === 'create' && 'Create RFI'}
          {mode === 'edit' && 'Update RFI'}
          {mode === 'answer' && 'Submit Answer'}
        </Button>
      </div>
    </form>
  );
}
