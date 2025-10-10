'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Search,
} from 'lucide-react';
import { useProjects } from '@/lib/query/hooks/use-projects';
import { useProjectFiles, useUploadFile, useDeleteFile } from '@/lib/query/hooks/use-documents';
import { useAuthStore } from '@/lib/store/auth-store';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

const FILE_CATEGORIES = [
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PERMIT', label: 'Permit' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'DRAWING', label: 'Drawing' },
  { value: 'REPORT', label: 'Report' },
  { value: 'SELECTION', label: 'Selection' },
  { value: 'OTHER', label: 'Other' },
];

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteFile();

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [uploadingFile, setUploadingFile] = React.useState(false);

  const { data: files, isLoading: filesLoading } = useProjectFiles(selectedProjectId);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Set first project as selected by default
  React.useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setUploadingFile(true);

    try {
      await uploadFileMutation.mutateAsync({
        projectId: selectedProjectId,
        file,
        metadata: {
          category: 'OTHER',
        },
      });

      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProjectId) return;

    try {
      await deleteFileMutation.mutateAsync({ fileId, projectId: selectedProjectId });

      toast({
        title: 'File deleted',
        description: 'The file has been deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CONTRACT: 'bg-blue-500',
      PERMIT: 'bg-green-500',
      PHOTO: 'bg-purple-500',
      INVOICE: 'bg-yellow-500',
      DRAWING: 'bg-indigo-500',
      REPORT: 'bg-red-500',
      SELECTION: 'bg-pink-500',
      OTHER: 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  // Filter files based on search and category
  const filteredFiles = React.useMemo(() => {
    if (!files) return [];

    return files.filter((file) => {
      const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, selectedCategory]);

  if (projectsLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">
              Create a project first to start managing documents.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage project files, contracts, photos, and documents.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={!selectedProjectId || uploadingFile}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedProjectId || uploadingFile}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadingFile ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {FILE_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted"></CardHeader>
              <CardContent className="h-20 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || selectedCategory !== 'all'
                ? 'No files match your search criteria.'
                : 'Upload your first document to get started.'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <Button
                className="mt-6"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(file.mimeType)}
                    <CardTitle className="text-sm line-clamp-1">
                      {file.filename}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getCategoryColor(file.category)} text-white flex-shrink-0 ml-2`}
                  >
                    {file.category}
                  </Badge>
                </div>
                {file.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {file.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>

                {file.uploadedBy && (
                  <div className="text-xs text-muted-foreground">
                    Uploaded by {file.uploadedBy.name}
                  </div>
                )}

                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {file.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={apiClient.getFileUrl(selectedProjectId, file.filename.split('-').slice(1).join('-'))}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteFile(file.id)}
                    disabled={deleteFileMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}