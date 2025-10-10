'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Plus,
  Calendar,
  User,
  FolderOpen,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useTimeEntries } from '@/lib/query/hooks/use-time-entries';
import { formatDistanceToNow, format } from 'date-fns';
import { TimeTracker } from '@/components/time/time-tracker';

export default function TimePage() {
  const { data: timeEntries, isLoading } = useTimeEntries();

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading time entries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground">
            Track and manage time entries for your projects
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/time/new">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* Time Tracker */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TimeTracker />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(
                timeEntries
                  ?.filter((entry: any) => {
                    const entryDate = new Date(entry.date);
                    const today = new Date();
                    return (
                      entryDate.getDate() === today.getDate() &&
                      entryDate.getMonth() === today.getMonth() &&
                      entryDate.getFullYear() === today.getFullYear()
                    );
                  })
                  .reduce((sum: number, entry: any) => sum + Number(entry.hours), 0) || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(
                timeEntries?.reduce((sum: number, entry: any) => sum + Number(entry.hours), 0) || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntries?.filter((entry: any) => entry.status === 'PENDING').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntries?.filter((entry: any) => entry.status === 'APPROVED').length || 0}
            </div>
          </CardContent>
        </Card>
          </div>

          {/* Time Entries List */}
          {!timeEntries || timeEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No time entries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking your time by creating a new entry
            </p>
            <Button asChild>
              <Link href="/time/new">
                <Plus className="mr-2 h-4 w-4" />
                Create First Entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeEntries.map((entry: any) => (
                <Link
                  key={entry.id}
                  href={`/time/${entry.id}`}
                  className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(entry.status)}
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(entry.date), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {entry.project && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <FolderOpen className="mr-2 h-4 w-4" />
                          {entry.project.name}
                        </div>
                      )}

                      {entry.task && (
                        <p className="text-sm">{entry.task.title}</p>
                      )}

                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}

                      {entry.user && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="mr-2 h-4 w-4" />
                          {entry.user.firstName} {entry.user.lastName}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatDuration(Number(entry.hours))}</div>
                      {entry.createdAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
          )}
        </div>
      </div>
    </div>
  );
}