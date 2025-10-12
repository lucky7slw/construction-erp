'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Building2,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Key,
  Mail,
  Phone,
  MapPin,
  Plug,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth, useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/components/ui/toast';
import { useUpdateProfile, useChangePassword, useUpdateCompany } from '@/lib/query/hooks/use-settings';
import { useTheme as useNextTheme } from 'next-themes';
import { useTheme } from '@/lib/theme-provider';
import { Badge } from '@/components/ui/badge';

// Integrations Component
function IntegrationsContent() {
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [syncing, setSyncing] = React.useState(false);
  const { toast } = useToast();
  const accessToken = useAuthStore((state) => state.accessToken);

  React.useEffect(() => {
    if (accessToken) fetchIntegrations();
  }, [accessToken]);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load integrations');
    }
  };

  const connectGoogle = async () => {
    if (!accessToken) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/google/auth', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authUrl in response');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast({ title: 'Error', description: 'Failed to connect Google', variant: 'destructive' });
    }
  };

  const connectQuickBooks = async () => {
    if (!accessToken) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/v1/integrations/quickbooks/auth', {
        headers: { Authorization: `Bearer ${accessToken}` },
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
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast({ title: 'Success', description: `${provider} disconnected` });
      fetchIntegrations();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const runBackup = async () => {
    setSyncing(true);
    try {
      await fetch('http://localhost:3001/api/v1/automation/backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast({ title: 'Success', description: 'Backup uploaded to Google Drive' });
    } catch (error) {
      toast({ title: 'Error', description: 'Backup failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('http://localhost:3001/api/v1/automation/sync-calendar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      toast({ title: 'Success', description: `Synced ${data.synced} tasks to calendar` });
    } catch (error) {
      toast({ title: 'Error', description: 'Calendar sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = (provider: string) =>
    integrations.some(i => i.provider === provider && i.isActive);

  return (
    <div className="space-y-6">
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
          <CardContent className="space-y-2">
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

      {isConnected('GOOGLE') && (
        <>
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Automation & Sync</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Database Backup</CardTitle>
                <CardDescription>
                  Backup your database to Google Drive. Runs automatically daily at 2 AM.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runBackup} disabled={syncing}>
                  {syncing ? 'Backing up...' : 'Run Backup Now'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Calendar Sync</CardTitle>
                <CardDescription>
                  Sync upcoming tasks to Google Calendar. Runs automatically daily at 2 AM.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={syncCalendar} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync Calendar Now'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Profile Form Schema
const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Company Form Schema
const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

// Password Form Schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useNextTheme();
  const { branding, updateBranding } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);

  // Mutations
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateCompany = useUpdateCompany();

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [projectUpdates, setProjectUpdates] = React.useState(true);
  const [timeEntryReminders, setTimeEntryReminders] = React.useState(true);
  const [estimateApprovals, setEstimateApprovals] = React.useState(true);
  const [weeklyReports, setWeeklyReports] = React.useState(false);

  // Theme and view preferences
  const [compactView, setCompactView] = React.useState(false);

  // Logo upload state
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingFavicon, setUploadingFavicon] = React.useState(false);

  // Branding customization - using theme context
  const primaryColor = branding.primaryColor;
  const secondaryColor = branding.secondaryColor;
  const accentColor = branding.accentColor;
  const headingFont = branding.headingFont;
  const bodyFont = branding.bodyFont;

  const setPrimaryColor = (color: string) => {
    updateBranding({ ...branding, primaryColor: color });
  };

  const setSecondaryColor = (color: string) => {
    updateBranding({ ...branding, secondaryColor: color });
  };

  const setAccentColor = (color: string) => {
    updateBranding({ ...branding, accentColor: color });
  };

  const setHeadingFont = (font: string) => {
    updateBranding({ ...branding, headingFont: font });
  };

  const setBodyFont = (font: string) => {
    updateBranding({ ...branding, bodyFont: font });
  };

  // Profile Form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Company Form
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: user?.companies?.[0]?.name || '',
      address: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  // Password Form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
      });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  };

  const onCompanySubmit = async (values: CompanyFormValues) => {
    try {
      const companyId = user?.companies?.[0]?.id;
      if (!companyId) {
        throw new Error('No company found');
      }
      await updateCompany.mutateAsync({
        id: companyId,
        data: {
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          website: values.website,
        },
      });
      toast({
        title: 'Success',
        description: 'Company settings updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update company',
      });
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
      passwordForm.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
      });
    }
  };

  const handleNotificationSave = () => {
    // TODO: Save notification preferences to backend
    toast({
      title: 'Success',
      description: 'Notification preferences saved',
    });
  };

  const handleAppearanceSave = () => {
    // Dark mode is automatically saved via next-themes
    // Only compact view needs to be saved to backend
    // TODO: Save compact view preference to backend
    toast({
      title: 'Success',
      description: 'Appearance preferences saved',
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an image file',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'File size must be less than 5MB',
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const companyId = user?.companies?.[0]?.id;
      const response = await fetch(`http://localhost:3001/api/v1/companies/${companyId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setLogoPreview(data.url);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload logo',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an image file',
      });
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Favicon size must be less than 1MB',
      });
      return;
    }

    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'favicon');

      const companyId = user?.companies?.[0]?.id;
      const response = await fetch(`http://localhost:3001/api/v1/companies/${companyId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFaviconPreview(data.url);
      
      toast({
        title: 'Success',
        description: 'Favicon uploaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload favicon',
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleBrandingSave = () => {
    // Branding is already saved via updateBranding calls
    // This just shows a confirmation toast
    toast({
      title: 'Success',
      description: 'Branding settings are applied and saved',
    });
  };

  // Force rebuild
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, preferences, and system configuration
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register('firstName')}
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...profileForm.register('lastName')}
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register('email')}
                      disabled
                    />
                  </div>
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...profileForm.register('phoneNumber')}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Manage your company profile and business details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      {...companyForm.register('name')}
                    />
                  </div>
                  {companyForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {companyForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Company Branding Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="branding" className="border-none">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline flex-row-reverse justify-end gap-2">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Company Branding & Customization
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Customize your company's visual identity including logo, favicon, colors, and fonts
                      </p>

                      {/* Logo and Favicon */}
                      <div className="grid grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <Label>Company Logo</Label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:border-primary transition-colors">
                        {logoPreview || user?.companies?.[0]?.logo ? (
                          <div className="space-y-4 text-center">
                            <img
                              src={logoPreview || user?.companies?.[0]?.logo || ''}
                              alt="Company Logo"
                              className="h-24 w-auto object-contain mx-auto"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Upload Logo</p>
                              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              disabled={uploadingLogo}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {uploadingLogo ? 'Uploading...' : 'Choose File'}
                            </Button>
                          </div>
                        )}
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    </div>

                    {/* Favicon Upload */}
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:border-primary transition-colors">
                        {faviconPreview ? (
                          <div className="space-y-4 text-center">
                            <img
                              src={faviconPreview}
                              alt="Favicon"
                              className="h-16 w-16 object-contain mx-auto"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('favicon-upload')?.click()}
                              disabled={uploadingFavicon}
                            >
                              {uploadingFavicon ? 'Uploading...' : 'Change Favicon'}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Upload Favicon</p>
                              <p className="text-xs text-muted-foreground">ICO, PNG 32x32 up to 1MB</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('favicon-upload')?.click()}
                              disabled={uploadingFavicon}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {uploadingFavicon ? 'Uploading...' : 'Choose File'}
                            </Button>
                          </div>
                        )}
                        <input
                          id="favicon-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFaviconUpload}
                        />
                      </div>
                    </div>
                  </div>

                      <Separator />

                      {/* Brand Colors */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Brand Colors</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Customize your company's color scheme
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="primaryColor">Primary Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="primaryColor"
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-10 w-20"
                              />
                              <Input
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="flex-1"
                                placeholder="#f97316"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="secondaryColor"
                                type="color"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="h-10 w-20"
                              />
                              <Input
                                type="text"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="flex-1"
                                placeholder="#0ea5e9"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accentColor">Accent Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="accentColor"
                                type="color"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="h-10 w-20"
                              />
                              <Input
                                type="text"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="flex-1"
                                placeholder="#10b981"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Typography */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Typography</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Choose fonts for your company branding
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="headingFont">Heading Font</Label>
                            <select
                              id="headingFont"
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              value={headingFont}
                              onChange={(e) => setHeadingFont(e.target.value)}
                            >
                              <option value="inter">Inter</option>
                              <option value="roboto">Roboto</option>
                              <option value="opensans">Open Sans</option>
                              <option value="lato">Lato</option>
                              <option value="montserrat">Montserrat</option>
                              <option value="poppins">Poppins</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bodyFont">Body Font</Label>
                            <select
                              id="bodyFont"
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              value={bodyFont}
                              onChange={(e) => setBodyFont(e.target.value)}
                            >
                              <option value="inter">Inter</option>
                              <option value="roboto">Roboto</option>
                              <option value="opensans">Open Sans</option>
                              <option value="lato">Lato</option>
                              <option value="montserrat">Montserrat</option>
                              <option value="poppins">Poppins</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Preview</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            See how your colors look
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <div 
                              className="h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              Primary
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div 
                              className="h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: secondaryColor }}
                            >
                              Secondary
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div 
                              className="h-20 rounded-lg flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: accentColor }}
                            >
                              Accent
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={handleBrandingSave}>
                          <Save className="mr-2 h-4 w-4" />
                          Save Branding
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyAddress"
                      placeholder="123 Main St, City, State, ZIP"
                      {...companyForm.register('address')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone</Label>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...companyForm.register('phone')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyEmail"
                        type="email"
                        placeholder="info@company.com"
                        {...companyForm.register('email')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.company.com"
                    {...companyForm.register('website')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="project-updates">Project Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when projects are updated or completed
                  </p>
                </div>
                <Switch
                  id="project-updates"
                  checked={projectUpdates}
                  onCheckedChange={setProjectUpdates}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="time-reminders">Time Entry Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily reminders to log your time entries
                  </p>
                </div>
                <Switch
                  id="time-reminders"
                  checked={timeEntryReminders}
                  onCheckedChange={setTimeEntryReminders}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="estimate-approvals">Estimate Approvals</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications for estimates requiring your approval
                  </p>
                </div>
                <Switch
                  id="estimate-approvals"
                  checked={estimateApprovals}
                  onCheckedChange={setEstimateApprovals}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly summary reports via email
                  </p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotificationSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type="password"
                      {...passwordForm.register('currentPassword')}
                    />
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      {...passwordForm.register('newPassword')}
                    />
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...passwordForm.register('confirmPassword')}
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Not enabled
                  </p>
                </div>
                <Button variant="outline">
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for better visibility in low light
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-view">Compact View</Label>
                  <p className="text-sm text-muted-foreground">
                    Show more content by reducing spacing
                  </p>
                </div>
                <Switch
                  id="compact-view"
                  checked={compactView}
                  onCheckedChange={setCompactView}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAppearanceSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
