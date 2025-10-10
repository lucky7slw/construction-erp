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
  date: z.string().min(1, 'Date is required'),
  weatherTemp: z.string().optional(),
  weatherConditions: z.string().optional(),
  weatherRain: z.string().optional(),
  weatherWind: z.string().optional(),
  workCompleted: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DailyLogFormProps {
  projectId: string;
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const weatherConditionOptions = [
  { value: '', label: 'Select conditions' },
  { value: 'Clear', label: 'Clear' },
  { value: 'Partly Cloudy', label: 'Partly Cloudy' },
  { value: 'Cloudy', label: 'Cloudy' },
  { value: 'Rain', label: 'Rain' },
  { value: 'Heavy Rain', label: 'Heavy Rain' },
  { value: 'Snow', label: 'Snow' },
  { value: 'Fog', label: 'Fog' },
];

export function DailyLogForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: DailyLogFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      weatherTemp: initialData?.weatherTemp || '',
      weatherConditions: initialData?.weatherConditions || '',
      weatherRain: initialData?.weatherRain || 'no',
      weatherWind: initialData?.weatherWind || '',
      workCompleted: initialData?.workCompleted || '',
      notes: initialData?.notes || '',
    },
  });

  const weatherConditions = watch('weatherConditions');
  const weatherRain = watch('weatherRain');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          {...register('date')}
          disabled={mode === 'edit'}
        />
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground">
            Date cannot be changed after creation
          </p>
        )}
      </div>

      {/* Weather Section */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Weather Conditions</h4>

        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="weatherTemp">Temperature (°F)</Label>
            <Input
              id="weatherTemp"
              type="number"
              {...register('weatherTemp')}
              placeholder="72"
            />
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <Label htmlFor="weatherConditions">Conditions</Label>
            <Select
              value={weatherConditions}
              onValueChange={(value) => setValue('weatherConditions', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select conditions" />
              </SelectTrigger>
              <SelectContent>
                {weatherConditionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Rain */}
          <div className="space-y-2">
            <Label htmlFor="weatherRain">Rain</Label>
            <Select
              value={weatherRain}
              onValueChange={(value) => setValue('weatherRain', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No Rain</SelectItem>
                <SelectItem value="light">Light Rain</SelectItem>
                <SelectItem value="moderate">Moderate Rain</SelectItem>
                <SelectItem value="heavy">Heavy Rain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wind */}
          <div className="space-y-2">
            <Label htmlFor="weatherWind">Wind</Label>
            <Input
              id="weatherWind"
              {...register('weatherWind')}
              placeholder="e.g., 5-10 mph NW"
            />
          </div>
        </div>
      </div>

      {/* Work Completed */}
      <div className="space-y-2">
        <Label htmlFor="workCompleted">Work Completed</Label>
        <Textarea
          id="workCompleted"
          {...register('workCompleted')}
          placeholder="Describe the work completed today"
          rows={4}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes, issues, or observations"
          rows={3}
        />
      </div>

      {mode === 'create' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Crew attendance, deliveries, equipment usage, and incidents can be added after creating the daily log.
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
          {mode === 'create' ? 'Create Daily Log' : 'Update Daily Log'}
        </Button>
      </div>
    </form>
  );
}
