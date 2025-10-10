import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ProjectHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Skeleton className="h-6 w-[250px]" />
            <div className="flex items-center space-x-4 mt-2">
              <Skeleton className="h-5 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
