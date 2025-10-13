import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'SOCIAL_MEDIA' | 'TRADE_SHOW' | 'ADVERTISEMENT' | 'OTHER';
export type InteractionType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'SMS';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface Lead {
  id: string;
  companyId: string;
  customerId?: string;
  title: string;
  description?: string;
  status: LeadStatus;
  source: LeadSource;
  value?: number;
  probability: number;
  expectedCloseDate?: Date;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  qualificationScore?: number;
  assignedToId?: string;
  createdById: string;
  convertedAt?: Date;
  lostReason?: string;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateLeadData {
  companyId: string;
  title: string;
  description?: string;
  source: LeadSource;
  value?: number;
  probability?: number;
  expectedCloseDate?: Date;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  assignedToId?: string;
}

export interface UpdateLeadData {
  title?: string;
  description?: string;
  status?: LeadStatus;
  value?: number;
  probability?: number;
  expectedCloseDate?: Date;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  assignedToId?: string;
  lostReason?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  leadId?: string;
  type: InteractionType;
  subject: string;
  content?: string;
  direction?: string;
  duration?: number;
  outcome?: string;
  createdById: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInteractionData {
  customerId: string;
  leadId?: string;
  type: InteractionType;
  subject: string;
  content?: string;
  direction?: string;
  duration?: number;
  outcome?: string;
  occurredAt?: Date;
}

export interface FollowUpTask {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  status: FollowUpStatus;
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFollowUpData {
  leadId: string;
  title: string;
  description?: string;
  dueDate: Date;
}

export interface UpdateFollowUpData {
  title?: string;
  description?: string;
  status?: FollowUpStatus;
  dueDate?: Date;
  completedAt?: Date;
}

export interface PipelineMetrics {
  totalLeads: number;
  leadsByStatus?: Record<string, number>;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
  averageCycleTime: number;
  topSources: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
  forecastedRevenue: number;
}

export interface ConvertLeadOptions {
  createProject?: boolean;
  projectName?: string;
}

export interface ConvertLeadResult {
  customer: Customer;
  lead: Lead;
  project?: any;
}

// Leads Hooks
export function useLeads(params: { companyId: string; status?: LeadStatus; assignedToId?: string; source?: string }) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/crm/leads', { params });
      return response.data.leads as Lead[];
    },
    enabled: !!params.companyId,
  });
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/leads/${leadId}`);
      return response.data.lead as Lead;
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const response = await apiClient.post('/api/v1/crm/leads', data);
      return response.data.lead as Lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline', lead.companyId] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: UpdateLeadData }) => {
      const response = await apiClient.patch(`/api/v1/crm/leads/${leadId}`, data);
      return response.data.lead as Lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline', lead.companyId] });
      queryClient.setQueryData(['leads', lead.id], lead);
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, options }: { leadId: string; options?: ConvertLeadOptions }) => {
      const response = await apiClient.post(`/api/v1/crm/leads/${leadId}/convert`, options || {});
      return response.data as ConvertLeadResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline', result.lead.companyId] });
      if (result.project) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
    },
  });
}

// Customers Hooks
export function useCustomers(params: { companyId: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/crm/customers', { params });
      return response.data.customers as Customer[];
    },
    enabled: !!params.companyId,
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/customers/${customerId}`);
      return response.data.customer as Customer;
    },
    enabled: !!customerId,
  });
}

export function useCustomerProjects(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'projects'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/customers/${customerId}/projects`);
      return response.data.projects;
    },
    enabled: !!customerId,
  });
}

// Customer Interactions Hooks
export function useCustomerInteractions(customerId: string) {
  return useQuery({
    queryKey: ['interactions', 'customer', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/customers/${customerId}/interactions`);
      return response.data.interactions as CustomerInteraction[];
    },
    enabled: !!customerId,
  });
}

export function useLeadInteractions(leadId: string) {
  return useQuery({
    queryKey: ['interactions', 'lead', leadId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/leads/${leadId}/interactions`);
      return response.data.interactions as CustomerInteraction[];
    },
    enabled: !!leadId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInteractionData) => {
      const response = await apiClient.post('/api/v1/crm/interactions', data);
      return response.data.interaction as CustomerInteraction;
    },
    onSuccess: (interaction) => {
      queryClient.invalidateQueries({ queryKey: ['interactions', 'customer', interaction.customerId] });
      if (interaction.leadId) {
        queryClient.invalidateQueries({ queryKey: ['interactions', 'lead', interaction.leadId] });
      }
    },
  });
}

// Follow-up Tasks Hooks
export function useLeadFollowUps(leadId: string, status?: FollowUpStatus) {
  return useQuery({
    queryKey: ['follow-ups', leadId, { status }],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/leads/${leadId}/follow-ups`, {
        params: { status },
      });
      return response.data.followUps as FollowUpTask[];
    },
    enabled: !!leadId,
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFollowUpData) => {
      const response = await apiClient.post('/api/v1/crm/follow-ups', data);
      return response.data.followUp as FollowUpTask;
    },
    onSuccess: (followUp) => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', followUp.leadId] });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followUpId, data }: { followUpId: string; data: UpdateFollowUpData }) => {
      const response = await apiClient.patch(`/api/v1/crm/follow-ups/${followUpId}`, data);
      return response.data.followUp as FollowUpTask;
    },
    onSuccess: (followUp) => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', followUp.leadId] });
    },
  });
}

// Pipeline Metrics Hook
export function usePipelineMetrics(companyId: string) {
  return useQuery({
    queryKey: ['pipeline', companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/crm/pipeline/${companyId}`);
      return response.data.metrics as PipelineMetrics;
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute - pipeline metrics don't change frequently
  });
}

// Project-Customer Assignment Hooks
export function useAssignCustomerToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, customerId }: { projectId: string; customerId: string }) => {
      const response = await apiClient.post(`/api/v1/crm/projects/${projectId}/assign-customer`, {
        customerId,
      });
      return response.data.project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      if (project.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customers', project.customerId, 'projects'] });
      }
    },
  });
}

export function useRemoveCustomerFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiClient.delete(`/api/v1/crm/projects/${projectId}/assign-customer`);
      return response.data.project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });
}
