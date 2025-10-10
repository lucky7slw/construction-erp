'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard } from 'lucide-react';

export default function RetainersCreditsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retainers & Credits</h2>
          <p className="text-muted-foreground">Manage client retainers and credits</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No retainers</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Track client retainer payments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No credits</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Manage client credits and refunds.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
