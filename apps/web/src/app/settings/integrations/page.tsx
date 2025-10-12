'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load integrations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/google/auth', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to connect Google', variant: 'destructive' });
    }
  };

  const connectQuickBooks = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/quickbooks/auth', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to connect QuickBooks', variant: 'destructive' });
    }
  };

  const disconnect = async (provider: string) => {
    try {
      await fetch(`http://localhost:3001/api/v1/integrations/${provider.toLowerCase()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast({ title: 'Success', description: `${provider} disconnected` });
      fetchIntegrations();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const isConnected = (provider: string) => 
    integrations.some(i => i.provider === provider && i.isActive);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your favorite tools</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Google Workspace
              {isConnected('GOOGLE') && <Badge>Connected</Badge>}
            </CardTitle>
            <CardDescription>
              Sync calendar events, upload files to Drive, and send emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected('GOOGLE') ? (
              <Button variant="outline" onClick={() => disconnect('GOOGLE')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={connectGoogle}>Connect Google</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              QuickBooks
              {isConnected('QUICKBOOKS') && <Badge>Connected</Badge>}
            </CardTitle>
            <CardDescription>
              Sync customers, invoices, and expenses with QuickBooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected('QUICKBOOKS') ? (
              <Button variant="outline" onClick={() => disconnect('QUICKBOOKS')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={connectQuickBooks}>Connect QuickBooks</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
