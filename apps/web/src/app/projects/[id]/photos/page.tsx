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
  Image as ImageIcon,
  Calendar,
  User,
  MapPin,
  Tag,
  Download,
  Trash2,
  Eye,
  Grid3x3,
  List,
  Filter,
  Upload,
  X,
} from 'lucide-react';
import { useProject } from '@/lib/query/hooks/use-projects';
import { usePhotos, useUploadPhoto, useDeletePhoto, type Photo } from '@/lib/query/hooks/use-photos';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';

export default function PhotosPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: photos = [], isLoading: photosLoading } = usePhotos({
    projectId,
    tag: selectedTag || undefined,
  });

  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();

  // Get all unique tags
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    photos.forEach((photo) => {
      photo.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [photos]);

  // Filter photos
  const filteredPhotos = React.useMemo(() => {
    return photos.filter((photo) => {
      const matchesSearch =
        !searchQuery ||
        photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [photos, searchQuery]);

  // Calculate photo stats
  const photoStats = React.useMemo(() => {
    const byMonth = photos.reduce((acc, photo) => {
      const month = new Date(photo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const thisMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

    return {
      total: photos.length,
      thisMonth: byMonth[thisMonth] || 0,
      lastMonth: byMonth[lastMonth] || 0,
      uniqueTags: allTags.length,
    };
  }, [photos, allTags]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // For now, we'll use a placeholder URL since file upload typically requires a separate API
      // In production, you'd upload to cloud storage first and get back a URL
      try {
        await uploadPhoto.mutateAsync({
          projectId,
          filename: file.name,
          fileUrl: URL.createObjectURL(file), // Temporary - should be replaced with actual upload
          mimeType: file.type,
          size: file.size,
          tags: [],
        });
        toast({
          title: 'Success',
          description: `Photo "${file.name}" uploaded successfully`,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await deletePhoto.mutateAsync({ id: photo.id, projectId });
      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
      });
      setSelectedPhoto(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading || photosLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Progress Photos</h2>
          <p className="text-muted-foreground">Document project progress with photos</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{photoStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{photoStats.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{photoStats.lastMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{photoStats.uniqueTags}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique tags</p>
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
                    placeholder="Search photos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tags filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {allTags.slice(0, 6).map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
              {allTags.length > 6 && (
                <Button variant="outline" size="sm">
                  <Filter className="mr-1 h-3 w-3" />
                  +{allTags.length - 6} more
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No photos found</p>
              {searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {!searchQuery && (
                <Button className="mt-4" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Photo
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.fileUrl}
                    alt={photo.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-semibold text-white text-sm mb-1">{photo.filename}</h3>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(photo.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {photo.tags.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {photo.tags.length}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="flex-shrink-0">
                    <img
                      src={photo.fileUrl}
                      alt={photo.filename}
                      className="w-24 h-24 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{photo.filename}</h3>
                    {photo.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {photo.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>
                          {photo.uploader.firstName} {photo.uploader.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(photo.createdAt)}</span>
                      </div>
                      {photo.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{photo.location}</span>
                        </div>
                      )}
                    </div>
                    {photo.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        {photo.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={photo.fileUrl} download={photo.filename}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedPhoto.fileUrl}
                alt={selectedPhoto.filename}
                className="w-full max-h-[60vh] object-contain bg-muted"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{selectedPhoto.filename}</h2>
              {selectedPhoto.description && (
                <p className="text-muted-foreground mb-4">{selectedPhoto.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Uploaded By</p>
                  <p>
                    {selectedPhoto.uploader.firstName} {selectedPhoto.uploader.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Upload Date</p>
                  <p>{formatDate(selectedPhoto.createdAt)}</p>
                </div>
                {selectedPhoto.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                    <p>{selectedPhoto.location}</p>
                  </div>
                )}
                {selectedPhoto.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPhoto.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild>
                  <a href={selectedPhoto.fileUrl} download={selectedPhoto.filename}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={selectedPhoto.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-2 h-4 w-4" />
                    View Full Size
                  </a>
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedPhoto)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
