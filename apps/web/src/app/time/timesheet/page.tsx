'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTimeEntries } from '@/lib/query/hooks/use-time-entries';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';

export default function TimesheetPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<'week' | 'day'>('week');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday

  const { data: timeEntries, isLoading } = useTimeEntries({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getEntriesForDay = (day: Date) => {
    return timeEntries?.filter((entry: any) =>
      isSameDay(new Date(entry.date), day)
    ) || [];
  };

  const getDayTotal = (day: Date) => {
    const entries = getEntriesForDay(day);
    return entries.reduce((sum: number, entry: any) => sum + Number(entry.hours), 0);
  };

  const getWeekTotal = () => {
    return timeEntries?.reduce((sum: number, entry: any) => sum + Number(entry.hours), 0) || 0;
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading timesheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/time">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timesheet</h1>
            <p className="text-muted-foreground">
              View your time entries by week or day
            </p>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold min-w-64 text-center">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                <Calendar className="mr-2 h-4 w-4" />
                Today
              </Button>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{formatDuration(getWeekTotal())}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Week/Day View */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'day')}>
        <TabsList>
          <TabsTrigger value="week">Week View</TabsTrigger>
          <TabsTrigger value="day">Day View</TabsTrigger>
        </TabsList>

        {/* Week View */}
        <TabsContent value="week" className="space-y-4">
          {daysInWeek.map((day) => {
            const entries = getEntriesForDay(day);
            const dayTotal = getDayTotal(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={day.toISOString()} className={isToday ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {format(day, 'EEEE, MMM d')}
                      {isToday && (
                        <Badge variant="secondary" className="ml-2">Today</Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm font-semibold">
                      {formatDuration(dayTotal)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries for this day</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry: any) => (
                        <Link
                          key={entry.id}
                          href={`/time/${entry.id}`}
                          className="block p-3 rounded-md border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              {entry.project && (
                                <p className="text-sm font-medium">{entry.project.name}</p>
                              )}
                              {entry.task && (
                                <p className="text-sm text-muted-foreground">{entry.task.title}</p>
                              )}
                              {entry.description && (
                                <p className="text-xs text-muted-foreground">{entry.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{formatDuration(Number(entry.hours))}</div>
                              <Badge variant="secondary" className="text-xs">
                                {entry.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Day View */}
        <TabsContent value="day" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{format(currentDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-semibold">Total for day:</span>
                  <span className="text-xl font-bold">{formatDuration(getDayTotal(currentDate))}</span>
                </div>

                {getEntriesForDay(currentDate).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No entries for this day</p>
                    <Button className="mt-4" asChild>
                      <Link href="/time/new">Add Entry</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getEntriesForDay(currentDate).map((entry: any) => (
                      <Link
                        key={entry.id}
                        href={`/time/${entry.id}`}
                        className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            {entry.project && (
                              <p className="font-medium">{entry.project.name}</p>
                            )}
                            {entry.task && (
                              <p className="text-sm text-muted-foreground">{entry.task.title}</p>
                            )}
                            {entry.description && (
                              <p className="text-sm text-muted-foreground">{entry.description}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{entry.status}</Badge>
                              {entry.user && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.user.firstName} {entry.user.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{formatDuration(Number(entry.hours))}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
