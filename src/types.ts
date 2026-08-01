export interface FileRecord {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'archive' | 'code' | 'other';
  tags: string[];
  description?: string;
  downloadCount: number;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  totalDownloads: number;
  categoryBreakdown: Record<string, { count: number; size: number }>;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'date_desc' | 'date_asc' | 'name' | 'size_desc' | 'size_asc' | 'downloads';
export type CategoryFilter = 'all' | 'image' | 'document' | 'video' | 'audio' | 'archive' | 'code' | 'other';
