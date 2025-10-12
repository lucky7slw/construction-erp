'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdatesPage() {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const checkForUpdates = async () => {
    setChecking(true);
    setStatus('idle');
    setOutput('Checking for updates...');

    try {
      const response = await fetch('/api/check-update');
      const data = await response.json();
      
      setOutput(data.output || 'Check complete');
      setStatus(data.success ? 'success' : 'error');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    } finally {
      setChecking(false);
    }
  };

  const triggerUpdate = async () => {
    if (!confirm('This will restart the service. Are you sure you want to continue?')) {
      return;
    }

    setUpdating(true);
    setStatus('idle');
    setOutput('Starting update...');

    try {
      const response = await fetch('/api/trigger-update', { method: 'POST' });
      const data = await response.json();
      
      setOutput(data.message || 'Update started');
      setStatus('success');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Updates</h1>
        <p className="text-muted-foreground">
          Manage system updates and check for new versions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Manager</CardTitle>
          <CardDescription>
            Check for available updates and install them manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={checkForUpdates}
              disabled={checking || updating}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Check for Updates'}
            </Button>

            <Button
              onClick={triggerUpdate}
              disabled={checking || updating}
            >
              <Download className={`mr-2 h-4 w-4 ${updating ? 'animate-pulse' : ''}`} />
              {updating ? 'Installing...' : 'Install Update Now'}
            </Button>
          </div>

          {output && (
            <div
              className={`rounded-lg border p-4 ${
                status === 'success'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                  : status === 'error'
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                )}
                {status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <pre className="flex-1 whitespace-pre-wrap font-mono text-sm">
                  {output}
                </pre>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Automatic Updates
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              The system automatically checks for updates at 3:00 AM daily. Updates will be
              downloaded and installed automatically, and services will be restarted as needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
