import type { PrismaClient } from '../generated/prisma';

export class ModuleAccessService {
  constructor(private prisma: PrismaClient) {}

  async setRoleModuleAccess(roleId: string, module: string, isVisible: boolean) {
    return this.prisma.moduleAccess.upsert({
      where: { roleId_module: { roleId, module } },
      create: { roleId, module, isVisible },
      update: { isVisible },
    });
  }

  async setUserModuleAccess(userId: string, module: string, isVisible: boolean) {
    return this.prisma.moduleAccess.upsert({
      where: { userId_module: { userId, module } },
      create: { userId, module, isVisible },
      update: { isVisible },
    });
  }

  async getUserVisibleModules(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { moduleAccess: true } } } },
        moduleAccess: true,
      },
    });

    if (!user) return [];

    // User-specific overrides take precedence
    const userModules = new Map(
      user.moduleAccess.map(m => [m.module, m.isVisible])
    );

    // Role-based access
    const roleModules = new Map<string, boolean>();
    for (const ur of user.roles) {
      for (const ma of ur.role.moduleAccess) {
        if (!roleModules.has(ma.module)) {
          roleModules.set(ma.module, ma.isVisible);
        }
      }
    }

    // Merge: user overrides > role defaults
    const allModules = new Set([...userModules.keys(), ...roleModules.keys()]);
    return Array.from(allModules).filter(module => 
      userModules.get(module) ?? roleModules.get(module) ?? true
    );
  }

  async getRoleModuleAccess(roleId: string) {
    return this.prisma.moduleAccess.findMany({
      where: { roleId },
    });
  }

  async getUserModuleAccess(userId: string) {
    return this.prisma.moduleAccess.findMany({
      where: { userId },
    });
  }
}
