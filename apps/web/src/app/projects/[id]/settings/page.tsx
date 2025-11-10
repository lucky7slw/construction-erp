'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, Users, DollarSign, Bell, Workflow, Link2, Plus, Archive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Project settings have been updated successfully.',
      variant: 'success',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
          <p className="text-muted-foreground">
            Configure project-specific settings, permissions, and automation
          </p>
        </div>
        <Button onClick={handleSave} variant="construction">
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Fields
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Basic project details and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" placeholder="Enter project name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-type">Project Type</Label>
                <Select>
                  <SelectTrigger id="project-type">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-construction">New Construction</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="flip-house">Flip House</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  placeholder="Detailed project description"
                  rows={4}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Status Workflow</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-status-changes">Allow team members to change status</Label>
                    <Switch id="allow-status-changes" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-approval">Require approval for status changes</Label>
                    <Switch id="require-approval" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Visibility</CardTitle>
              <CardDescription>
                Control who can see this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility Level</Label>
                <Select defaultValue="private">
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private - Team only</SelectItem>
                    <SelectItem value="company">Company - All company members</SelectItem>
                    <SelectItem value="client">Client - Include client access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Client Portal Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow clients to view project status and documents
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team & Access */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Permissions</CardTitle>
              <CardDescription>
                Manage who can access and modify this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Project Manager</p>
                      <Badge>Full Access</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can view, edit, delete all project data
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Team Member</p>
                      <Badge variant="secondary">Edit Access</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can view and edit tasks, expenses, time entries
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Viewer</p>
                      <Badge variant="outline">Read Only</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can only view project information
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Custom Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Allow task reassignment</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow budget viewing</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow document deletion</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow team member invitation</Label>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget & Finance */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Alerts</CardTitle>
              <CardDescription>
                Get notified when spending reaches certain thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable budget alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when budget thresholds are reached
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Alert Thresholds</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Warning (80%)</Label>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Enabled</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Critical (90%)</Label>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Enabled</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Exceeded (100%)</Label>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="alert-recipients">Alert Recipients</Label>
                <Input
                  id="alert-recipients"
                  placeholder="email@example.com, email2@example.com"
                  defaultValue=""
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated email addresses
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
              <CardDescription>
                Configure billing and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Default Payment Terms</Label>
                <Select>
                  <SelectTrigger id="payment-terms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net-15">Net 15</SelectItem>
                    <SelectItem value="net-30">Net 30</SelectItem>
                    <SelectItem value="net-60">Net 60</SelectItem>
                    <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                <Input id="tax-rate" type="number" placeholder="0.00" step="0.01" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-generate invoices</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create invoices based on milestones
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Codes</CardTitle>
              <CardDescription>
                Customize expense categories for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Cost Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure which events trigger email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      When a task is assigned to you
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task due soon</Label>
                    <p className="text-sm text-muted-foreground">
                      24 hours before task deadline
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task overdue</Label>
                    <p className="text-sm text-muted-foreground">
                      When task passes deadline
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Expense submitted</Label>
                    <p className="text-sm text-muted-foreground">
                      When team member submits expense
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Budget threshold notifications
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project status changes</Label>
                    <p className="text-sm text-muted-foreground">
                      When project status is updated
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New documents uploaded</Label>
                    <p className="text-sm text-muted-foreground">
                      When files are added to project
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Team member added</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone joins the project
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Digest</CardTitle>
              <CardDescription>
                Receive a daily summary of project activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable daily digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive one email per day with all updates
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-time">Delivery Time</Label>
                <Select>
                  <SelectTrigger id="digest-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8am">8:00 AM</SelectItem>
                    <SelectItem value="9am">9:00 AM</SelectItem>
                    <SelectItem value="12pm">12:00 PM</SelectItem>
                    <SelectItem value="5pm">5:00 PM</SelectItem>
                    <SelectItem value="6pm">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Automation */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Assignment Rules</CardTitle>
              <CardDescription>
                Automatically assign tasks based on criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable auto-assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    Assign tasks based on workload and skills
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment Rule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Workflows</CardTitle>
              <CardDescription>
                Define approval processes for expenses, change orders, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require expense approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Expenses must be approved before processing
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-approver">Expense Approver</Label>
                  <Select>
                    <SelectTrigger id="expense-approver">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pm">Project Manager</SelectItem>
                      <SelectItem value="owner">Project Owner</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require change order approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Change orders need approval before execution
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="co-threshold">Auto-approve under ($)</Label>
                  <Input id="co-threshold" type="number" placeholder="0.00" />
                  <p className="text-sm text-muted-foreground">
                    Change orders under this amount are auto-approved
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring Tasks</CardTitle>
              <CardDescription>
                Set up templates for regularly scheduled tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create Recurring Task Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QuickBooks Integration</CardTitle>
              <CardDescription>
                Sync expenses and invoices with QuickBooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sync with QuickBooks</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync financial data
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qb-project">QuickBooks Project/Job</Label>
                <Input id="qb-project" placeholder="Select or enter project name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qb-customer">QuickBooks Customer</Label>
                <Input id="qb-customer" placeholder="Select or enter customer" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Drive Integration</CardTitle>
              <CardDescription>
                Connect project to Google Drive folder for automatic backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-backup to Google Drive</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync documents to Drive
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drive-folder">Drive Folder Path</Label>
                <Input id="drive-folder" placeholder="/Projects/House Flip 2024" />
                <Button variant="outline" size="sm">Browse Google Drive</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Send project events to external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Fields */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Project Fields</CardTitle>
              <CardDescription>
                Add custom data fields specific to this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Field
              </Button>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No custom fields created yet. Custom fields allow you to track
                  additional information specific to your project needs.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Expense Categories</CardTitle>
              <CardDescription>
                Define project-specific expense categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense Category
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive & Data */}
        <TabsContent value="archive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Archive Rules</CardTitle>
              <CardDescription>
                Automatically archive old documents and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable auto-archiving</Label>
                  <p className="text-sm text-muted-foreground">
                    Archive completed tasks and old documents
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="archive-after">Archive completed tasks after</Label>
                <Select>
                  <SelectTrigger id="archive-after">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>
                Configure how long to keep project data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention-period">Retention Period</Label>
                <Select>
                  <SelectTrigger id="retention-period">
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1year">1 year</SelectItem>
                    <SelectItem value="3years">3 years</SelectItem>
                    <SelectItem value="7years">7 years (IRS requirement)</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Delete data after retention period</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove data after retention period expires
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>
                Export all project data for backup or migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Export Project Data (CSV)
              </Button>
              <Button variant="outline" className="w-full">
                Export Project Data (JSON)
              </Button>
              <Button variant="outline" className="w-full">
                Export All Documents (ZIP)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  Archive This Project
                </Button>
                <p className="text-sm text-muted-foreground">
                  Project will be hidden from active lists but data is preserved
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="destructive" className="w-full">
                  Delete This Project
                </Button>
                <p className="text-sm text-destructive">
                  ⚠️ This action cannot be undone. All project data will be permanently deleted.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
