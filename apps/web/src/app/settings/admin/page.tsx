'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/store/auth-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  createdAt: string;
  ipAddress?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logins, setLogins] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: 'ALL', resource: '', userId: '' });
  const { toast } = useToast();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    if (!accessToken) return;
    
    try {
      const params = new URLSearchParams();
      if (filter.action && filter.action !== 'ALL') params.append('action', filter.action);
      if (filter.resource) params.append('resource', filter.resource);
      if (filter.userId) params.append('userId', filter.userId);

      const [logsRes, loginsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/audit-logs?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch('http://localhost:3001/api/v1/audit-logs/logins', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (!logsRes.ok || !loginsRes.ok) throw new Error('Failed to fetch');

      const logsData = await logsRes.json();
      const loginsData = await loginsRes.json();

      setLogs(logsData.logs || []);
      setLogins(loginsData || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500';
      case 'UPDATE': return 'bg-blue-500';
      case 'DELETE': return 'bg-red-500';
      case 'LOGIN': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor user activity and system usage</p>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">All Activity</TabsTrigger>
          <TabsTrigger value="logins">Login History</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="modules">Module Access</TabsTrigger>
          <TabsTrigger value="updates">System Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Filters</CardTitle>
              <CardDescription>Filter audit logs by action, resource, or user</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Select value={filter.action} onValueChange={(v) => setFilter({ ...filter, action: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Resource (e.g., projects)"
                value={filter.resource}
                onChange={(e) => setFilter({ ...filter, resource: e.target.value })}
                className="w-[200px]"
              />

              <Input
                placeholder="User ID"
                value={filter.userId}
                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                className="w-[200px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>{logs.length} events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                      <div>
                        <p className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.action} {log.resource} {log.resourceId && `#${log.resourceId.slice(0, 8)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                      {log.ipAddress && <p className="text-xs">{log.ipAddress}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>Recent user logins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logins.map((login) => (
                  <div key={login.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-500">LOGIN</Badge>
                      <div>
                        <p className="font-medium">
                          {login.user.firstName} {login.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{login.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatDistanceToNow(new Date(login.createdAt), { addSuffix: true })}</p>
                      {login.ipAddress && <p className="text-xs">{login.ipAddress}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Coming soon - detailed user activity tracking</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <ModuleAccessManager accessToken={accessToken} />
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <UpdateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MODULES = [
  { id: 'projects', name: 'Projects' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'estimates', name: 'Estimates' },
  { id: 'quotes', name: 'Quotes' },
  { id: 'invoices', name: 'Invoices' },
  { id: 'expenses', name: 'Expenses' },
  { id: 'customers', name: 'Customers' },
  { id: 'suppliers', name: 'Suppliers' },
  { id: 'leads', name: 'Leads' },
  { id: 'bids', name: 'Bids' },
  { id: 'selections', name: 'Selections' },
  { id: 'rfis', name: 'RFIs' },
  { id: 'submittals', name: 'Submittals' },
  { id: 'daily_logs', name: 'Daily Logs' },
  { id: 'change_orders', name: 'Change Orders' },
  { id: 'purchase_orders', name: 'Purchase Orders' },
  { id: 'time_entries', name: 'Time Entries' },
  { id: 'payments', name: 'Payments' },
];

function ModuleAccessManager({ accessToken }: { accessToken: string | null }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  console.log('ModuleAccessManager rendered, accessToken:', !!accessToken, 'user:', !!user);

  useEffect(() => {
    console.log('useEffect triggered for fetchRoles');
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) fetchRoleAccess();
  }, [selectedRole]);

  const fetchRoles = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('http://localhost:3001/api/v1/module-access/roles', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('Roles fetched:', data);
      
      // If no roles from API, use user's current roles as fallback
      if (!data || data.length === 0) {
        const userRoles = user?.roles?.map(r => ({ id: r.id, name: r.name })) || [];
        setRoles(userRoles);
      } else {
        setRoles(data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      // Fallback to user's roles
      const userRoles = user?.roles?.map(r => ({ id: r.id, name: r.name })) || [];
      setRoles(userRoles);
      if (userRoles.length === 0) {
        toast({ title: 'Failed to load roles', variant: 'destructive' });
      }
    }
  };

  const fetchRoleAccess = async () => {
    if (!accessToken || !selectedRole) return;
    const res = await fetch(`http://localhost:3001/api/v1/module-access/role/${selectedRole}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    const access: Record<string, boolean> = {};
    data.forEach((m: any) => (access[m.module] = m.isVisible));
    setModuleAccess(access);
  };

  const toggleModule = async (module: string, isVisible: boolean) => {
    if (!accessToken || !selectedRole) return;
    
    try {
      await fetch(`http://localhost:3001/api/v1/module-access/role/${selectedRole}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module, isVisible }),
      });

      setModuleAccess(prev => ({ ...prev, [module]: isVisible }));
      toast({ title: 'Module access updated' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Access Control</CardTitle>
        <CardDescription>Control which modules are visible to each role</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.name.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedRole && (
          <div className="space-y-2">
            {MODULES.map(module => (
              <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{module.name}</span>
                <Switch
                  checked={moduleAccess[module.id] ?? true}
                  onCheckedChange={(checked) => toggleModule(module.id, checked)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpdateManager() {
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
    <Card>
      <CardHeader>
        <CardTitle>System Updates</CardTitle>
        <CardDescription>Check for and install system updates</CardDescription>
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
  );
}
