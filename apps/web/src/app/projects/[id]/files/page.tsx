'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  File,
  FileText,
  Image,
  Download,
  Trash2,
  Search,
  Calendar,
  User,
  FolderOpen,
  X,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const FILE_CATEGORIES = [
  'DRAWING',
  'SPECIFICATION',
  'CONTRACT',
  'INVOICE',
  'PHOTO',
  'REPORT',
  'OTHER'
] as const;

const categoryConfig = {
  DRAWING: { label: 'Drawing', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  SPECIFICATION: { label: 'Specification', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  CONTRACT: { label: 'Contract', icon: File, color: 'bg-red-100 text-red-700' },
  INVOICE: { label: 'Invoice', icon: FileText, color: 'bg-green-100 text-green-700' },
  PHOTO: { label: 'Photo', icon: Image, color: 'bg-orange-100 text-orange-700' },
  REPORT: { label: 'Report', icon: FileText, color: 'bg-teal-100 text-teal-700' },
  OTHER: { label: 'Other', icon: File, color: 'bg-gray-100 text-gray-700' },
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return Image;
  }
  if (['pdf'].includes(ext || '')) {
    return FileText;
  }
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default function FilesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Upload form state
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = React.useState<string>('OTHER');
  const [uploadDescription, setUploadDescription] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);

  // Fetch files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const response = await apiClient.getProjectFiles(projectId);
      return response.files || [];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return apiClient.uploadFile(projectId, file, {
        category: uploadCategory,
        description: uploadDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiClient.deleteFile(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete file',
        variant: 'destructive',
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setUploadFiles((prev) => [...prev, ...selectedFiles]);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setUploadFiles((prev) => [...prev, ...droppedFiles]);
  };

  // Handle upload
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one file',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Upload files sequentially to show progress
      for (const file of uploadFiles) {
        await uploadMutation.mutateAsync(file);
      }

      toast({
        title: 'Success',
        description: `${uploadFiles.length} file(s) uploaded successfully`,
      });

      setUploadDialogOpen(false);
      setUploadFiles([]);
      setUploadDescription('');
      setUploadCategory('OTHER');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    }
  };

  // Filter files
  const filteredFiles = React.useMemo(() => {
    return files.filter((file: any) => {
      const matchesCategory = selectedCategory === 'ALL' || file.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [files, selectedCategory, searchQuery]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalSize = files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
    const byCategory = files.reduce((acc: any, file: any) => {
      acc[file.category] = (acc[file.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: files.length,
      totalSize,
      byCategory,
    };
  }, [files]);

  if (isLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Files & Documents</h2>
          <p className="text-muted-foreground">
            Manage project files, photos, and documents
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(stats.totalSize)}
            </p>
          </CardContent>
        </Card>

        {Object.entries(categoryConfig).slice(0, 3).map(([category, config]) => {
          const Icon = config.icon;
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}s
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byCategory[category] || 0}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {FILE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryConfig[cat].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Files Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Files</CardTitle>
          <CardDescription>{filteredFiles.length} files</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No files found</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload First File
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((file: any) => {
                const FileIcon = getFileIcon(file.filename);
                const categoryInfo = categoryConfig[file.category as keyof typeof categoryConfig];

                return (
                  <div
                    key={file.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{file.filename}</h4>
                        {file.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <Badge className={categoryInfo.color} variant="secondary">
                          {categoryInfo.label}
                        </Badge>
                        <span>{formatFileSize(file.size || 0)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span className="text-xs">{file.uploadedBy?.firstName} {file.uploadedBy?.lastName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{formatDate(new Date(file.uploadedAt))}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const url = apiClient.getFileUrl(projectId, file.filename);
                          window.open(url, '_blank');
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(file);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload project files, photos, and documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              )}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Drag and drop files here</h3>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button type="button" variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>

            {/* Selected Files */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({uploadFiles.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFiles((prev) => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Select */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryConfig[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Add a description for these files"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setUploadFiles([]);
                  setUploadDescription('');
                }}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending || uploadFiles.length === 0}>
                {uploadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload {uploadFiles.length > 0 && `(${uploadFiles.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFile?.filename}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedFile(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedFile) {
                  deleteMutation.mutate(selectedFile.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
