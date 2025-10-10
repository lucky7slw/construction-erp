import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LeadStatus, LeadSource, InteractionType, FollowUpStatus } from '@prisma/client';
import { prisma } from '../../lib/database';
import { CRMService } from './crm.service';
import type { CreateLead, CreateInteraction, CreateFollowUp } from '../../types/crm';

const crmService = new CRMService(prisma);

describe('CRMService', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testCustomerId: string;
  let testLeadId: string;

  beforeEach(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `test-crm-${Date.now()}@example.com`,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testUserId = testUser.id;

    const testCompany = await prisma.company.create({
      data: {
        name: `Test Company ${Date.now()}`,
        users: {
          create: {
            userId: testUserId,
            isOwner: true,
          },
        },
      },
    });
    testCompanyId = testCompany.id;

    const testCustomer = await prisma.customer.create({
      data: {
        companyId: testCompanyId,
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+1234567890',
      },
    });
    testCustomerId = testCustomer.id;
  });

  afterEach(async () => {
    await prisma.followUpTask.deleteMany({ where: { lead: { companyId: testCompanyId } } });
    await prisma.customerInteraction.deleteMany({ where: { customer: { companyId: testCompanyId } } });
    await prisma.lead.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.customer.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.companyUser.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('Lead Management', () => {
    it('should create a new lead with required fields', async () => {
      const leadData: CreateLead = {
        companyId: testCompanyId,
        title: 'Kitchen Renovation Project',
        description: 'Complete kitchen remodel for residential property',
        source: 'WEBSITE' as LeadSource,
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        contactPhone: '+1234567890',
        value: 50000,
        probability: 75,
      };

      const lead = await crmService.createLead(leadData, testUserId);

      expect(lead).toBeDefined();
      expect(lead.id).toBeDefined();
      expect(lead.title).toBe('Kitchen Renovation Project');
      expect(lead.status).toBe('NEW');
      expect(lead.source).toBe('WEBSITE');
      expect(lead.contactName).toBe('John Doe');
      expect(lead.value?.toString()).toBe('50000');
      expect(lead.probability).toBe(75);
      expect(lead.createdById).toBe(testUserId);

      testLeadId = lead.id;
    });

    it('should create a lead with minimal required fields', async () => {
      const leadData: CreateLead = {
        companyId: testCompanyId,
        title: 'Basic Lead',
        source: 'REFERRAL' as LeadSource,
        contactName: 'Jane Smith',
      };

      const lead = await crmService.createLead(leadData, testUserId);

      expect(lead).toBeDefined();
      expect(lead.title).toBe('Basic Lead');
      expect(lead.source).toBe('REFERRAL');
      expect(lead.contactName).toBe('Jane Smith');
      expect(lead.probability).toBe(50); // Default value
      expect(lead.status).toBe('NEW'); // Default status
    });

    it('should update lead status and properties', async () => {
      const leadData: CreateLead = {
        companyId: testCompanyId,
        title: 'Test Lead for Update',
        source: 'COLD_CALL' as LeadSource,
        contactName: 'Update Test',
      };

      const lead = await crmService.createLead(leadData, testUserId);

      const updated = await crmService.updateLead(lead.id, {
        status: 'QUALIFIED' as LeadStatus,
        probability: 80,
        value: 75000,
        assignedToId: testUserId,
      });

      expect(updated.status).toBe('QUALIFIED');
      expect(updated.probability).toBe(80);
      expect(updated.value?.toString()).toBe('75000');
      expect(updated.assignedToId).toBe(testUserId);
    });

    it('should retrieve leads by company', async () => {
      await crmService.createLead({
        companyId: testCompanyId,
        title: 'Lead 1',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Contact 1',
      }, testUserId);

      await crmService.createLead({
        companyId: testCompanyId,
        title: 'Lead 2',
        source: 'REFERRAL' as LeadSource,
        contactName: 'Contact 2',
      }, testUserId);

      const leads = await crmService.getLeadsByCompany(testCompanyId);

      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads.every(lead => lead.companyId === testCompanyId)).toBe(true);
    });

    it('should filter leads by status', async () => {
      await crmService.createLead({
        companyId: testCompanyId,
        title: 'New Lead',
        source: 'WEBSITE' as LeadSource,
        contactName: 'New Contact',
        status: 'NEW' as LeadStatus,
      }, testUserId);

      const qualifiedLead = await crmService.createLead({
        companyId: testCompanyId,
        title: 'Qualified Lead',
        source: 'REFERRAL' as LeadSource,
        contactName: 'Qualified Contact',
      }, testUserId);

      await crmService.updateLead(qualifiedLead.id, {
        status: 'QUALIFIED' as LeadStatus,
      });

      const qualifiedLeads = await crmService.getLeadsByCompany(testCompanyId, {
        status: 'QUALIFIED' as LeadStatus,
      });

      expect(qualifiedLeads.length).toBeGreaterThanOrEqual(1);
      expect(qualifiedLeads.every(lead => lead.status === 'QUALIFIED')).toBe(true);
    });

    it('should convert lead to customer when status is CONVERTED', async () => {
      const lead = await crmService.createLead({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Lead to Convert',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Convert Test',
      }, testUserId);

      const converted = await crmService.updateLead(lead.id, {
        status: 'CONVERTED' as LeadStatus,
      });

      expect(converted.status).toBe('CONVERTED');
      expect(converted.convertedAt).toBeDefined();
      expect(converted.convertedAt).toBeInstanceOf(Date);
    });

    it('should track lost reason when lead is marked as LOST', async () => {
      const lead = await crmService.createLead({
        companyId: testCompanyId,
        title: 'Lead to Lose',
        source: 'COLD_CALL' as LeadSource,
        contactName: 'Lost Test',
      }, testUserId);

      const lost = await crmService.updateLead(lead.id, {
        status: 'LOST' as LeadStatus,
        lostReason: 'Budget constraints',
      });

      expect(lost.status).toBe('LOST');
      expect(lost.lostReason).toBe('Budget constraints');
    });
  });

  describe('Customer Interaction Tracking', () => {
    beforeEach(async () => {
      const lead = await crmService.createLead({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Test Lead for Interactions',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Interaction Test',
      }, testUserId);
      testLeadId = lead.id;
    });

    it('should create a customer interaction', async () => {
      const interactionData: CreateInteraction = {
        customerId: testCustomerId,
        leadId: testLeadId,
        type: 'CALL' as InteractionType,
        subject: 'Initial Discovery Call',
        content: 'Discussed project requirements and budget',
        direction: 'outbound',
        duration: 30,
        outcome: 'Positive - scheduled follow-up meeting',
      };

      const interaction = await crmService.createInteraction(interactionData, testUserId);

      expect(interaction).toBeDefined();
      expect(interaction.customerId).toBe(testCustomerId);
      expect(interaction.leadId).toBe(testLeadId);
      expect(interaction.type).toBe('CALL');
      expect(interaction.subject).toBe('Initial Discovery Call');
      expect(interaction.duration).toBe(30);
      expect(interaction.direction).toBe('outbound');
      expect(interaction.createdById).toBe(testUserId);
    });

    it('should retrieve interaction history for a customer', async () => {
      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'CALL' as InteractionType,
        subject: 'First Call',
        content: 'Initial contact',
      }, testUserId);

      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'EMAIL' as InteractionType,
        subject: 'Follow-up Email',
        content: 'Sent quote',
      }, testUserId);

      const interactions = await crmService.getCustomerInteractions(testCustomerId);

      expect(interactions.length).toBeGreaterThanOrEqual(2);
      expect(interactions.every(i => i.customerId === testCustomerId)).toBe(true);
    });

    it('should retrieve interaction timeline ordered by date', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'CALL' as InteractionType,
        subject: 'First Call',
        occurredAt: twoDaysAgo,
      }, testUserId);

      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'EMAIL' as InteractionType,
        subject: 'Follow-up',
        occurredAt: yesterday,
      }, testUserId);

      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'MEETING' as InteractionType,
        subject: 'Site Visit',
        occurredAt: now,
      }, testUserId);

      const timeline = await crmService.getCustomerInteractions(testCustomerId);

      expect(timeline.length).toBeGreaterThanOrEqual(3);

      // Verify chronological order (most recent first)
      for (let i = 0; i < timeline.length - 1; i++) {
        const current = new Date(timeline[i].occurredAt);
        const next = new Date(timeline[i + 1].occurredAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should filter interactions by lead', async () => {
      await crmService.createInteraction({
        customerId: testCustomerId,
        leadId: testLeadId,
        type: 'CALL' as InteractionType,
        subject: 'Lead-specific call',
      }, testUserId);

      await crmService.createInteraction({
        customerId: testCustomerId,
        type: 'EMAIL' as InteractionType,
        subject: 'General customer email',
      }, testUserId);

      const leadInteractions = await crmService.getLeadInteractions(testLeadId);

      expect(leadInteractions.length).toBeGreaterThanOrEqual(1);
      expect(leadInteractions.every(i => i.leadId === testLeadId)).toBe(true);
    });
  });

  describe('Follow-up Task Management', () => {
    beforeEach(async () => {
      const lead = await crmService.createLead({
        companyId: testCompanyId,
        title: 'Test Lead for Follow-ups',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Follow-up Test',
      }, testUserId);
      testLeadId = lead.id;
    });

    it('should create a follow-up task', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const followUpData: CreateFollowUp = {
        leadId: testLeadId,
        title: 'Send Quote',
        description: 'Prepare and send detailed quote to customer',
        dueDate: tomorrow,
      };

      const followUp = await crmService.createFollowUpTask(followUpData);

      expect(followUp).toBeDefined();
      expect(followUp.leadId).toBe(testLeadId);
      expect(followUp.title).toBe('Send Quote');
      expect(followUp.status).toBe('PENDING');
      expect(followUp.dueDate).toBeDefined();
    });

    it('should retrieve pending follow-ups for a lead', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await crmService.createFollowUpTask({
        leadId: testLeadId,
        title: 'Task 1',
        dueDate: tomorrow,
      });

      await crmService.createFollowUpTask({
        leadId: testLeadId,
        title: 'Task 2',
        dueDate: tomorrow,
      });

      const followUps = await crmService.getLeadFollowUps(testLeadId);

      expect(followUps.length).toBeGreaterThanOrEqual(2);
      expect(followUps.every(f => f.leadId === testLeadId)).toBe(true);
    });

    it('should complete a follow-up task', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const followUp = await crmService.createFollowUpTask({
        leadId: testLeadId,
        title: 'Task to Complete',
        dueDate: tomorrow,
      });

      const completed = await crmService.updateFollowUpTask(followUp.id, {
        status: 'COMPLETED' as FollowUpStatus,
        completedAt: new Date(),
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('should identify overdue follow-ups', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await crmService.createFollowUpTask({
        leadId: testLeadId,
        title: 'Overdue Task',
        dueDate: yesterday,
      });

      const overdueFollowUps = await crmService.getLeadFollowUps(testLeadId, {
        status: 'PENDING' as FollowUpStatus,
      });

      const now = new Date();
      const overdue = overdueFollowUps.filter(f => new Date(f.dueDate) < now);

      expect(overdue.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Pipeline Analytics', () => {
    beforeEach(async () => {
      await crmService.createLead({
        companyId: testCompanyId,
        title: 'New Lead 1',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Contact 1',
        value: 30000,
        status: 'NEW' as LeadStatus,
      }, testUserId);

      const qualifiedLead = await crmService.createLead({
        companyId: testCompanyId,
        title: 'Qualified Lead',
        source: 'REFERRAL' as LeadSource,
        contactName: 'Contact 2',
        value: 50000,
        status: 'NEW' as LeadStatus,
      }, testUserId);

      await crmService.updateLead(qualifiedLead.id, {
        status: 'QUALIFIED' as LeadStatus,
      });

      const convertedLead = await crmService.createLead({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Converted Lead',
        source: 'WEBSITE' as LeadSource,
        contactName: 'Contact 3',
        value: 75000,
        status: 'NEW' as LeadStatus,
      }, testUserId);

      await crmService.updateLead(convertedLead.id, {
        status: 'CONVERTED' as LeadStatus,
      });
    });

    it('should calculate pipeline metrics', async () => {
      const metrics = await crmService.getPipelineMetrics(testCompanyId);

      expect(metrics).toBeDefined();
      expect(metrics.totalLeads).toBeGreaterThanOrEqual(3);
      expect(metrics.leadsByStatus).toBeDefined();
      expect(metrics.leadsByStatus['NEW']).toBeGreaterThanOrEqual(1);
      expect(metrics.leadsByStatus['QUALIFIED']).toBeGreaterThanOrEqual(1);
      expect(metrics.leadsByStatus['CONVERTED']).toBeGreaterThanOrEqual(1);
    });

    it('should calculate total pipeline value', async () => {
      const metrics = await crmService.getPipelineMetrics(testCompanyId);

      expect(metrics.totalValue).toBeGreaterThanOrEqual(155000); // 30k + 50k + 75k
      expect(metrics.averageValue).toBeGreaterThan(0);
    });

    it('should calculate conversion rate', async () => {
      const metrics = await crmService.getPipelineMetrics(testCompanyId);

      expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should identify top lead sources', async () => {
      const metrics = await crmService.getPipelineMetrics(testCompanyId);

      expect(metrics.topSources).toBeDefined();
      expect(Array.isArray(metrics.topSources)).toBe(true);
      expect(metrics.topSources.length).toBeGreaterThan(0);

      metrics.topSources.forEach(source => {
        expect(source.source).toBeDefined();
        expect(source.count).toBeGreaterThan(0);
        expect(source.conversionRate).toBeGreaterThanOrEqual(0);
      });
    });

    it('should forecast revenue based on pipeline', async () => {
      const metrics = await crmService.getPipelineMetrics(testCompanyId);

      expect(metrics.forecastedRevenue).toBeGreaterThanOrEqual(0);
      // Forecast should consider probability: 30k*50% + 50k*50% = 40k minimum
      expect(metrics.forecastedRevenue).toBeGreaterThan(0);
    });
  });
});