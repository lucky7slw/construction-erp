'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useCreateProject } from '@/lib/query/hooks/use-projects';
import { useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/components/ui/toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Company is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  // Flip House fields
  projectType: z.enum(['NEW_CONSTRUCTION', 'RENOVATION', 'FLIP_HOUSE', 'COMMERCIAL', 'MAINTENANCE', 'OTHER']).optional(),
  propertyType: z.enum(['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'OTHER']).optional(),
  purchasePrice: z.number().optional(),
  renovationBudget: z.number().optional(),
  squareFeet: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  lotSize: z.number().optional(),
  yearBuilt: z.number().optional(),
  acquisitionDate: z.string().optional(),
  targetSaleDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      companyId: '',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
      budget: undefined,
      address: '',
      city: '',
      state: '',
      zipCode: '',
      projectType: undefined,
      propertyType: undefined,
      purchasePrice: undefined,
      renovationBudget: undefined,
      squareFeet: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      lotSize: undefined,
      yearBuilt: undefined,
      acquisitionDate: '',
      targetSaleDate: '',
    },
  });

  const projectType = form.watch('projectType');
  const isFlipHouse = projectType === 'FLIP_HOUSE';

  // Update companyId when user data loads
  React.useEffect(() => {
    if (user?.companies?.[0]?.id) {
      form.setValue('companyId', user.companies[0].id);
    }
  }, [user, form]);

  // Auto-calculate remaining budget for flip houses
  const purchasePrice = form.watch('purchasePrice');
  const renovationBudget = form.watch('renovationBudget');
  const remainingBudget = React.useMemo(() => {
    if (isFlipHouse && renovationBudget && purchasePrice) {
      return renovationBudget - purchasePrice;
    }
    return null;
  }, [isFlipHouse, renovationBudget, purchasePrice]);

  const handleAIAnalysis = async () => {
    const values = form.getValues();

    if (!values.address || !values.city || !values.state) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in the property address before running AI analysis',
      });
      return;
    }

    if (!values.squareFeet || !values.bedrooms || !values.bathrooms) {
      toast({
        variant: 'destructive',
        title: 'Missing Property Details',
        description: 'Please fill in square feet, bedrooms, and bathrooms',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Call Gemini AI API endpoint (will be implemented next)
      const response = await fetch('/api/v1/ai/analyze-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: `${values.address}, ${values.city}, ${values.state} ${values.zipCode}`,
          squareFeet: values.squareFeet,
          bedrooms: values.bedrooms,
          bathrooms: values.bathrooms,
          propertyType: values.propertyType,
          yearBuilt: values.yearBuilt,
          lotSize: values.lotSize,
          purchasePrice: values.purchasePrice,
          renovationBudget: values.renovationBudget,
        }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const analysis = await response.json();

      toast({
        title: 'AI Analysis Complete',
        description: 'Market analysis has been generated successfully',
      });

      // Store analysis results (will be displayed in a modal/card)
      console.log('AI Analysis:', analysis);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze property',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (!values.companyId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Company ID is required. Please refresh the page and try again.',
        });
        return;
      }

      // Convert date strings to ISO format if they exist
      const payload = {
        ...values,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        acquisitionDate: values.acquisitionDate ? new Date(values.acquisitionDate).toISOString() : undefined,
        targetSaleDate: values.targetSaleDate ? new Date(values.targetSaleDate).toISOString() : undefined,
      };

      await createProject.mutateAsync(payload);
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      router.push('/projects');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">
            Set up a new construction project with all the necessary details.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Basic information about your construction project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NEW_CONSTRUCTION">New Construction</SelectItem>
                        <SelectItem value="RENOVATION">Renovation</SelectItem>
                        <SelectItem value="FLIP_HOUSE">Flip House 🏠</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Type of construction project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Downtown Office Building" {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive name for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project scope, objectives, and key deliverables..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of the project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {isFlipHouse && (
            <Card className="border-construction-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Flip House Details
                      <Badge variant="construction">Flip</Badge>
                    </CardTitle>
                    <CardDescription>
                      Property acquisition and renovation information
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Market Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="250000"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Property acquisition cost
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="renovationBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Renovation Budget *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100000"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Total renovation budget
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {remainingBudget !== null && (
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remaining Budget:</span>
                      <span className={`text-lg font-bold ${remainingBudget < 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${remainingBudget.toLocaleString()}
                      </span>
                    </div>
                    {remainingBudget < 0 && (
                      <p className="text-sm text-destructive mt-1">
                        ⚠️ Purchase price exceeds renovation budget
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Property Details</h3>

                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                            <SelectItem value="CONDO">Condo</SelectItem>
                            <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
                            <SelectItem value="MULTI_FAMILY">Multi-Family</SelectItem>
                            <SelectItem value="LAND">Land</SelectItem>
                            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="squareFeet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Square Feet</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2000"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="2"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="yearBuilt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Built</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2000"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lotSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lot Size (sq ft)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5000"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Timeline</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="acquisitionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acquisition Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetSaleDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Sale Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Expected completion and sale date
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline & Budget</CardTitle>
              <CardDescription>
                Project schedule and financial details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isFlipHouse && (
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Total project budget in USD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Location</CardTitle>
              <CardDescription>Address and location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address {isFlipHouse && '*'}</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City {isFlipHouse && '*'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Burlington" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State {isFlipHouse && '*'}</FormLabel>
                      <FormControl>
                        <Input placeholder="NC" maxLength={2} {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="27215" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Project
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
