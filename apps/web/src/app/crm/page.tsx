'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Users2,
  TrendingUp,
  DollarSign,
  Target,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { useLeads } from '@/lib/query/hooks/use-leads';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const LEAD_STATUSES = [
  { value: 'NEW', label: 'New', color: 'bg-blue-500' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-purple-500' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-yellow-500' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'bg-orange-500' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-pink-500' },
  { value: 'WON', label: 'Won', color: 'bg-green-500' },
  { value: 'LOST', label: 'Lost', color: 'bg-gray-500' },
];

export default function CRMPage() {
  const { data: allLeads, isLoading } = useLeads();
  const [view, setView] = React.useState<'pipeline' | 'list'>('pipeline');

  const getLeadsByStatus = (status: string) => {
    return allLeads?.filter((lead: any) => lead.status === status) || [];
  };

  const getTotalValue = (leads: any[]) => {
    return leads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
  };

  const getAverageProbability = (leads: any[]) => {
    if (!leads.length) return 0;
    return Math.round(
      leads.reduce((sum, lead) => sum + (lead.probability || 0), 0) / leads.length
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading CRM...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalLeads = allLeads?.length || 0;
  const activeLeads = allLeads?.filter((l: any) => !['WON', 'LOST'].includes(l.status)).length || 0;
  const wonLeads = allLeads?.filter((l: any) => l.status === 'WON').length || 0;
  const totalValue = getTotalValue(allLeads || []);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM - Lead Management</h1>
          <p className="text-muted-foreground">
            Track and manage your sales pipeline
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/crm/new">
              <Plus className="mr-2 h-4 w-4" />
              New Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {activeLeads} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonLeads}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total opportunity value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Probability</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getAverageProbability(allLeads?.filter((l: any) => !['WON', 'LOST'].includes(l.status)) || [])}%
            </div>
            <p className="text-xs text-muted-foreground">
              Active leads average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'pipeline' | 'list')}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {LEAD_STATUSES.map((status) => {
              const leads = getLeadsByStatus(status.value);
              const value = getTotalValue(leads);

              return (
                <div key={status.value} className="space-y-3">
                  <Card className={`${status.color} text-white`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {status.label}
                      </CardTitle>
                      <div className="text-xs opacity-90">
                        {leads.length} leads • {formatCurrency(value)}
                      </div>
                    </CardHeader>
                  </Card>

                  <div className="space-y-2">
                    {leads.length === 0 ? (
                      <Card className="opacity-50">
                        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                          No leads
                        </CardContent>
                      </Card>
                    ) : (
                      leads.map((lead: any) => (
                        <Link key={lead.id} href={`/crm/${lead.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-4 space-y-2">
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {lead.title}
                              </h4>
                              <p className="text-sm font-medium text-muted-foreground">
                                {lead.contactName}
                              </p>
                              {lead.value && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Value</span>
                                  <span className="font-bold">{formatCurrency(Number(lead.value))}</span>
                                </div>
                              )}
                              {lead.probability !== null && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Probability</span>
                                  <Badge variant="secondary">{lead.probability}%</Badge>
                                </div>
                              )}
                              {lead.expectedCloseDate && (
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {format(new Date(lead.expectedCloseDate), 'MMM d')}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          {!allLeads || allLeads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users2 className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  Start by creating your first lead to begin tracking your sales pipeline
                </p>
                <Button className="mt-6" asChild>
                  <Link href="/crm/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Lead
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allLeads.map((lead: any) => (
                <Link key={lead.id} href={`/crm/${lead.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{lead.title}</h3>
                            <Badge className={`${LEAD_STATUSES.find(s => s.value === lead.status)?.color} text-white`}>
                              {lead.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="font-medium">{lead.contactName}</span>
                            {lead.contactEmail && (
                              <span className="flex items-center">
                                <Mail className="mr-1 h-3 w-3" />
                                {lead.contactEmail}
                              </span>
                            )}
                            {lead.contactPhone && (
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {lead.contactPhone}
                              </span>
                            )}
                          </div>
                          {lead.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lead.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {lead.source && (
                              <span>Source: {lead.source}</span>
                            )}
                            {lead.createdAt && (
                              <span>Created {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          {lead.value && (
                            <div className="text-lg font-bold">{formatCurrency(Number(lead.value))}</div>
                          )}
                          {lead.probability !== null && (
                            <Badge variant="secondary">{lead.probability}% probability</Badge>
                          )}
                          {lead.expectedCloseDate && (
                            <div className="text-xs text-muted-foreground">
                              Close: {format(new Date(lead.expectedCloseDate), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
