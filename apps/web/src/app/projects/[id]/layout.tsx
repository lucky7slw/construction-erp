'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Home,
  FileSpreadsheet,
  Layout,
  Image,
  ShoppingCart,
  Gavel,
  Folder,
  CalendarDays,
  ListChecks,
  LayoutDashboard,
  ClipboardList,
  Clock,
  Receipt,
  ShoppingBag,
  GitBranch,
  CreditCard,
  Wallet,
  TrendingUp,
  Settings,
  Menu,
  X,
  Users,
  MessageSquare,
  FileCheck,
  Camera,
} from 'lucide-react';
import Link from 'next/link';
import { useProject } from '@/lib/query/hooks/use-projects';
import { cn } from '@/lib/utils';
import { ProjectHeaderSkeleton } from '@/components/skeletons/project-header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

type NavSection = {
  title: string;
  items: NavItem[];
};

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isNew?: boolean;
};

const navigationSections: NavSection[] = [
  {
    title: 'Planning',
    items: [
      { title: 'Estimates', href: '/estimates', icon: FileSpreadsheet },
      { title: 'Takeoffs', href: '/takeoffs', icon: Layout },
      { title: '3D Floor Plans', href: '/floor-plans', icon: Layout },
      { title: 'Mood Boards', href: '/mood-boards', icon: Image },
      { title: 'Selection Boards', href: '/selection-boards', icon: ShoppingCart },
      { title: 'Selections Tracker', href: '/selections-tracker', icon: ListChecks, isNew: true },
      { title: 'Bids', href: '/bids', icon: Gavel },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Files & Photos', href: '/files', icon: Folder },
      { title: 'Schedule', href: '/schedule', icon: CalendarDays },

      { title: 'Gantt Chart', href: '/gantt', icon: GitBranch },
      { title: 'Tasks & Checklist', href: '/tasks', icon: ListChecks },
      { title: 'Team', href: '/team', icon: Users },
      { title: 'RFIs', href: '/rfis', icon: MessageSquare },
      { title: 'Submittals', href: '/submittals', icon: FileCheck },
      { title: 'Photos', href: '/photos', icon: Camera },
      { title: 'Client Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
      { title: 'Daily Logs', href: '/daily-logs', icon: ClipboardList },
      { title: 'Time & Expenses', href: '/time-expenses', icon: Clock },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'Invoices', href: '/invoices', icon: Receipt },
      { title: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingBag },
      { title: 'Change Orders', href: '/change-orders', icon: GitBranch },
      { title: 'Retainers & Credits', href: '/retainers-credits', icon: CreditCard },
      { title: 'Budget', href: '/budget', icon: Wallet, isNew: true },
      { title: 'Financial Overview', href: '/financial-overview', icon: TrendingUp },
    ],
  },
];

function ProjectSidebar({ projectId, currentPath, className }: { projectId: string; currentPath: string; className?: string }) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['Planning', 'Management', 'Finance']);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className={cn("w-64 border-r bg-background flex-shrink-0 overflow-y-auto", className || "hidden md:block")}>
      <div className="p-4 space-y-4">
        <Link href={`/projects/${projectId}`} className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
          <Home className="h-4 w-4" />
          <span>Project Home</span>
        </Link>

        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{section.title}</span>
              {expandedSections.includes(section.title) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {expandedSections.includes(section.title) && (
              <div className="ml-2 space-y-1 animate-slide-down">
                {section.items.map((item) => {
                  const fullPath = `/projects/${projectId}${item.href}`;
                  const isActive = currentPath === fullPath;

                  return (
                    <Link
                      key={item.href}
                      href={fullPath}
                      className={cn(
                        'flex items-center space-x-2 px-2 py-1.5 text-sm rounded-md transition-all duration-200 transform hover:translate-x-1',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.isNew && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-yellow-500 text-white">
                          +
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const { data: project, isLoading } = useProject(projectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500 text-white';
      case 'DRAFT': return 'bg-blue-500 text-white';
      case 'ON_HOLD': return 'bg-yellow-500 text-white';
      case 'COMPLETED': return 'bg-gray-500 text-white';
      case 'CANCELLED': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-r bg-background">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-4 space-y-6">
            {[1, 2, 3].map((section) => (
              <div key={section} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-1 ml-4">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 overflow-auto">
          <ProjectHeaderSkeleton />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <Button asChild>
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <ProjectSidebar projectId={projectId} currentPath={pathname} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-background z-50 md:hidden animate-slide-right border-r">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-65px)]">
              <ProjectSidebar projectId={projectId} currentPath={pathname} className="block border-r-0" />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" asChild className="hidden md:flex">
                <Link href="/projects">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] sm:max-w-none">{project.name}</h1>
                <div className="flex items-center space-x-2 md:space-x-4 text-sm text-muted-foreground mt-1">
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  <Link href={`/projects/${projectId}/settings`} className="hidden sm:flex items-center space-x-1 hover:text-foreground">
                    <Settings className="h-3 w-3" />
                    <span>Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
