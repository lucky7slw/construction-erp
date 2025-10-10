'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FolderOpen,
  Users,
  Clock,
  Settings,
  Building2,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Folder,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/store/auth-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    title: 'Estimates',
    href: '/estimates',
    icon: FileText,
  },
  {
    title: 'Team',
    href: '/team',
    icon: Users,
  },
  {
    title: 'Time Tracking',
    href: '/time',
    icon: Clock,
  },
  {
    title: 'CRM',
    href: '/crm',
    icon: UserPlus,
  },
  {
    title: 'Companies',
    href: '/companies',
    icon: Building2,
    roles: ['super_admin', 'SUPER_ADMIN', 'ADMIN', 'admin'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: Folder,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onClose: () => void;
}

export function Sidebar({ open, collapsed, onCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter nav items based on user roles
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user?.roles) return false;
    return item.roles.some((roleName) =>
      user.roles.some((userRole) => userRole.name === roleName)
    );
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden lg:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          {/* Logo and collapse button */}
          <div className={cn(
            'flex items-center justify-between border-b px-4',
            collapsed ? 'h-16 px-3' : 'h-16 px-4'
          )}>
            {!collapsed && (
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-construction-500" />
                <span className="text-xl font-bold text-foreground">
                  HHHomes
                </span>
              </div>
            )}
            {collapsed && (
              <Building2 className="h-8 w-8 text-construction-500 mx-auto" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapse(!collapsed)}
              className={cn(
                'h-8 w-8',
                collapsed && 'hidden'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-construction-100 text-construction-900 dark:bg-construction-900 dark:text-construction-100'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    item.disabled && 'pointer-events-none opacity-50',
                    collapsed && 'justify-center px-3'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive && 'text-construction-600 dark:text-construction-400',
                      !collapsed && 'mr-3'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto inline-block rounded-full bg-construction-100 px-2 py-0.5 text-xs font-medium text-construction-800 dark:bg-construction-800 dark:text-construction-200">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCollapse(false)}
                className="w-full"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Expand sidebar</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          {/* Logo and close button */}
          <div className="flex items-center justify-between border-b px-4 h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-construction-500" />
              <span className="text-xl font-bold text-foreground">
                HHHomes
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-construction-100 text-construction-900 dark:bg-construction-900 dark:text-construction-100'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    item.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  <Icon
                    className={cn(
                      'mr-3 h-5 w-5 shrink-0',
                      isActive && 'text-construction-600 dark:text-construction-400'
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto inline-block rounded-full bg-construction-100 px-2 py-0.5 text-xs font-medium text-construction-800 dark:bg-construction-800 dark:text-construction-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}