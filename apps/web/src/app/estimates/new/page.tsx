'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateEstimate } from '@/lib/query/hooks/use-estimates';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useToast } from '@/components/ui/toast';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  overheadPercent: z.number().min(0).max(100).optional(),
  profitPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewEstimatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const createEstimate = useCreateEstimate();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
      name: '',
      description: '',
      overheadPercent: 10,
      profitPercent: 15,
      taxPercent: 0,
      validUntil: '',
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        projectId: values.projectId,
        title: values.name,
        description: values.description || undefined,
        validUntil: values.validUntil ? new Date(values.validUntil).toISOString() : undefined,
        notes: values.notes || undefined,
      };

      const result = await createEstimate.mutateAsync(payload);

      toast({
        title: 'Success',
        description: 'Estimate created successfully',
      });

      router.push(`/estimates/${result.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create estimate',
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/estimates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Estimate</h1>
          <p className="text-muted-foreground">
            Fill in the details below to create a new estimate
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide the basic details for your estimate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Project *</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={(value) => form.setValue('projectId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                  ) : !projects || projects.length === 0 ? (
                    <SelectItem value="no-projects" disabled>No projects available</SelectItem>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.projectId && (
                <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Estimate Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen Renovation Estimate"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the work to be done"
                rows={3}
                {...form.register('description')}
              />
            </div>

            {/* Pricing Percentages */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="overheadPercent">Overhead %</Label>
                <Input
                  id="overheadPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('overheadPercent', { valueAsNumber: true })}
                />
                {form.formState.errors.overheadPercent && (
                  <p className="text-sm text-destructive">{form.formState.errors.overheadPercent.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profitPercent">Profit %</Label>
                <Input
                  id="profitPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('profitPercent', { valueAsNumber: true })}
                />
                {form.formState.errors.profitPercent && (
                  <p className="text-sm text-destructive">{form.formState.errors.profitPercent.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax %</Label>
                <Input
                  id="taxPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('taxPercent', { valueAsNumber: true })}
                />
                {form.formState.errors.taxPercent && (
                  <p className="text-sm text-destructive">{form.formState.errors.taxPercent.message}</p>
                )}
              </div>
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                {...form.register('validUntil')}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty for no expiration date
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or terms"
                rows={4}
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/estimates">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createEstimate.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createEstimate.isPending ? 'Creating...' : 'Create Estimate'}
          </Button>
        </div>
      </form>
    </div>
  );
}
