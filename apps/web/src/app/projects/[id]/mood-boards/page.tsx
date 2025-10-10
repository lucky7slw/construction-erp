'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Image,
  Palette,
  CheckCircle2,
  XCircle,
  Share2,
  Award,
  Archive,
  Calendar,
  User,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import {
  useMoodBoards,
  useCreateMoodBoard,
  useUpdateMoodBoard,
  useDeleteMoodBoard,
  useDuplicateMoodBoard,
  useApproveMoodBoard,
  type MoodBoardStatus,
} from '@/lib/query/hooks/use-mood-boards';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoodBoardForm } from '@/components/forms/mood-board-form';

const statusConfig = {
  DRAFT: { label: 'Draft', icon: Edit, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
  SHARED: { label: 'Shared', icon: Share2, color: 'text-blue-500 bg-blue-100', badge: 'default' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 bg-green-100', badge: 'default' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-500 bg-red-100', badge: 'destructive' },
  ARCHIVED: { label: 'Archived', icon: Archive, color: 'text-gray-500 bg-gray-100', badge: 'secondary' },
};

export default function MoodBoardsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<MoodBoardStatus | null>(null);
  const [selectedRoom, setSelectedRoom] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedMoodBoard, setSelectedMoodBoard] = React.useState<any>(null);

  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: moodBoards = [], isLoading: moodBoardsLoading } = useMoodBoards({
    projectId,
    status: selectedStatus || undefined,
    room: selectedRoom || undefined,
  });

  const createMoodBoard = useCreateMoodBoard();
  const updateMoodBoard = useUpdateMoodBoard();
  const deleteMoodBoard = useDeleteMoodBoard();
  const duplicateMoodBoard = useDuplicateMoodBoard();
  const approveMoodBoard = useApproveMoodBoard();

  // Get unique rooms
  const rooms = React.useMemo(() => {
    return Array.from(new Set(moodBoards.map((mb) => mb.room).filter(Boolean)));
  }, [moodBoards]);

  // Filter mood boards
  const filteredMoodBoards = React.useMemo(() => {
    return moodBoards.filter((moodBoard) => {
      const matchesSearch =
        !searchQuery ||
        moodBoard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (moodBoard.description && moodBoard.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [moodBoards, searchQuery]);

  // Calculate mood board stats
  const moodBoardStats = React.useMemo(() => {
    const byStatus = moodBoards.reduce((acc, mb) => {
      acc[mb.status] = (acc[mb.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalItems = moodBoards.reduce((sum, mb) => sum + (mb.items?.length || 0), 0);
    const totalComments = moodBoards.reduce((sum, mb) => sum + (mb.comments?.length || 0), 0);

    return {
      total: moodBoards.length,
      draft: byStatus.DRAFT || 0,
      shared: byStatus.SHARED || 0,
      approved: byStatus.APPROVED || 0,
      totalItems,
      totalComments,
    };
  }, [moodBoards]);

  // Handler functions
  const handleCreateSubmit = async (data: any) => {
    try {
      await createMoodBoard.mutateAsync({
        projectId,
        ...data,
      });
      setCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Mood board created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create mood board',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!selectedMoodBoard) return;

    try {
      await updateMoodBoard.mutateAsync({
        id: selectedMoodBoard.id,
        data,
      });
      setEditDialogOpen(false);
      setSelectedMoodBoard(null);
      toast({
        title: 'Success',
        description: 'Mood board updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update mood board',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedMoodBoard) return;

    try {
      await deleteMoodBoard.mutateAsync(selectedMoodBoard.id);
      setDeleteDialogOpen(false);
      setSelectedMoodBoard(null);
      toast({
        title: 'Success',
        description: 'Mood board deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete mood board',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (moodBoard: any) => {
    try {
      await duplicateMoodBoard.mutateAsync(moodBoard.id);
      toast({
        title: 'Success',
        description: 'Mood board duplicated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate mood board',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (moodBoard: any) => {
    try {
      await approveMoodBoard.mutateAsync(moodBoard.id);
      toast({
        title: 'Success',
        description: 'Mood board approved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve mood board',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || moodBoardsLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Mood Boards</h2>
          <p className="text-muted-foreground">Design inspiration and client collaboration</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Mood Board
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moodBoardStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All rooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shared</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{moodBoardStats.shared}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{moodBoardStats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to proceed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{moodBoardStats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {moodBoardStats.totalComments} comments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search mood boards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Button
                variant={selectedStatus === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(null)}
              >
                All
              </Button>
              {Object.entries(statusConfig).map(([status, config]) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(status as MoodBoardStatus)}
                >
                  <config.icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Button>
              ))}
            </div>

            {rooms.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Room:</span>
                <Button
                  variant={selectedRoom === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                >
                  All Rooms
                </Button>
                {rooms.map((room) => (
                  <Button
                    key={room}
                    variant={selectedRoom === room ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRoom(room)}
                  >
                    {room}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredMoodBoards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mood boards found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus(null);
                    setSelectedRoom(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Mood Board
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMoodBoards.map((moodBoard) => {
                const statusInfo = statusConfig[moodBoard.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={moodBoard.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Mood Board Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn('w-10 h-10 rounded flex items-center justify-center', statusInfo.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Mood Board Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              {moodBoard.room && (
                                <Badge variant="outline">{moodBoard.room}</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{moodBoard.name}</h3>
                            {moodBoard.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {moodBoard.description}
                              </p>
                            )}

                            {/* Items and Comments */}
                            <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Image className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-900">Items</span>
                                  </div>
                                  <p className="text-lg font-bold text-purple-800">
                                    {moodBoard.items?.length || 0}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-900">Comments</span>
                                  </div>
                                  <p className="text-lg font-bold text-purple-800">
                                    {moodBoard.comments?.length || 0}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Created by {moodBoard.createdBy}</span>
                              </div>
                              {moodBoard.customerId && (
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Customer {moodBoard.customerId}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(moodBoard.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Updated {formatDate(moodBoard.updatedAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // View mood board - could navigate or show details
                                toast({
                                  title: 'Info',
                                  description: 'Mood board detail view coming soon',
                                });
                              }}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {moodBoard.status === 'SHARED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(moodBoard)}
                                title="Approve"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(moodBoard)}
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMoodBoard(moodBoard);
                                setEditDialogOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMoodBoard(moodBoard);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            <Button variant="ghost" size="sm" title="More options">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Mood Board Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Mood Board Workflow</CardTitle>
          <CardDescription>Client collaboration process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { status: 'DRAFT', step: '1. Create', description: 'Add images and items' },
              { status: 'SHARED', step: '2. Share', description: 'Send to client' },
              { status: 'SHARED', step: '3. Feedback', description: 'Collect comments' },
              { status: 'APPROVED', step: '4. Approve', description: 'Client approves' },
              { status: 'APPROVED', step: '5. Proceed', description: 'Begin implementation' },
            ].map((workflow, index) => {
              const statusInfo = statusConfig[workflow.status as MoodBoardStatus];
              return (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-2', statusInfo.color)}>
                    <statusInfo.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{workflow.step}</h4>
                  <p className="text-xs text-muted-foreground">{workflow.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Mood Board Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Mood Board</DialogTitle>
            <DialogDescription>
              Create a new mood board to collect design inspiration
            </DialogDescription>
          </DialogHeader>
          <MoodBoardForm
            projectId={projectId}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createMoodBoard.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Mood Board Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Mood Board</DialogTitle>
            <DialogDescription>
              Update mood board details
            </DialogDescription>
          </DialogHeader>
          {selectedMoodBoard && (
            <MoodBoardForm
              projectId={projectId}
              initialData={{
                name: selectedMoodBoard.name,
                description: selectedMoodBoard.description,
                room: selectedMoodBoard.room,
                customerId: selectedMoodBoard.customerId,
                status: selectedMoodBoard.status,
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedMoodBoard(null);
              }}
              isLoading={updateMoodBoard.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Mood Board Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mood Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mood board? This action cannot be undone.
              All items and comments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedMoodBoard(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMoodBoard.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
