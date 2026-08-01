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

export interface WallpaperConfig {
  id: string;
  name: string;
  url: string;
  blur: number;
  overlayOpacity: number;
  brightness: number;
  updatedBy: string;
  updatedAt: string;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
  category: string;
}

export interface WallpaperSettings {
  activeWallpaper: WallpaperConfig;
  presets: WallpaperPreset[];
}

export type ActivePage = 'files' | 'wallpaper' | 'users' | 'login';

