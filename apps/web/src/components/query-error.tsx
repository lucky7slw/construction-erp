import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function QueryError({
  error,
  onRetry,
  title = 'Failed to load data',
  description = 'An error occurred while fetching the data',
}: QueryErrorProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              {error.message || 'Unknown error occurred'}
            </p>
          </div>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
