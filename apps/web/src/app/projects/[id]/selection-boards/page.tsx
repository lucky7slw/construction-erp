'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart } from 'lucide-react';

export default function SelectionBoardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Selection Boards</h2>
          <p className="text-muted-foreground">Manage material and finish selections</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Selection Board
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShoppingCart className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No selection boards yet</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            Create selection boards to organize material and finish choices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
