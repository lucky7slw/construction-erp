'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  Shield,
  MoreVertical,
  UserPlus,
  Trash2,
  Edit,
  Crown,
  User,
  Building2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import {
  useTeamMembers,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  type TeamMember
} from '@/lib/query/hooks/use-team';
import { TeamMemberForm } from '@/components/forms/team-member-form';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

const roleConfig = {
  manager: {
    label: 'Manager',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100',
    description: 'Full control over project and team',
  },
  member: {
    label: 'Member',
    icon: User,
    color: 'text-green-600 bg-green-100',
    description: 'Create and edit tasks',
  },
  viewer: {
    label: 'Viewer',
    icon: User,
    color: 'text-gray-600 bg-gray-100',
    description: 'View project data only',
  },
} as const;

export default function TeamPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers(projectId);

  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const removeMember = useRemoveTeamMember();

  const handleInvite = async (data: { email: string; role: 'manager' | 'member' | 'viewer' }) => {
    try {
      // Note: This is simplified - in production, you'd need to look up user by email first
      // or have a dedicated invite endpoint that handles user creation/lookup
      await addMember.mutateAsync({
        projectId,
        userId: data.email, // Temporary - should be actual userId
        role: data.role,
      });
      toast({
        title: 'Success',
        description: 'Team member invited successfully',
      });
      setInviteDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to invite team member',
        variant: 'destructive',
      });
    }
  };

  const handleEditRole = async (data: { email: string; role: 'manager' | 'member' | 'viewer' }) => {
    if (!selectedMember) return;

    try {
      await updateMember.mutateAsync({
        id: selectedMember.id,
        projectId,
        role: data.role,
      });
      toast({
        title: 'Success',
        description: 'Team member role updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update team member',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;

    try {
      await removeMember.mutateAsync({
        id: selectedMember.id,
        projectId,
      });
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove team member',
        variant: 'destructive',
      });
    }
  };

  // Filter team members
  const filteredMembers = React.useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        !searchQuery ||
        member.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = !selectedRole || member.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [teamMembers, searchQuery, selectedRole]);

  // Calculate team stats
  const teamStats = React.useMemo(() => {
    const byRole = teamMembers.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: teamMembers.length,
      managers: byRole.manager || 0,
      members: byRole.member || 0,
      viewers: byRole.viewer || 0,
    };
  }, [teamMembers]);

  if (projectLoading || teamLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Manage project access and roles</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Active team size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{teamStats.managers}</div>
            <p className="text-xs text-muted-foreground mt-1">Management access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.members}</div>
            <p className="text-xs text-muted-foreground mt-1">Can edit tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{teamStats.viewers}</div>
            <p className="text-xs text-muted-foreground mt-1">Read-only access</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedRole === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole(null)}
              >
                All
              </Button>
              {Object.entries(roleConfig).map(([role, config]) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRole(role)}
                >
                  <config.icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRole(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const roleInfo = roleConfig[member.role];
                const RoleIcon = roleInfo.icon;

                return (
                  <div
                    key={member.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {member.user.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={`${member.user.firstName} ${member.user.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {member.user.firstName[0]}
                          {member.user.lastName[0]}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {member.user.firstName} {member.user.lastName}
                            </h3>
                            <Badge className={roleInfo.color}>
                              <RoleIcon className="mr-1 h-3 w-3" />
                              {roleInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{roleInfo.description}</p>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>{member.user.email}</span>
                            </div>
                            {member.user.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <span>{member.user.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Joined {formatDate(member.joinedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {member.role !== 'manager' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding team member access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(roleConfig).map(([role, config]) => {
              const RoleIcon = config.icon;

              const permissions =
                role === 'manager'
                  ? ['Full project control', 'Invite/remove members', 'Edit project settings', 'Manage budget']
                  : role === 'member'
                  ? ['Create tasks', 'Edit assigned tasks', 'Log time', 'Upload documents']
                  : ['View project data', 'View tasks', 'View documents', 'Export reports'];

              return (
                <div key={role} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('p-2 rounded', config.color)}>
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{config.label}</h4>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {permissions.map((permission, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Members who haven't accepted their invite yet</CardDescription>
            </div>
            <Badge variant="outline">0 pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No pending invitations</p>
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this project
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            onSubmit={handleInvite}
            onCancel={() => setInviteDialogOpen(false)}
            isLoading={addMember.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member Role</DialogTitle>
            <DialogDescription>
              Update the role and permissions for {selectedMember?.user.firstName} {selectedMember?.user.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <TeamMemberForm
              onSubmit={handleEditRole}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedMember(null);
              }}
              isLoading={updateMember.isPending}
              initialData={{
                email: selectedMember.user.email,
                role: selectedMember.role,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.user.firstName} {selectedMember?.user.lastName} from this project?
              They will lose access to all project data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedMember(null);
              }}
              disabled={removeMember.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
