'use client';

import * as React from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth, useAuthActions } from '@/lib/store/auth-store';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Header({ onMenuClick, sidebarCollapsed, onToggleCollapse }: HeaderProps) {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notificationCount] = React.useState(3); // Mock notification count

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open main menu</span>
        </Button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects, tasks..."
            className="w-64 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {notificationCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-2 px-2 hover:bg-accent">
              {/* Online status indicator */}
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-green-500">
                  <AvatarImage src="" alt={user?.firstName || 'User'} />
                  <AvatarFallback className="bg-construction-600 text-white font-semibold">
                    {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
              </div>
              {/* User name on desktop */}
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.companies?.[0]?.name || 'No company'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center space-x-3 p-2">
                <Avatar className="h-12 w-12 ring-2 ring-green-500">
                  <AvatarImage src="" alt={user?.firstName || 'User'} />
                  <AvatarFallback className="bg-construction-600 text-white font-semibold text-lg">
                    {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 flex-1">
                  <p className="text-xs text-muted-foreground">Logged in as</p>
                  <p className="text-sm font-semibold leading-none">
                    {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'No email'}
                  </p>
                  {user?.roles && user.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                          {role.name.toLowerCase().replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}