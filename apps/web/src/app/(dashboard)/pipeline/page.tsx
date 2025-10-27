'use client';

import { usePipelineMetrics, type LeadStatus } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Clock,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-indigo-500',
  QUALIFIED: 'bg-purple-500',
  PROPOSAL: 'bg-yellow-500',
  NEGOTIATION: 'bg-orange-500',
  CONVERTED: 'bg-green-500',
  LOST: 'bg-red-500',
};

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

export default function PipelinePage() {
  const { user } = useAuth();

  const { data: metrics, isLoading } = usePipelineMetrics(user?.companies?.[0]?.id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Loading pipeline metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">No pipeline data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
        <p className="text-muted-foreground">Track your sales performance and pipeline metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${metrics.averageValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageCycleTime.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Days to close</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecasted Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Forecasted Revenue
          </CardTitle>
          <CardDescription>
            Weighted revenue forecast based on lead probability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            ${metrics.forecastedRevenue.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {metrics.totalLeads - (metrics.leadsByStatus?.CONVERTED || 0) - (metrics.leadsByStatus?.LOST || 0)} active leads
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leads by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Leads by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.leadsByStatus || {}).map(([status, count]: [string, any]) => {
                const percentage = (count / metrics.totalLeads) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[status as LeadStatus]}>
                          {statusLabels[status as LeadStatus]}
                        </Badge>
                      </div>
                      <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status as LeadStatus]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topSources.slice(0, 5).map((source: any) => (
                <div key={source.source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{source.source.toLowerCase().replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{source.count} leads</span>
                      <Badge variant="outline">{source.conversionRate.toFixed(0)}%</Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${source.conversionRate}%` }}
                    />
                  </div>
                </div>
              ))}
              {metrics.topSources.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No lead sources data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stage Breakdown</CardTitle>
          <CardDescription>Distribution of leads across different stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] as LeadStatus[]).map((status) => {
              const count = metrics.leadsByStatus?.[status] || 0;
              const percentage = metrics.totalLeads > 0 ? (count / metrics.totalLeads) * 100 : 0;

              return (
                <div key={status} className="flex items-center gap-4">
                  <div className="w-32">
                    <Badge className={statusColors[status]}>
                      {statusLabels[status]}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-muted rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full ${statusColors[status]} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white mix-blend-difference">
                          {count} leads ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
