import { PrismaClient, Lead, CustomerInteraction, FollowUpTask, LeadStatus, FollowUpStatus } from '@prisma/client';
import { WebSocketService } from '../websocket.service';
import type {
  CreateLead,
  UpdateLead,
  CreateInteraction,
  CreateFollowUp,
  UpdateFollowUp,
  PipelineMetrics,
  CRMServiceError,
} from '../../types/crm';

type LeadFilters = {
  status?: LeadStatus;
  assignedToId?: string;
  source?: string;
};

type FollowUpFilters = {
  status?: FollowUpStatus;
};

export class CRMService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async createLead(data: CreateLead, createdById: string): Promise<Lead> {
    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        createdById,
        status: data.status || 'NEW',
        probability: data.probability ?? 50,
      },
    });

    // Emit WebSocket event for new lead
    if (this.wsService) {
      this.wsService.broadcastToCompany(data.companyId, 'lead:created', {
        leadId: lead.id,
        title: lead.title,
        source: lead.source,
        value: lead.value ? Number(lead.value) : null,
        assignedToId: lead.assignedToId,
        createdById,
        timestamp: new Date(),
      });

      // Notify assigned user
      if (lead.assignedToId) {
        this.wsService.emitToUser(lead.assignedToId, 'lead:assigned', {
          leadId: lead.id,
          title: lead.title,
          source: lead.source,
          value: lead.value ? Number(lead.value) : null,
          timestamp: new Date(),
        });
      }
    }

    return lead;
  }

  async updateLead(leadId: string, data: UpdateLead): Promise<Lead> {
    const updateData: any = { ...data };

    if (data.status === 'CONVERTED') {
      updateData.convertedAt = new Date();
    }

    // Get old lead data for comparison
    const oldLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    // Emit WebSocket event for lead update
    if (this.wsService && oldLead) {
      const changes: any = {};
      if (oldLead.status !== lead.status) {
        changes.status = { from: oldLead.status, to: lead.status };
      }
      if (oldLead.assignedToId !== lead.assignedToId) {
        changes.assignedTo = { from: oldLead.assignedToId, to: lead.assignedToId };
      }
      if (oldLead.probability !== lead.probability) {
        changes.probability = { from: oldLead.probability, to: lead.probability };
      }

      this.wsService.broadcastToCompany(lead.companyId, 'lead:updated', {
        leadId: lead.id,
        title: lead.title,
        changes,
        timestamp: new Date(),
      });

      // Notify old assignee if assignment changed
      if (oldLead.assignedToId && oldLead.assignedToId !== lead.assignedToId) {
        this.wsService.emitToUser(oldLead.assignedToId, 'lead:unassigned', {
          leadId: lead.id,
          title: lead.title,
          timestamp: new Date(),
        });
      }

      // Notify new assignee
      if (lead.assignedToId && oldLead.assignedToId !== lead.assignedToId) {
        this.wsService.emitToUser(lead.assignedToId, 'lead:assigned', {
          leadId: lead.id,
          title: lead.title,
          source: lead.source,
          value: lead.value ? Number(lead.value) : null,
          timestamp: new Date(),
        });
      }

      // Special event for conversion
      if (data.status === 'CONVERTED' && oldLead.status !== 'CONVERTED') {
        this.wsService.broadcastToCompany(lead.companyId, 'lead:converted', {
          leadId: lead.id,
          title: lead.title,
          value: lead.value ? Number(lead.value) : null,
          customerId: lead.customerId,
          timestamp: new Date(),
        });
      }
    }

    return lead;
  }

  async getLeadsByCompany(companyId: string, filters?: LeadFilters): Promise<any[]> {
    const where: any = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.source) {
      where.source = filters.source;
    }

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return leads;
  }

  async getLead(leadId: string): Promise<any | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async createInteraction(data: CreateInteraction, createdById: string): Promise<CustomerInteraction> {
    const interaction = await this.prisma.customerInteraction.create({
      data: {
        ...data,
        createdById,
        occurredAt: data.occurredAt || new Date(),
      },
    });

    // Emit WebSocket event for new interaction
    if (this.wsService) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { companyId: true },
      });

      if (customer) {
        this.wsService.broadcastToCompany(customer.companyId, 'customer:interaction', {
          interactionId: interaction.id,
          customerId: interaction.customerId,
          leadId: interaction.leadId,
          type: interaction.type,
          subject: interaction.subject,
          createdById,
          timestamp: new Date(),
        });

        // Notify lead assignee if interaction is related to a lead
        if (interaction.leadId) {
          const lead = await this.prisma.lead.findUnique({
            where: { id: interaction.leadId },
            select: { assignedToId: true },
          });

          if (lead?.assignedToId && lead.assignedToId !== createdById) {
            this.wsService.emitToUser(lead.assignedToId, 'customer:interaction', {
              interactionId: interaction.id,
              leadId: interaction.leadId,
              type: interaction.type,
              subject: interaction.subject,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    return interaction;
  }

  async getCustomerInteractions(customerId: string): Promise<CustomerInteraction[]> {
    const interactions = await this.prisma.customerInteraction.findMany({
      where: { customerId },
      orderBy: { occurredAt: 'desc' },
    });

    return interactions;
  }

  async getLeadInteractions(leadId: string): Promise<CustomerInteraction[]> {
    const interactions = await this.prisma.customerInteraction.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
    });

    return interactions;
  }

  async createFollowUpTask(data: CreateFollowUp): Promise<FollowUpTask> {
    const followUp = await this.prisma.followUpTask.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });

    // Emit WebSocket event for new follow-up
    if (this.wsService) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: data.leadId },
        select: { companyId: true, assignedToId: true },
      });

      if (lead) {
        this.wsService.broadcastToCompany(lead.companyId, 'followup:created', {
          followUpId: followUp.id,
          leadId: data.leadId,
          title: followUp.title,
          dueDate: followUp.dueDate,
          timestamp: new Date(),
        });

        // Notify lead assignee
        if (lead.assignedToId) {
          this.wsService.emitToUser(lead.assignedToId, 'followup:created', {
            followUpId: followUp.id,
            leadId: data.leadId,
            title: followUp.title,
            dueDate: followUp.dueDate,
            timestamp: new Date(),
          });
        }
      }
    }

    return followUp;
  }

  async updateFollowUpTask(followUpId: string, data: UpdateFollowUp): Promise<FollowUpTask> {
    const followUp = await this.prisma.followUpTask.update({
      where: { id: followUpId },
      data,
    });

    // Emit WebSocket event for follow-up update
    if (this.wsService) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: followUp.leadId },
        select: { companyId: true, assignedToId: true },
      });

      if (lead) {
        this.wsService.broadcastToCompany(lead.companyId, 'followup:updated', {
          followUpId,
          leadId: followUp.leadId,
          status: followUp.status,
          completedAt: followUp.completedAt,
          timestamp: new Date(),
        });

        // Special event for completion
        if (data.status === 'COMPLETED' && followUp.completedAt) {
          this.wsService.broadcastToCompany(lead.companyId, 'followup:completed', {
            followUpId,
            leadId: followUp.leadId,
            title: followUp.title,
            timestamp: new Date(),
          });
        }
      }
    }

    return followUp;
  }

  async getLeadFollowUps(leadId: string, filters?: FollowUpFilters): Promise<FollowUpTask[]> {
    const where: any = { leadId };

    if (filters?.status) {
      where.status = filters.status;
    }

    const followUps = await this.prisma.followUpTask.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return followUps;
  }

  async getPipelineMetrics(companyId: string): Promise<PipelineMetrics> {
    const leads = await this.prisma.lead.findMany({
      where: { companyId },
    });

    const totalLeads = leads.length;

    const leadsByStatus: Record<string, number> = {};
    leads.forEach(lead => {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    });

    const totalValue = leads.reduce((sum, lead) => {
      return sum + Number(lead.value || 0);
    }, 0);

    const averageValue = totalLeads > 0 ? totalValue / totalLeads : 0;

    const convertedCount = leadsByStatus['CONVERTED'] || 0;
    const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

    const sourceStats: Record<string, { count: number; converted: number }> = {};
    leads.forEach(lead => {
      if (!sourceStats[lead.source]) {
        sourceStats[lead.source] = { count: 0, converted: 0 };
      }
      sourceStats[lead.source].count++;
      if (lead.status === 'CONVERTED') {
        sourceStats[lead.source].converted++;
      }
    });

    const topSources = Object.entries(sourceStats)
      .map(([source, stats]) => ({
        source,
        count: stats.count,
        conversionRate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const forecastedRevenue = leads
      .filter(lead => lead.status !== 'LOST' && lead.status !== 'CONVERTED')
      .reduce((sum, lead) => {
        const value = Number(lead.value || 0);
        const probability = lead.probability / 100;
        return sum + (value * probability);
      }, 0);

    const completedLeads = leads.filter(
      lead => lead.status === 'CONVERTED' || lead.status === 'LOST'
    );

    let averageCycleTime = 0;
    if (completedLeads.length > 0) {
      const totalCycleTime = completedLeads.reduce((sum, lead) => {
        const endDate = lead.convertedAt || lead.updatedAt;
        const cycleTime = endDate.getTime() - lead.createdAt.getTime();
        return sum + cycleTime;
      }, 0);
      averageCycleTime = totalCycleTime / completedLeads.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    return {
      totalLeads,
      leadsByStatus,
      totalValue,
      averageValue,
      conversionRate,
      averageCycleTime,
      topSources,
      forecastedRevenue,
    };
  }

  async convertLeadToCustomer(
    leadId: string,
    options?: { createProject?: boolean; projectName?: string }
  ): Promise<{ customer: any; lead: Lead; project?: any }> {
    // Get the lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.status === 'CONVERTED' && lead.customerId) {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id: lead.customerId },
      });
      if (existingCustomer) {
        throw new Error('Lead already converted to customer');
      }
    }

    // Create customer from lead data
    const customer = await this.prisma.customer.create({
      data: {
        companyId: lead.companyId,
        name: lead.contactName,
        email: lead.contactEmail || undefined,
        phone: lead.contactPhone || undefined,
        address: lead.contactAddress || undefined,
        notes: `Converted from lead: ${lead.title}\n${lead.description || ''}`,
        isActive: true,
      },
    });

    // Update lead with customer ID and set as converted
    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        customerId: customer.id,
        status: 'CONVERTED',
        convertedAt: new Date(),
      },
    });

    // Optionally create project
    let project;
    if (options?.createProject) {
      project = await this.prisma.project.create({
        data: {
          name: options.projectName || lead.title,
          description: lead.description || undefined,
          status: 'DRAFT',
          companyId: lead.companyId,
          customerId: customer.id,
          createdById: lead.createdById,
          budget: lead.value || undefined,
        },
      });
    }

    // Emit WebSocket events
    if (this.wsService) {
      this.wsService.broadcastToCompany(lead.companyId, 'lead:converted', {
        leadId: lead.id,
        customerId: customer.id,
        customerName: customer.name,
        projectId: project?.id,
        value: lead.value ? Number(lead.value) : null,
        timestamp: new Date(),
      });

      if (lead.assignedToId) {
        this.wsService.emitToUser(lead.assignedToId, 'customer:created', {
          customerId: customer.id,
          customerName: customer.name,
          fromLeadId: lead.id,
          projectId: project?.id,
          timestamp: new Date(),
        });
      }
    }

    return { customer, lead: updatedLead, project };
  }
}