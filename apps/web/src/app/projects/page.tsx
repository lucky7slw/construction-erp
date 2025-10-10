'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted"></CardHeader>
              <CardContent className="h-40 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-destructive">
              Error loading projects: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'DRAFT':
        return 'bg-blue-500';
      case 'ON_HOLD':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-gray-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your construction projects and track progress.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Get started by creating your first construction project.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(project.status)} text-white`}
                    >
                      {formatStatus(project.status)}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {project.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.startDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      {new Date(project.startDate).toLocaleDateString()}
                      {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                    </div>
                  )}
                  {project.budget && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Budget: {formatCurrency(project.budget)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}