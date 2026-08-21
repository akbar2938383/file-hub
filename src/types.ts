export interface FileRecord {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'archive' | 'code' | 'folder' | 'other';
  tags: string[];
  description?: string;
  downloadCount: number;
  uploadedBy?: string;
  uploadedByRole?: 'administrator' | 'normal';
  isAdminOnly?: boolean;
  isFolder?: boolean;
  folderPath?: string;
  relativePath?: string;
  itemCount?: number;
  hasLocalFile?: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  totalDownloads: number;
  serverCapacityBytes?: number;
  serverFreeBytes?: number;
  categoryBreakdown: Record<string, { count: number; size: number }>;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'date_desc' | 'date_asc' | 'name' | 'size_desc' | 'size_asc' | 'downloads';
export type CategoryFilter = 'all' | 'folder' | 'image' | 'document' | 'video' | 'audio' | 'archive' | 'code' | 'other';

export type UserRole = 'administrator' | 'normal' | 'public';

export interface User {
  id: string;
  username: string;
  role: 'administrator' | 'normal';
  fullName: string;
  avatar: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type LiveType = 'aurora' | 'particles' | 'nebula' | 'matrix' | 'waves' | 'cybergrid' | 'video';

export interface WallpaperConfig {
  id: string;
  name: string;
  url: string;
  blur: number;
  overlayOpacity: number;
  brightness: number;
  updatedBy: string;
  updatedAt: string;
  isLive?: boolean;
  liveType?: LiveType;
  videoUrl?: string;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
  category: string;
  isLive?: boolean;
  liveType?: LiveType;
  videoUrl?: string;
}

export interface WallpaperSettings {
  activeWallpaper: WallpaperConfig;
  presets: WallpaperPreset[];
}

export type ActivePage = 'files' | 'wallpaper' | 'users' | 'login';

export interface DownloadTask {
  id: string;
  fileId: string;
  fileName: string;
  category?: string;
  loadedBytes: number;
  totalBytes: number;
  progress: number;
  speed?: string;
  status: 'starting' | 'downloading' | 'compressing' | 'completed' | 'error' | 'cancelled';
  errorMessage?: string;
  startTime: number;
  abortController?: AbortController;
}

