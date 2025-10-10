'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Share2 } from 'lucide-react';

export default function ClientDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Client Dashboard</h2>
          <p className="text-muted-foreground">Share project updates with your client</p>
        </div>
        <Button>
          <Share2 className="mr-2 h-4 w-4" />
          Share Dashboard
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <LayoutDashboard className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Client dashboard not configured</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            Set up a client dashboard to share project progress and updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
