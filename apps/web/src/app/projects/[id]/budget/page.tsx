'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useBudgetSummary,
  useBudgetLineItems,
  useCreateBudgetLineItem,
  useUpdateBudgetLineItem,
  useDeleteBudgetLineItem
} from '@/lib/query/hooks/use-budget';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetLineItemForm } from '@/components/forms/budget-line-item-form';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = {
  LABOR: '#3b82f6',
  MATERIALS: '#10b981',
  EQUIPMENT: '#f59e0b',
  SUBCONTRACTORS: '#8b5cf6',
  PERMITS: '#ec4899',
  OVERHEAD: '#6366f1',
  CONTINGENCY: '#14b8a6',
  OTHER: '#64748b'
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function BudgetSummaryCard({ summary }: { summary: any }) {
  const variance = summary.variance;
  const isOverBudget = variance < 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actual Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalActual)}</div>
          <p className="text-xs text-muted-foreground">
            {summary.percentageUsed.toFixed(1)}% of budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Committed</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalCommitted)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variance</CardTitle>
          {isOverBudget ? (
            <TrendingDown className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingUp className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-green-500'}`}>
            {formatCurrency(variance)}
          </div>
          <p className="text-xs text-muted-foreground">
            {isOverBudget ? 'Over budget' : 'Under budget'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryBreakdownChart({ categoryBreakdown }: { categoryBreakdown: Record<string, any> }) {
  const chartData = Object.entries(categoryBreakdown).map(([category, data]) => ({
    category,
    budgeted: data.budgeted,
    actual: data.actual,
    committed: data.committed,
  }));

  const pieData = Object.entries(categoryBreakdown).map(([category, data]) => ({
    name: category,
    value: data.budgeted,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
          <CardDescription>Budgeted vs Actual vs Committed</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
              <Bar dataKey="actual" fill="#10b981" name="Actual" />
              <Bar dataKey="committed" fill="#f59e0b" name="Committed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>Budget allocation by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetLineItemsTable({
  lineItems,
  projectId,
  onAdd,
  onEdit,
  onDelete,
}: {
  lineItems: any[];
  projectId: string;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Line Items</CardTitle>
            <CardDescription>Detailed budget breakdown by line item</CardDescription>
          </div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Cost Code</th>
                <th className="text-right p-2">Budgeted</th>
                <th className="text-right p-2">Actual</th>
                <th className="text-right p-2">Committed</th>
                <th className="text-right p-2">Variance</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    No budget line items yet. Click "Add Line Item" to get started.
                  </td>
                </tr>
              ) : (
                lineItems.map((item) => {
                  const variance = item.budgetedAmount - item.actualAmount;
                  const isOverBudget = variance < 0;

                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Badge
                          style={{ backgroundColor: COLORS[item.category as keyof typeof COLORS] }}
                          className="text-white"
                        >
                          {item.category}
                        </Badge>
                      </td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 text-muted-foreground">{item.costCode || '-'}</td>
                      <td className="p-2 text-right">{formatCurrency(item.budgetedAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.actualAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.committedAmount)}</td>
                      <td className={`p-2 text-right ${isOverBudget ? 'text-destructive' : 'text-green-500'}`}>
                        {formatCurrency(variance)}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BudgetPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  const {
    data: budgetSummary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useBudgetSummary(projectId);

  const {
    data: budgetLineItems,
    isLoading: lineItemsLoading,
    error: lineItemsError,
    refetch: refetchLineItems
  } = useBudgetLineItems(projectId);

  const createLineItem = useCreateBudgetLineItem();
  const updateLineItem = useUpdateBudgetLineItem();
  const deleteLineItem = useDeleteBudgetLineItem();

  const handleAdd = () => {
    setSelectedItem(null);
    setAddDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createLineItem.mutateAsync({
        projectId,
        ...data,
      });
      toast({
        title: 'Success',
        description: 'Budget line item created successfully',
      });
      setAddDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create line item',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedItem) return;

    try {
      await updateLineItem.mutateAsync({
        id: selectedItem.id,
        projectId,
        data,
      });
      toast({
        title: 'Success',
        description: 'Budget line item updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update line item',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      await deleteLineItem.mutateAsync({
        id: selectedItem.id,
        projectId,
      });
      toast({
        title: 'Success',
        description: 'Budget line item deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete line item',
        variant: 'destructive',
      });
    }
  };

  if (summaryError) {
    return <QueryError error={summaryError as Error} onRetry={refetchSummary} />;
  }

  if (lineItemsError) {
    return <QueryError error={lineItemsError as Error} onRetry={refetchLineItems} />;
  }

  if (summaryLoading || lineItemsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Track and manage your project budget
          </p>
        </div>
        <Button variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {budgetSummary && <BudgetSummaryCard summary={budgetSummary.summary} />}

      {budgetSummary && budgetSummary.categoryBreakdown && (
        <CategoryBreakdownChart categoryBreakdown={budgetSummary.categoryBreakdown} />
      )}

      {budgetLineItems && (
        <BudgetLineItemsTable
          lineItems={budgetLineItems}
          projectId={projectId}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Line Item</DialogTitle>
            <DialogDescription>
              Create a new line item in your project budget
            </DialogDescription>
          </DialogHeader>
          <BudgetLineItemForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setAddDialogOpen(false)}
            isLoading={createLineItem.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Line Item</DialogTitle>
            <DialogDescription>
              Update the details of this budget line item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <BudgetLineItemForm
              projectId={projectId}
              initialData={selectedItem}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedItem(null);
              }}
              isLoading={updateLineItem.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget Line Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedItem(null);
              }}
              disabled={deleteLineItem.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLineItem.isPending}
            >
              {deleteLineItem.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
