'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus,
  Users,
  Search,
  Mail,
  Calendar,
  Shield,
  MoreVertical,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useUsers } from '@/lib/query/hooks/use-users';
import { formatDistanceToNow } from 'date-fns';

export default function TeamPage() {
  const { data: users, isLoading } = useUsers();
  const [searchQuery, setSearchQuery] = React.useState('');

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500';
      case 'manager':
        return 'bg-blue-500';
      case 'member':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-500 text-white">
        <UserCheck className="mr-1 h-3 w-3" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <UserX className="mr-1 h-3 w-3" />
        Inactive
      </Badge>
    );
  };

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user: any) =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading team members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions across your projects.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/team/invite">
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: any) => u.isActive).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: any) => u.role === 'ADMIN').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: any) => u.role === 'MANAGER').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      {!filteredUsers || filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? 'No members found' : 'No team members yet'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Invite team members to collaborate on your projects'}
            </p>
            {!searchQuery && (
              <Button className="mt-6" asChild>
                <Link href="/team/invite">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite First Member
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user: any) => (
            <Link key={user.id} href={`/team/${user.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
                            {user.role}
                          </Badge>
                          {getStatusBadge(user.isActive)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    {user.email}
                  </div>
                  {user.createdAt && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </div>
                  )}
                  {user.company && (
                    <div className="text-sm text-muted-foreground">
                      Company: <span className="font-medium text-foreground">{user.company.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
