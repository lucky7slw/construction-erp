'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Layout } from 'lucide-react';

export default function FloorPlansPage() {
  const rooms = ['Kitchen', 'Living Room', 'Dining Room', 'Main Bedroom', 'Bathroom'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">3D Floor Plans</h2>
          <p className="text-muted-foreground">View and manage 3D floor plans for each room</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Floor Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layout className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">{room}</h3>
              <Badge variant="outline" className="mt-2">View Plan</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
