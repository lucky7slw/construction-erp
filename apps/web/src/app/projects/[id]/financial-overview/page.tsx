'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, DollarSign, Receipt, ShoppingBag, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useBudgetSummary } from '@/lib/query/hooks/use-budget';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function FinancialOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: project } = useProject(projectId);
  const { data: budgetData, isLoading: budgetLoading } = useBudgetSummary(projectId);

  const budget = project?.budget || 0;
  const actualCost = budgetData?.summary?.totalActual || project?.actualCost || 0;
  const committed = budgetData?.summary?.totalCommitted || 0;
  const revenue = 0; // TODO: Implement from invoices
  const profit = revenue - actualCost;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Cash flow data - mock data for now
  const cashFlowData = [
    { month: 'Jan', inflow: 45000, outflow: 32000, net: 13000 },
    { month: 'Feb', inflow: 52000, outflow: 38000, net: 14000 },
    { month: 'Mar', inflow: 48000, outflow: 42000, net: 6000 },
    { month: 'Apr', inflow: 61000, outflow: 45000, net: 16000 },
    { month: 'May', inflow: 55000, outflow: 48000, net: 7000 },
    { month: 'Jun', inflow: 67000, outflow: 52000, net: 15000 },
  ];

  // Cost breakdown by category
  const costBreakdown = budgetData?.categoryBreakdown
    ? Object.entries(budgetData.categoryBreakdown).map(([name, data]: [string, any]) => ({
        name,
        value: data.actual,
      }))
    : [];

  // Budget vs Actual trend
  const budgetTrend = budgetData?.categoryBreakdown
    ? Object.entries(budgetData.categoryBreakdown).map(([category, data]: [string, any]) => ({
        category,
        budget: data.budgeted,
        actual: data.actual,
        variance: data.budgeted - data.actual,
      }))
    : [];

  if (budgetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
        <p className="text-muted-foreground">Complete financial summary and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
            <p className="text-xs text-muted-foreground">Project budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(actualCost)}</div>
            <p className="text-xs text-muted-foreground">
              {budget > 0 ? `${((actualCost / budget) * 100).toFixed(1)}% of budget` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(committed)}</div>
            <p className="text-xs text-muted-foreground">Outstanding POs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
            <p className="text-xs text-muted-foreground">Total invoiced</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Margin */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
            <CardDescription>Revenue vs Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gross Profit</span>
                <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              {profit < 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Project is currently operating at a loss</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution</CardTitle>
            <CardDescription>Actual spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            {costBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trend</CardTitle>
          <CardDescription>Monthly inflow, outflow, and net cash position</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="inflow" stackId="1" stroke="#10b981" fill="#10b981" name="Inflow" />
              <Area type="monotone" dataKey="outflow" stackId="2" stroke="#ef4444" fill="#ef4444" name="Outflow" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Net" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget Performance */}
      {budgetTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Performance by Category</CardTitle>
            <CardDescription>Budget vs actual spending with variance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                <Bar dataKey="actual" fill="#10b981" name="Actual" />
                <Bar dataKey="variance" fill="#f59e0b" name="Variance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
