'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Folder, Upload } from 'lucide-react';

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Files & Photos</h2>
          <p className="text-muted-foreground">Manage project files, photos, and documents</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Folder className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No files uploaded yet</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            Upload project files, photos, and documents to keep everything organized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
