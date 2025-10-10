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
  Upload,
  Search,
  Filter,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Folder,
  FolderOpen,
  Calendar,
  User,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Video,
  Music,
} from 'lucide-react';
import { useProjectFiles, useUploadFile, useDeleteFile } from '@/lib/query/hooks/use-documents';
import { formatDate, cn } from '@/lib/utils';

type DocumentCategory = 'DRAWING' | 'SPECIFICATION' | 'CONTRACT' | 'PHOTO' | 'REPORT' | 'OTHER';

type Document = {
  id: string;
  projectId: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
  uploadedById: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const categoryConfig = {
  DRAWING: { label: 'Drawing', icon: FileText, color: 'text-blue-600 bg-blue-100' },
  SPECIFICATION: { label: 'Specification', icon: FileSpreadsheet, color: 'text-green-600 bg-green-100' },
  CONTRACT: { label: 'Contract', icon: FileArchive, color: 'text-purple-600 bg-purple-100' },
  PHOTO: { label: 'Photo', icon: Image, color: 'text-pink-600 bg-pink-100' },
  REPORT: { label: 'Report', icon: FileText, color: 'text-orange-600 bg-orange-100' },
  OTHER: { label: 'Other', icon: File, color: 'text-gray-600 bg-gray-100' },
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive;
  if (mimeType.includes('code') || mimeType.includes('text')) return FileCode;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<DocumentCategory | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  const { data: files = [], isLoading } = useProjectFiles(projectId);
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    return files.filter((doc: any) => {
      const matchesSearch =
        !searchQuery ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !selectedCategory || doc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, selectedCategory]);

  // Calculate document stats
  const documentStats = React.useMemo(() => {
    const totalSize = files.reduce((sum: number, doc: any) => sum + (doc.size || 0), 0);
    const byCategory = files.reduce((acc: any, doc: any) => {
      const category = doc.category || 'OTHER';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: files.length,
      totalSize,
      drawings: byCategory.DRAWING || 0,
      specifications: byCategory.SPECIFICATION || 0,
      contracts: byCategory.CONTRACT || 0,
      photos: byCategory.PHOTO || 0,
      reports: byCategory.REPORT || 0,
      other: byCategory.OTHER || 0,
    };
  }, [files]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        await uploadFile.mutateAsync({
          projectId,
          file,
          metadata: {
            category: selectedCategory || undefined,
          },
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteFile.mutateAsync({ fileId, projectId });
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

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
          <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">Manage project files and documentation</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(documentStats.totalSize)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drawings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{documentStats.drawings}</div>
            <p className="text-xs text-muted-foreground mt-1">Technical drawings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{documentStats.photos}</div>
            <p className="text-xs text-muted-foreground mt-1">Site photography</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{documentStats.contracts}</div>
            <p className="text-xs text-muted-foreground mt-1">Legal documents</p>
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
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {Object.entries(categoryConfig).map(([category, config]) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category as DocumentCategory)}
                >
                  <config.icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc: any) => {
                const FileIcon = getFileIcon(doc.mimeType);
                const categoryInfo = doc.category
                  ? categoryConfig[doc.category as DocumentCategory]
                  : categoryConfig.OTHER;

                return (
                  <div
                    key={doc.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <FileIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{doc.name}</h3>
                            {doc.category && (
                              <Badge className={categoryInfo.color}>
                                <categoryInfo.icon className="mr-1 h-3 w-3" />
                                {categoryInfo.label}
                              </Badge>
                            )}
                          </div>

                          {doc.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {doc.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <File className="h-4 w-4" />
                              <span>{formatFileSize(doc.size)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(new Date(doc.createdAt))}</span>
                            </div>
                            {doc.uploadedBy && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                                </span>
                              </div>
                            )}
                          </div>

                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              {doc.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>Project document storage breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Used Storage</span>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(documentStats.totalSize)} / 10 GB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${Math.min((documentStats.totalSize / (10 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
              {Object.entries(categoryConfig).map(([category, config]) => {
                const count =
                  category === 'DRAWING'
                    ? documentStats.drawings
                    : category === 'SPECIFICATION'
                    ? documentStats.specifications
                    : category === 'CONTRACT'
                    ? documentStats.contracts
                    : category === 'PHOTO'
                    ? documentStats.photos
                    : category === 'REPORT'
                    ? documentStats.reports
                    : documentStats.other;

                return (
                  <div key={category} className="flex items-center gap-2">
                    <div className={cn('p-2 rounded', config.color)}>
                      <config.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{count} files</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
