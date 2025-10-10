'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2 } from 'lucide-react';

export default function CompaniesPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage company profiles and multi-tenant settings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Company management coming soon</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            Manage multiple companies and switch between different organizational contexts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}