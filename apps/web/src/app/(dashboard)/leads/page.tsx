'use client';

import { useState } from 'react';
import { Plus, Filter, Search, Phone, Mail, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useLeads, useConvertLead, type Lead, type LeadStatus } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-indigo-500',
  QUALIFIED: 'bg-purple-500',
  PROPOSAL: 'bg-yellow-500',
  NEGOTIATION: 'bg-orange-500',
  CONVERTED: 'bg-green-500',
  LOST: 'bg-red-500',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [createProject, setCreateProject] = useState(false);
  const [projectName, setProjectName] = useState('');

  const { data: leads = [], isLoading } = useLeads({
    companyId: user?.companyId || '',
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const convertLead = useConvertLead();

  const filteredLeads = leads.filter(lead =>
    lead.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConvert = async () => {
    if (!selectedLead) return;

    try {
      await convertLead.mutateAsync({
        leadId: selectedLead.id,
        options: createProject ? { createProject: true, projectName: projectName || selectedLead.title } : undefined,
      });
      setConvertDialogOpen(false);
      setSelectedLead(null);
      setCreateProject(false);
      setProjectName('');
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  // Calculate quick stats
  const stats = {
    total: leads.length,
    qualified: leads.filter(l => l.status === 'QUALIFIED' || l.status === 'PROPOSAL' || l.status === 'NEGOTIATION').length,
    converted: leads.filter(l => l.status === 'CONVERTED').length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.value || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage and convert your sales leads</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | 'ALL')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="PROPOSAL">Proposal</SelectItem>
            <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leads found. Create your first lead to get started.
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{lead.title}</h3>
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                      {lead.probability > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {lead.probability}% probability
                        </span>
                      )}
                    </div>
                    {lead.company && (
                      <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Company: {lead.company.name}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{lead.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.contactName}</span>
                        </div>
                        {lead.contactEmail && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.contactEmail}</span>
                          </div>
                        )}
                        {lead.contactPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.contactPhone}</span>
                          </div>
                        )}
                        {lead.value && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${lead.value.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          setConvertDialogOpen(true);
                        }}
                      >
                        Convert to Customer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Convert Lead Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Customer</DialogTitle>
            <DialogDescription>
              Convert {selectedLead?.title} into a customer. Optionally create a project for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Customer Information</h4>
              <div className="text-sm text-muted-foreground">
                <p>Name: {selectedLead?.contactName}</p>
                <p>Email: {selectedLead?.contactEmail || 'Not provided'}</p>
                <p>Phone: {selectedLead?.contactPhone || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createProject"
                  checked={createProject}
                  onChange={(e) => setCreateProject(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="createProject" className="text-sm font-medium">
                  Create a project for this customer
                </label>
              </div>
              {createProject && (
                <Input
                  placeholder="Project name (optional)"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConvertDialogOpen(false);
                  setSelectedLead(null);
                  setCreateProject(false);
                  setProjectName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConvert} disabled={convertLead.isPending}>
                {convertLead.isPending ? 'Converting...' : 'Convert to Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
