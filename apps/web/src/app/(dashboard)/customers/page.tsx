'use client';

import { useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Building, DollarSign } from 'lucide-react';
import { useCustomers, useAssignCustomerToProject, type Customer } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { data: customers = [], isLoading } = useCustomers({
    companyId: user?.companies?.[0]?.id || '',
  });

  const { data: projects = [] } = useProjects();

  const assignCustomer = useAssignCustomerToProject();

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedCustomer || !selectedProjectId) return;

    try {
      await assignCustomer.mutateAsync({
        projectId: selectedProjectId,
        customerId: selectedCustomer.id,
      });
      setAssignDialogOpen(false);
      setSelectedCustomer(null);
      setSelectedProjectId('');
    } catch (error) {
      console.error('Failed to assign customer:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customers and their projects</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No customers found. Convert leads to create customers.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    {customer.isActive ? (
                      <Badge variant="outline" className="mt-2">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                {customer.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>Contact: {customer.contactPerson}</span>
                  </div>
                )}

                <div className="pt-3 flex gap-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setAssignDialogOpen(true);
                    }}
                  >
                    Assign to Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assign Customer Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Customer to Project</DialogTitle>
            <DialogDescription>
              Select a project to assign {selectedCustomer?.name} to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{selectedCustomer?.name}</p>
                {selectedCustomer?.email && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((p) => !p.customerId) // Only show unassigned projects
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  {projects.filter((p) => !p.customerId).length === 0 && (
                    <div className="py-2 px-2 text-sm text-muted-foreground">
                      No unassigned projects available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedCustomer(null);
                  setSelectedProjectId('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedProjectId || assignCustomer.isPending}
              >
                {assignCustomer.isPending ? 'Assigning...' : 'Assign Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
