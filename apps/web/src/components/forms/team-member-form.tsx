'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['manager', 'member', 'viewer']),
});

type FormData = z.infer<typeof formSchema>;

interface TeamMemberFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<FormData>;
}

const roleDescriptions = {
  manager: {
    label: 'Manager',
    description: 'Full control over project and team',
  },
  member: {
    label: 'Member',
    description: 'Can create and edit tasks',
  },
  viewer: {
    label: 'Viewer',
    description: 'View project data only',
  },
};

export function TeamMemberForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: TeamMemberFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialData?.email || '',
      role: initialData?.role || 'member',
    },
  });

  const role = watch('role');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="user@example.com"
          disabled={!!initialData?.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
        {initialData?.email && (
          <p className="text-xs text-muted-foreground">
            Email cannot be changed after invitation
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select
          value={role}
          onValueChange={(value) => setValue('role', value as 'manager' | 'member' | 'viewer')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleDescriptions).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      {role && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium mb-1">
            {roleDescriptions[role].label} Permissions:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {role === 'manager' && (
              <>
                <li>✓ Full project control</li>
                <li>✓ Invite/remove members</li>
                <li>✓ Edit project settings</li>
                <li>✓ Manage budget</li>
              </>
            )}
            {role === 'member' && (
              <>
                <li>✓ Create tasks</li>
                <li>✓ Edit assigned tasks</li>
                <li>✓ Log time</li>
                <li>✓ Upload documents</li>
              </>
            )}
            {role === 'viewer' && (
              <>
                <li>✓ View project data</li>
                <li>✓ View tasks</li>
                <li>✓ View documents</li>
                <li>✓ Export reports</li>
              </>
            )}
          </ul>
        </div>
      )}

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
          {initialData ? 'Update Role' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}
