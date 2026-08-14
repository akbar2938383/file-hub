import React, { useState } from 'react';
import { FileRecord, ViewMode, SortOption, StorageStats, User } from '../types';
import { FileCard } from './FileCard';
import { LayoutGrid, List, Search, ArrowUpDown, Trash2, Download, CheckSquare, Square, FolderOpen, Layers, Image, FileText, Film, Music, Code, Archive, Filter, FolderPlus, ChevronRight, Home, Plus, X, Loader2, Upload } from 'lucide-react';

interface Props {
  files: FileRecord[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: SortOption;
  setSortOption: (opt: SortOption) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
  onEdit: (file: FileRecord) => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onOpenUpload: () => void;
  onQrCode?: (file: FileRecord) => void;
  activeCategory?: string;
  onSelectCategory?: (cat: string) => void;
  stats?: StorageStats | null;
  currentUser?: User | null;
  onRefreshFiles?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  currentFolderPath?: string;
  setCurrentFolderPath?: (path: string) => void;
}

export const FileList: React.FC<Props> = ({
  files,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  selectedIds,
  setSelectedIds,
  onDownload,
  onPreview,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkDownload,
  onOpenUpload,
  onQrCode,
  activeCategory = 'all',
  onSelectCategory,
  stats,
  currentUser,
  onRefreshFiles,
  showToast,
  currentFolderPath: propFolderPath,
  setCurrentFolderPath: propSetFolderPath,
}) => {
  const [localFolderPath, setLocalFolderPath] = useState<string>('');
  const currentFolderPath = propFolderPath !== undefined ? propFolderPath : localFolderPath;
  const setCurrentFolderPath = propSetFolderPath || setLocalFolderPath;

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const normalizePath = (p: string | undefined | null) =>
    (p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  // Filter files by current folder level if search term is empty
  const displayedFiles = searchTerm.trim()
    ? files
    : files.filter((f) => {
        return normalizePath(f.folderPath) === normalizePath(currentFolderPath);
      });

  const allSelected = displayedFiles.length > 0 && selectedIds.length === displayedFiles.length;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/folders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderPath: currentFolderPath,
          uploadedByRole: currentUser?.role || 'normal',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');

      showToast?.(data.message || 'Folder created successfully!', 'success');
      setNewFolderName('');
      setIsCreateFolderOpen(false);
      onRefreshFiles?.();
    } catch (err: any) {
      showToast?.(err.message || 'Error creating folder', 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const breadcrumbs = currentFolderPath ? currentFolderPath.split('/').filter(Boolean) : [];

  const categories = [
    { key: 'all', label: 'All Files', icon: Layers, count: stats?.totalFiles ?? files.length },
    { key: 'image', label: 'Images', icon: Image, count: stats?.categoryBreakdown?.image?.count ?? files.filter((f) => f.category === 'image').length },
    { key: 'document', label: 'Documents', icon: FileText, count: stats?.categoryBreakdown?.document?.count ?? files.filter((f) => f.category === 'document').length },
    { key: 'video', label: 'Videos', icon: Film, count: stats?.categoryBreakdown?.video?.count ?? files.filter((f) => f.category === 'video').length },
    { key: 'audio', label: 'Audio', icon: Music, count: stats?.categoryBreakdown?.audio?.count ?? files.filter((f) => f.category === 'audio').length },
    { key: 'code', label: 'Code', icon: Code, count: stats?.categoryBreakdown?.code?.count ?? files.filter((f) => f.category === 'code').length },
    { key: 'archive', label: 'Archives', icon: Archive, count: stats?.categoryBreakdown?.archive?.count ?? files.filter((f) => f.category === 'archive').length },
  ];

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedFiles.map((f) => f.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Action Controls Bar */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files by name, tags, description..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View, Sort & Category Dropdown controls */}
          <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
            
            {/* Sort selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="size_desc">Size (Largest)</option>
                <option value="size_asc">Size (Smallest)</option>
                <option value="downloads">Most Downloaded</option>
              </select>
            </div>

            {/* Category Dropdown (placed right beside sort selector as marked) */}
            {onSelectCategory && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <select
                  id="category-filter-select"
                  value={activeCategory}
                  onChange={(e) => onSelectCategory(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({c.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Upload Button */}
            <button
              id="upload-file-btn"
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>

            {/* New Folder Button */}
            <button
              id="new-folder-btn"
              onClick={() => setIsCreateFolderOpen(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <button
                id="view-grid-btn"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                id="view-list-btn"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Folder Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs overflow-x-auto">
          <button
            onClick={() => setCurrentFolderPath('')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium ${
              currentFolderPath === ''
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Root Vault</span>
          </button>

          {breadcrumbs.map((crumb, idx) => {
            const subPath = breadcrumbs.slice(0, idx + 1).join('/');
            const isLast = idx === breadcrumbs.length - 1;

            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  onClick={() => setCurrentFolderPath(subPath)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium truncate max-w-[150px] ${
                    isLast
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span className="truncate">{crumb}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>



      </div>

      {/* Bulk Selection Bar */}
      {displayedFiles.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
          <button
            id="select-all-files"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            <span>Select All ({displayedFiles.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {selectedIds.length} selected
              </span>

              <button
                id="bulk-download-btn"
                onClick={onBulkDownload}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bundle ZIP Download</span>
              </button>

              <button
                id="bulk-delete-btn"
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {displayedFiles.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
            {currentFolderPath ? `Folder "${currentFolderPath}" is empty` : 'No files or folders found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            {searchTerm
              ? `No files match "${searchTerm}"`
              : 'This directory is currently empty. Upload files or create new subfolders to organize your vault.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Folder</span>
            </button>
            <button
              id="empty-upload-btn"
              onClick={onOpenUpload}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4 rotate-180" />
              <span>Upload Files Here</span>
            </button>
          </div>
        </div>
      )}

      {/* File List Grid or List */}
      {displayedFiles.length > 0 && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2.5'}>
          {displayedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              isSelected={selectedIds.includes(file.id)}
              onToggleSelect={toggleSelect}
              onDownload={onDownload}
              onPreview={onPreview}
              onEdit={onEdit}
              onDelete={onDelete}
              onQrCode={onQrCode}
              onOpenFolder={(targetFolder) => setCurrentFolderPath(targetFolder)}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Create New Folder
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Location: {currentFolderPath ? `/${currentFolderPath}` : '/ (Root)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Invoices, Project Files, Photos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  {isCreatingFolder ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Folder</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
