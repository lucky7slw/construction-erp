import type { PrismaClient } from '../../generated/prisma';
import { GoogleIntegrationService } from '../integrations/google.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class BackupSyncService {
  constructor(private prisma: PrismaClient) {}

  async runAutomatedBackup(userId: string) {
    const googleService = new GoogleIntegrationService(this.prisma);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hhhomespm-backup-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    try {
      await execAsync(`pg_dump ${process.env.DATABASE_URL} > ${filepath}`);
      const buffer = await readFile(filepath);
      await googleService.uploadToDrive(userId, {
        name: filename,
        mimeType: 'application/sql',
        data: buffer,
      });
      await unlink(filepath);

      console.log(`✓ Backup uploaded: ${filename}`);
      return { success: true, filename };
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  async syncCalendarEvents(userId: string) {
    const googleService = new GoogleIntegrationService(this.prisma);
    
    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        project: true,
        assignedTo: true,
      },
      take: 50,
    });

    const synced = [];
    for (const task of tasks) {
      try {
        await googleService.createCalendarEvent(userId, {
          summary: `${task.title} - ${task.project.name}`,
          description: `Priority: ${task.priority}\nAssigned: ${task.assignedTo?.name || 'Unassigned'}`,
          start: task.dueDate.toISOString(),
          end: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
        });
        synced.push(task.id);
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
      }
    }

    console.log(`✓ Synced ${synced.length} tasks to calendar`);
    return { synced: synced.length };
  }

  async runScheduledTasks() {
    const integrations = await this.prisma.integration.findMany({
      where: { provider: 'GOOGLE', isActive: true },
    });

    for (const integration of integrations) {
      try {
        await this.runAutomatedBackup(integration.userId);
        await this.syncCalendarEvents(integration.userId);
      } catch (error) {
        console.error(`Automation failed for user ${integration.userId}:`, error);
      }
    }
  }
}
