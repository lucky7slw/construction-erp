import type { PrismaClient } from '../generated/prisma';
import { BackupSyncService } from '../services/automation/backup-sync.service';

export function startScheduler(prisma: PrismaClient) {
  const backupSync = new BackupSyncService(prisma);

  // Run daily at 2 AM
  const runDaily = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    
    const timeout = next.getTime() - now.getTime();
    setTimeout(() => {
      backupSync.runScheduledTasks();
      setInterval(() => backupSync.runScheduledTasks(), 24 * 60 * 60 * 1000);
    }, timeout);
  };

  runDaily();
  console.log('✓ Scheduler started - Daily backup & sync at 2 AM');
}
