'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Clock,
  DollarSign,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import { useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry, useApproveTimeEntry, useRejectTimeEntry } from '@/lib/query/hooks/use-time-entries';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useCategorizeExpense } from '@/lib/query/hooks/use-expenses';
import { useProject } from '@/lib/query/hooks/use-projects';
import { TimeEntryForm } from '@/components/forms/time-entry-form';
import { ExpenseForm } from '@/components/forms/expense-form';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};

const categoryConfig = {
  MATERIALS: { label: 'Materials', color: 'bg-blue-100 text-blue-800' },
  EQUIPMENT: { label: 'Equipment', color: 'bg-purple-100 text-purple-800' },
  LABOR: { label: 'Labor', color: 'bg-green-100 text-green-800' },
  TRANSPORTATION: { label: 'Transportation', color: 'bg-orange-100 text-orange-800' },
  PERMITS: { label: 'Permits', color: 'bg-indigo-100 text-indigo-800' },
  UTILITIES: { label: 'Utilities', color: 'bg-cyan-100 text-cyan-800' },
  INSURANCE: { label: 'Insurance', color: 'bg-pink-100 text-pink-800' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
};

export default function TimeExpensesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  // Time Entry State
  const [timeEntryCreateDialogOpen, setTimeEntryCreateDialogOpen] = React.useState(false);
  const [timeEntryEditDialogOpen, setTimeEntryEditDialogOpen] = React.useState(false);
  const [timeEntryDeleteDialogOpen, setTimeEntryDeleteDialogOpen] = React.useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = React.useState<any>(null);

  // Expense State
  const [expenseCreateDialogOpen, setExpenseCreateDialogOpen] = React.useState(false);
  const [expenseEditDialogOpen, setExpenseEditDialogOpen] = React.useState(false);
  const [expenseDeleteDialogOpen, setExpenseDeleteDialogOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<any>(null);

  // Data fetching
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: timeEntriesData, isLoading: timeEntriesLoading } = useTimeEntries({ projectId });
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({ projectId });

  // Time Entry Mutations
  const createTimeEntry = useCreateTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();
  const approveTimeEntry = useApproveTimeEntry();
  const rejectTimeEntry = useRejectTimeEntry();

  // Expense Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const categorizeExpense = useCategorizeExpense();

  const timeEntries = timeEntriesData?.timeEntries || [];
  const expenses = expensesData?.expenses || [];

  // Time Entry Handlers
  const handleTimeEntryCreateSubmit = async (data: any) => {
    try {
      await createTimeEntry.mutateAsync({
        projectId,
        date: data.date.toISOString(),
        hours: data.hours,
        description: data.description,
        billable: data.billable,
        notes: data.notes,
      });
      setTimeEntryCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Time entry logged successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create time entry',
        variant: 'destructive',
      });
    }
  };

  const handleTimeEntryEditSubmit = async (data: any) => {
    if (!selectedTimeEntry) return;

    try {
      await updateTimeEntry.mutateAsync({
        id: selectedTimeEntry.id,
        data: {
          date: data.date.toISOString(),
          hours: data.hours,
          description: data.description,
          billable: data.billable,
          notes: data.notes,
        },
      });
      setTimeEntryEditDialogOpen(false);
      setSelectedTimeEntry(null);
      toast({
        title: 'Success',
        description: 'Time entry updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update time entry',
        variant: 'destructive',
      });
    }
  };

  const handleTimeEntryDelete = async () => {
    if (!selectedTimeEntry) return;

    try {
      await deleteTimeEntry.mutateAsync(selectedTimeEntry.id);
      setTimeEntryDeleteDialogOpen(false);
      setSelectedTimeEntry(null);
      toast({
        title: 'Success',
        description: 'Time entry deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete time entry',
        variant: 'destructive',
      });
    }
  };

  const handleTimeEntryApprove = async (timeEntry: any) => {
    try {
      await approveTimeEntry.mutateAsync(timeEntry.id);
      toast({
        title: 'Success',
        description: 'Time entry approved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve time entry',
        variant: 'destructive',
      });
    }
  };

  const handleTimeEntryReject = async (timeEntry: any) => {
    try {
      await rejectTimeEntry.mutateAsync(timeEntry.id);
      toast({
        title: 'Success',
        description: 'Time entry rejected',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject time entry',
        variant: 'destructive',
      });
    }
  };

  // Expense Handlers
  const handleExpenseCreateSubmit = async (data: any) => {
    try {
      await createExpense.mutateAsync({
        projectId,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date.toISOString(),
        receipt: data.receipt,
        billable: data.billable,
        reimbursable: data.reimbursable,
        supplierId: data.supplierId,
        autoCategorize: data.autoCategorize,
      });
      setExpenseCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Expense added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create expense',
        variant: 'destructive',
      });
    }
  };

  const handleExpenseEditSubmit = async (data: any) => {
    if (!selectedExpense) return;

    try {
      await updateExpense.mutateAsync({
        id: selectedExpense.id,
        data: {
          description: data.description,
          amount: data.amount,
          category: data.category,
          date: data.date.toISOString(),
          receipt: data.receipt,
          billable: data.billable,
          reimbursable: data.reimbursable,
        },
      });
      setExpenseEditDialogOpen(false);
      setSelectedExpense(null);
      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive',
      });
    }
  };

  const handleExpenseDelete = async () => {
    if (!selectedExpense) return;

    try {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setExpenseDeleteDialogOpen(false);
      setSelectedExpense(null);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const handleExpenseCategorize = async (expense: any) => {
    try {
      await categorizeExpense.mutateAsync(expense.id);
      toast({
        title: 'Success',
        description: 'Expense categorized using AI',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to categorize expense',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || timeEntriesLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time & Expenses</h2>
          <p className="text-muted-foreground">Track labor hours and project expenses</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">{timeEntries.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Billable Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {timeEntries.filter((e: any) => e.billable).reduce((sum: number, entry: any) => sum + entry.hours, 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved for billing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${expenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reimbursable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${expenses.filter((e: any) => e.reimbursable).reduce((sum: number, expense: any) => sum + Number(expense.amount), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Employee expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="time">
            <Clock className="mr-2 h-4 w-4" />
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <DollarSign className="mr-2 h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        {/* Time Entries Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setTimeEntryCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Time
            </Button>
          </div>

          {timeEntries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No time entries</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
                  Track labor hours for this project.
                </p>
                <Button className="mt-4" onClick={() => setTimeEntryCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Your First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry: any) => (
                <Card key={entry.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(new Date(entry.date))}</span>
                        <Badge variant="outline">{entry.hours}h</Badge>
                        {entry.billable && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Billable
                          </Badge>
                        )}
                        <Badge className={cn('ml-auto', statusConfig[entry.status as keyof typeof statusConfig]?.color)}>
                          {statusConfig[entry.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {entry.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTimeEntryApprove(entry)}
                            disabled={approveTimeEntry.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTimeEntryReject(entry)}
                            disabled={rejectTimeEntry.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTimeEntry(entry);
                          setTimeEntryEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTimeEntry(entry);
                          setTimeEntryDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setExpenseCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No expenses</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
                  Track project expenses and costs.
                </p>
                <Button className="mt-4" onClick={() => setExpenseCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense: any) => (
                <Card key={expense.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(new Date(expense.date))}</span>
                        <Badge className={cn('', categoryConfig[expense.category as keyof typeof categoryConfig]?.color)}>
                          {categoryConfig[expense.category as keyof typeof categoryConfig]?.label}
                        </Badge>
                        <span className="font-bold text-lg ml-auto">${Number(expense.amount).toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{expense.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {expense.billable && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Billable
                          </Badge>
                        )}
                        {expense.reimbursable && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Reimbursable
                          </Badge>
                        )}
                        {expense.receipt && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Receipt
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setExpenseEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setExpenseDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Time Entry Create Dialog */}
      <Dialog open={timeEntryCreateDialogOpen} onOpenChange={setTimeEntryCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
            <DialogDescription>Record hours worked on this project</DialogDescription>
          </DialogHeader>
          <TimeEntryForm
            projectId={projectId}
            onSubmit={handleTimeEntryCreateSubmit}
            onCancel={() => setTimeEntryCreateDialogOpen(false)}
            isLoading={createTimeEntry.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Time Entry Edit Dialog */}
      <Dialog open={timeEntryEditDialogOpen} onOpenChange={setTimeEntryEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update time entry details</DialogDescription>
          </DialogHeader>
          <TimeEntryForm
            projectId={projectId}
            initialData={selectedTimeEntry ? {
              date: selectedTimeEntry.date,
              hours: selectedTimeEntry.hours,
              description: selectedTimeEntry.description,
              billable: selectedTimeEntry.billable,
              notes: selectedTimeEntry.notes,
              status: selectedTimeEntry.status,
            } : undefined}
            onSubmit={handleTimeEntryEditSubmit}
            onCancel={() => {
              setTimeEntryEditDialogOpen(false);
              setSelectedTimeEntry(null);
            }}
            isLoading={updateTimeEntry.isPending}
            mode="edit"
          />
        </DialogContent>
      </Dialog>

      {/* Time Entry Delete Dialog */}
      <AlertDialog open={timeEntryDeleteDialogOpen} onOpenChange={setTimeEntryDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setTimeEntryDeleteDialogOpen(false);
              setSelectedTimeEntry(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTimeEntryDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTimeEntry.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expense Create Dialog */}
      <Dialog open={expenseCreateDialogOpen} onOpenChange={setExpenseCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new project expense</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            projectId={projectId}
            onSubmit={handleExpenseCreateSubmit}
            onCancel={() => setExpenseCreateDialogOpen(false)}
            isLoading={createExpense.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Expense Edit Dialog */}
      <Dialog open={expenseEditDialogOpen} onOpenChange={setExpenseEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            projectId={projectId}
            initialData={selectedExpense ? {
              description: selectedExpense.description,
              amount: Number(selectedExpense.amount),
              category: selectedExpense.category,
              date: selectedExpense.date,
              receipt: selectedExpense.receipt,
              billable: selectedExpense.billable,
              reimbursable: selectedExpense.reimbursable,
              supplierId: selectedExpense.supplierId,
            } : undefined}
            onSubmit={handleExpenseEditSubmit}
            onCancel={() => {
              setExpenseEditDialogOpen(false);
              setSelectedExpense(null);
            }}
            isLoading={updateExpense.isPending}
            mode="edit"
          />
        </DialogContent>
      </Dialog>

      {/* Expense Delete Dialog */}
      <AlertDialog open={expenseDeleteDialogOpen} onOpenChange={setExpenseDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone and will update project totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExpenseDeleteDialogOpen(false);
              setSelectedExpense(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExpenseDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExpense.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
