import { PrismaClient, IncidentType, IncidentSeverity } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type DailyLogCreateInput = {
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
};

type CrewAttendanceInput = {
  dailyLogId: string;
  workerId: string;
  workerName: string;
  hoursWorked: number;
  trade: string;
  notes?: string;
};

type DeliveryInput = {
  dailyLogId: string;
  supplier: string;
  material: string;
  quantity: string;
  poNumber?: string;
  receivedBy: string;
  notes?: string;
};

type EquipmentUsageInput = {
  dailyLogId: string;
  equipment: string;
  hours: number;
  operator?: string;
  notes?: string;
};

type SafetyIncidentInput = {
  dailyLogId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  personInvolved?: string;
  actionTaken: string;
  photos?: string[];
  reportedTo?: string;
  followUpRequired?: boolean;
};

// ============================================================================
// SERVICE
// ============================================================================

export class DailyLogsService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // DAILY LOGS
  // ========================================

  async createDailyLog(
    input: DailyLogCreateInput,
    createdById: string
  ): Promise<any> {
    return this.prisma.dailyLog.create({
      data: {
        projectId: input.projectId,
        date: input.date,
        weather: input.weather || {},
        workCompleted: input.workCompleted,
        notes: input.notes,
        photos: input.photos || [],
        createdById,
      },
      include: {
        project: true,
        createdBy: true,
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
    });
  }

  async getDailyLog(logId: string): Promise<any> {
    return this.prisma.dailyLog.findUniqueOrThrow({
      where: { id: logId },
      include: {
        project: true,
        createdBy: true,
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
    });
  }

  async getDailyLogByDate(projectId: string, date: Date): Promise<any | null> {
    return this.prisma.dailyLog.findUnique({
      where: {
        projectId_date: {
          projectId,
          date,
        },
      },
      include: {
        project: true,
        createdBy: true,
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
    });
  }

  async listDailyLogs(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    return this.prisma.dailyLog.findMany({
      where: {
        projectId,
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        createdBy: true,
        _count: {
          select: {
            crewPresent: true,
            deliveries: true,
            equipmentUsed: true,
            incidents: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async updateDailyLog(
    logId: string,
    updates: Partial<DailyLogCreateInput>
  ): Promise<any> {
    return this.prisma.dailyLog.update({
      where: { id: logId },
      data: updates,
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
    });
  }

  async deleteDailyLog(logId: string): Promise<void> {
    await this.prisma.dailyLog.delete({
      where: { id: logId },
    });
  }

  // ========================================
  // CREW ATTENDANCE
  // ========================================

  async addCrewAttendance(input: CrewAttendanceInput): Promise<any> {
    return this.prisma.crewAttendance.create({
      data: {
        dailyLogId: input.dailyLogId,
        workerId: input.workerId,
        workerName: input.workerName,
        hoursWorked: input.hoursWorked,
        trade: input.trade,
        notes: input.notes,
      },
    });
  }

  async updateCrewAttendance(
    attendanceId: string,
    updates: Partial<CrewAttendanceInput>
  ): Promise<any> {
    return this.prisma.crewAttendance.update({
      where: { id: attendanceId },
      data: updates,
    });
  }

  async deleteCrewAttendance(attendanceId: string): Promise<void> {
    await this.prisma.crewAttendance.delete({
      where: { id: attendanceId },
    });
  }

  // ========================================
  // DELIVERIES
  // ========================================

  async addDelivery(input: DeliveryInput): Promise<any> {
    return this.prisma.delivery.create({
      data: {
        dailyLogId: input.dailyLogId,
        supplier: input.supplier,
        material: input.material,
        quantity: input.quantity,
        poNumber: input.poNumber,
        receivedBy: input.receivedBy,
        notes: input.notes,
      },
    });
  }

  async updateDelivery(
    deliveryId: string,
    updates: Partial<DeliveryInput>
  ): Promise<any> {
    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: updates,
    });
  }

  async deleteDelivery(deliveryId: string): Promise<void> {
    await this.prisma.delivery.delete({
      where: { id: deliveryId },
    });
  }

  // ========================================
  // EQUIPMENT USAGE
  // ========================================

  async addEquipmentUsage(input: EquipmentUsageInput): Promise<any> {
    return this.prisma.equipmentUsage.create({
      data: {
        dailyLogId: input.dailyLogId,
        equipment: input.equipment,
        hours: input.hours,
        operator: input.operator,
        notes: input.notes,
      },
    });
  }

  async updateEquipmentUsage(
    usageId: string,
    updates: Partial<EquipmentUsageInput>
  ): Promise<any> {
    return this.prisma.equipmentUsage.update({
      where: { id: usageId },
      data: updates,
    });
  }

  async deleteEquipmentUsage(usageId: string): Promise<void> {
    await this.prisma.equipmentUsage.delete({
      where: { id: usageId },
    });
  }

  // ========================================
  // SAFETY INCIDENTS
  // ========================================

  async addSafetyIncident(input: SafetyIncidentInput): Promise<any> {
    return this.prisma.safetyIncident.create({
      data: {
        dailyLogId: input.dailyLogId,
        type: input.type,
        severity: input.severity,
        description: input.description,
        personInvolved: input.personInvolved,
        actionTaken: input.actionTaken,
        photos: input.photos || [],
        reportedTo: input.reportedTo,
        followUpRequired: input.followUpRequired ?? false,
      },
    });
  }

  async updateSafetyIncident(
    incidentId: string,
    updates: Partial<SafetyIncidentInput>
  ): Promise<any> {
    return this.prisma.safetyIncident.update({
      where: { id: incidentId },
      data: updates,
    });
  }

  async deleteSafetyIncident(incidentId: string): Promise<void> {
    await this.prisma.safetyIncident.delete({
      where: { id: incidentId },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getProjectActivitySummary(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
    });

    const totalCrewHours = logs.reduce(
      (sum, log) => sum + log.crewPresent.reduce(
        (crewSum, crew) => crewSum + Number(crew.hoursWorked),
        0
      ),
      0
    );

    const totalEquipmentHours = logs.reduce(
      (sum, log) => sum + log.equipmentUsed.reduce(
        (eqSum, eq) => eqSum + Number(eq.hours),
        0
      ),
      0
    );

    const totalDeliveries = logs.reduce(
      (sum, log) => sum + log.deliveries.length,
      0
    );

    const totalIncidents = logs.reduce(
      (sum, log) => sum + log.incidents.length,
      0
    );

    const incidentsByType = logs.flatMap(log => log.incidents).reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const incidentsBySeverity = logs.flatMap(log => log.incidents).reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDays: logs.length,
      totalCrewHours,
      totalEquipmentHours,
      totalDeliveries,
      totalIncidents,
      incidentsByType,
      incidentsBySeverity,
      averageCrewPerDay: logs.length > 0 ? totalCrewHours / logs.length : 0,
    };
  }

  async getCrewProductivity(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        crewPresent: true,
      },
    });

    const crewStats = logs.flatMap(log => log.crewPresent).reduce((acc, crew) => {
      if (!acc[crew.workerName]) {
        acc[crew.workerName] = {
          worker: crew.workerName,
          trade: crew.trade,
          totalHours: 0,
          daysWorked: 0,
        };
      }

      acc[crew.workerName].totalHours += Number(crew.hoursWorked);
      acc[crew.workerName].daysWorked++;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(crewStats)
      .map((stat: any) => ({
        ...stat,
        averageHoursPerDay: stat.totalHours / stat.daysWorked,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  async getSafetyMetrics(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    const incidents = await this.prisma.safetyIncident.findMany({
      where: {
        dailyLog: {
          projectId,
          ...(filters?.startDate || filters?.endDate ? {
            date: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          } : {}),
        },
      },
      include: {
        dailyLog: true,
      },
    });

    const byType = incidents.reduce((acc, incident) => {
      if (!acc[incident.type]) {
        acc[incident.type] = {
          type: incident.type,
          count: 0,
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        };
      }

      acc[incident.type].count++;
      acc[incident.type][incident.severity.toLowerCase()]++;

      return acc;
    }, {} as Record<string, any>);

    const requiresFollowUp = incidents.filter(i => i.followUpRequired).length;

    return {
      totalIncidents: incidents.length,
      requiresFollowUp,
      byType: Object.values(byType),
      recentIncidents: incidents.slice(0, 5),
    };
  }

  async exportDailyLogReport(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<string> {
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        crewPresent: true,
        deliveries: true,
        equipmentUsed: true,
        incidents: true,
      },
      orderBy: { date: 'asc' },
    });

    let csv = 'Date,Weather,Crew Hours,Deliveries,Equipment Hours,Incidents,Work Completed,Notes\n';

    for (const log of logs) {
      const weather = typeof log.weather === 'object' && log.weather !== null
        ? JSON.stringify(log.weather)
        : '';
      const crewHours = log.crewPresent.reduce((sum, crew) => sum + Number(crew.hoursWorked), 0);
      const equipmentHours = log.equipmentUsed.reduce((sum, eq) => sum + Number(eq.hours), 0);

      const row = [
        log.date.toISOString().split('T')[0],
        weather,
        crewHours,
        log.deliveries.length,
        equipmentHours,
        log.incidents.length,
        log.workCompleted || '',
        log.notes || '',
      ];

      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
