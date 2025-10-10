import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[150px] mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[120px]" />
        <Skeleton className="h-3 w-[80px] mt-1" />
      </CardContent>
    </Card>
  );
}
