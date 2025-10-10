import { PrismaClient } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type DailyLogCreateInput = {
  projectId: string;
  date: Date;
  weather?: {
    temp?: number;
    conditions?: string;
    rain?: boolean;
    wind?: string;
  };
  workCompleted?: string;
  notes?: string;
  photos?: string[];
  crew?: Array<{
    workerId: string;
    workerName: string;
    hoursWorked: number;
    trade: string;
    notes?: string;
  }>;
  deliveries?: Array<{
    supplier: string;
    material: string;
    quantity: string;
    poNumber?: string;
    receivedBy: string;
    notes?: string;
  }>;
  equipment?: Array<{
    equipment: string;
    hours: number;
    operator?: string;
    notes?: string;
  }>;
  incidents?: Array<{
    type: 'INJURY' | 'NEAR_MISS' | 'PROPERTY_DAMAGE' | 'SAFETY_VIOLATION';
    severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
    description: string;
    personInvolved?: string;
    actionTaken: string;
    photos?: string[];
    reportedTo?: string;
    followUpRequired?: boolean;
  }>;
};

export type DailyLogUpdateInput = Partial<Omit<DailyLogCreateInput, 'projectId' | 'date'>>;

export class DailyLogService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async createDailyLog(
    input: DailyLogCreateInput,
    createdById: string
  ) {
    // Check if log already exists for this date
    const existing = await this.prisma.dailyLog.findUnique({
      where: {
        projectId_date: {
          projectId: input.projectId,
          date: input.date,
        },
      },
    });

    if (existing) {
      throw new Error('Daily log already exists for this date');
    }

    // Get project for WebSocket broadcast
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { companyId: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create daily log with all related data
    const dailyLog = await this.prisma.dailyLog.create({
      data: {
        projectId: input.projectId,
        date: input.date,
        weather: input.weather || null,
        workCompleted: input.workCompleted,
        notes: input.notes,
        photos: input.photos || [],
        createdById,
        crewPresent: input.crew
          ? {
              create: input.crew.map((c) => ({
                workerId: c.workerId,
                workerName: c.workerName,
                hoursWorked: c.hoursWorked,
                trade: c.trade,
                notes: c.notes,
              })),
            }
          : undefined,
        deliveries: input.deliveries
          ? {
              create: input.deliveries.map((d) => ({
                supplier: d.supplier,
                material: d.material,
                quantity: d.quantity,
                poNumber: d.poNumber,
                receivedBy: d.receivedBy,
                notes: d.notes,
              })),
            }
          : undefined,
        equipmentUsed: input.equipment
          ? {
              create: input.equipment.map((e) => ({
                equipment: e.equipment,
                hours: e.hours,
                operator: e.operator,
                notes: e.notes,
              })),
            }
          : undefined,
        incidents: input.incidents
          ? {
              create: input.incidents.map((i) => ({
                type: i.type,
                severity: i.severity,
                description: i.description,
                personInvolved: i.personInvolved,
                actionTaken: i.actionTaken,
                photos: i.photos || [],
                reportedTo: i.reportedTo,
                followUpRequired: i.followUpRequired || false,
              })),
            }
          : undefined,
      },
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
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

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'dailylog:created', {
        dailyLogId: dailyLog.id,
        projectId: input.projectId,
        projectName: project.name,
        date: dailyLog.date,
        createdBy: dailyLog.createdBy,
        hasCrew: dailyLog.crewPresent.length > 0,
        hasDeliveries: dailyLog.deliveries.length > 0,
        hasIncidents: dailyLog.incidents.length > 0,
        timestamp: new Date(),
      });
    }

    return dailyLog;
  }

  async getDailyLog(id: string) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!dailyLog) {
      throw new Error('Daily log not found');
    }

    return dailyLog;
  }

  async updateDailyLog(
    id: string,
    input: DailyLogUpdateInput
  ) {
    const existing = await this.getDailyLog(id);

    const updated = await this.prisma.dailyLog.update({
      where: { id },
      data: {
        weather: input.weather !== undefined ? input.weather : undefined,
        workCompleted: input.workCompleted,
        notes: input.notes,
        photos: input.photos,
      },
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
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

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'dailylog:updated',
        {
          dailyLogId: updated.id,
          projectId: existing.project.id,
          date: updated.date,
          timestamp: new Date(),
        }
      );
    }

    return updated;
  }

  async getProjectDailyLogs(
    projectId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ) {
    const where: any = { projectId };

    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options.startDate) {
        where.date.gte = options.startDate;
      }
      if (options.endDate) {
        where.date.lte = options.endDate;
      }
    }

    const dailyLogs = await this.prisma.dailyLog.findMany({
      where,
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: options?.limit,
    });

    return dailyLogs;
  }

  async deleteDailyLog(id: string) {
    const existing = await this.getDailyLog(id);

    await this.prisma.dailyLog.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'dailylog:deleted',
        {
          dailyLogId: id,
          projectId: existing.project.id,
          date: existing.date,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  // Crew management
  async addCrewMember(dailyLogId: string, crew: {
    workerId: string;
    workerName: string;
    hoursWorked: number;
    trade: string;
    notes?: string;
  }) {
    const crewMember = await this.prisma.crewAttendance.create({
      data: {
        dailyLogId,
        workerId: crew.workerId,
        workerName: crew.workerName,
        hoursWorked: crew.hoursWorked,
        trade: crew.trade,
        notes: crew.notes,
      },
    });

    return crewMember;
  }

  async removeCrewMember(crewId: string) {
    await this.prisma.crewAttendance.delete({
      where: { id: crewId },
    });

    return { success: true };
  }

  // Delivery management
  async addDelivery(dailyLogId: string, delivery: {
    supplier: string;
    material: string;
    quantity: string;
    poNumber?: string;
    receivedBy: string;
    notes?: string;
  }) {
    const deliveryRecord = await this.prisma.delivery.create({
      data: {
        dailyLogId,
        supplier: delivery.supplier,
        material: delivery.material,
        quantity: delivery.quantity,
        poNumber: delivery.poNumber,
        receivedBy: delivery.receivedBy,
        notes: delivery.notes,
      },
    });

    return deliveryRecord;
  }

  async removeDelivery(deliveryId: string) {
    await this.prisma.delivery.delete({
      where: { id: deliveryId },
    });

    return { success: true };
  }

  // Equipment management
  async addEquipment(dailyLogId: string, equipment: {
    equipment: string;
    hours: number;
    operator?: string;
    notes?: string;
  }) {
    const equipmentRecord = await this.prisma.equipmentUsage.create({
      data: {
        dailyLogId,
        equipment: equipment.equipment,
        hours: equipment.hours,
        operator: equipment.operator,
        notes: equipment.notes,
      },
    });

    return equipmentRecord;
  }

  async removeEquipment(equipmentId: string) {
    await this.prisma.equipmentUsage.delete({
      where: { id: equipmentId },
    });

    return { success: true };
  }

  // Safety incident management
  async addIncident(dailyLogId: string, incident: {
    type: 'INJURY' | 'NEAR_MISS' | 'PROPERTY_DAMAGE' | 'SAFETY_VIOLATION';
    severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
    description: string;
    personInvolved?: string;
    actionTaken: string;
    photos?: string[];
    reportedTo?: string;
    followUpRequired?: boolean;
  }) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id: dailyLogId },
      include: {
        project: {
          select: { companyId: true },
        },
      },
    });

    const incidentRecord = await this.prisma.safetyIncident.create({
      data: {
        dailyLogId,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        personInvolved: incident.personInvolved,
        actionTaken: incident.actionTaken,
        photos: incident.photos || [],
        reportedTo: incident.reportedTo,
        followUpRequired: incident.followUpRequired || false,
      },
    });

    // Critical incidents trigger immediate WebSocket alert
    if (this.wsService && dailyLog && (incident.severity === 'SERIOUS' || incident.severity === 'CRITICAL')) {
      this.wsService.broadcastToCompany(
        dailyLog.project.companyId,
        'safety:incident',
        {
          incidentId: incidentRecord.id,
          dailyLogId,
          type: incident.type,
          severity: incident.severity,
          description: incident.description,
          personInvolved: incident.personInvolved,
          urgent: true,
          timestamp: new Date(),
        }
      );
    }

    return incidentRecord;
  }

  async removeIncident(incidentId: string) {
    await this.prisma.safetyIncident.delete({
      where: { id: incidentId },
    });

    return { success: true };
  }

  // Statistics and summaries
  async getProjectSummary(projectId: string, startDate: Date, endDate: Date) {
    const logs = await this.getProjectDailyLogs(projectId, {
      startDate,
      endDate,
    });

    const summary = {
      totalDays: logs.length,
      totalCrewHours: 0,
      totalDeliveries: 0,
      totalEquipmentHours: 0,
      totalIncidents: 0,
      incidentsByType: {} as Record<string, number>,
      incidentsBySeverity: {} as Record<string, number>,
      crewByTrade: {} as Record<string, number>,
    };

    for (const log of logs) {
      summary.totalCrewHours += log.crewPresent.reduce(
        (sum, c) => sum + Number(c.hoursWorked),
        0
      );
      summary.totalDeliveries += log.deliveries.length;
      summary.totalEquipmentHours += log.equipmentUsed.reduce(
        (sum, e) => sum + Number(e.hours),
        0
      );
      summary.totalIncidents += log.incidents.length;

      for (const incident of log.incidents) {
        summary.incidentsByType[incident.type] =
          (summary.incidentsByType[incident.type] || 0) + 1;
        summary.incidentsBySeverity[incident.severity] =
          (summary.incidentsBySeverity[incident.severity] || 0) + 1;
      }

      for (const crew of log.crewPresent) {
        summary.crewByTrade[crew.trade] =
          (summary.crewByTrade[crew.trade] || 0) + Number(crew.hoursWorked);
      }
    }

    return summary;
  }
}
