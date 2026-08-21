import React, { useState } from 'react';
import { FileRecord, ViewMode, SortOption, StorageStats, User } from '../types';
import { FileCard } from './FileCard';
import { canPerformFileAction } from '../utils/fileGuards';
import { LayoutGrid, List, Search, ArrowUpDown, Trash2, Download, CheckSquare, Square, FolderOpen, Folder, Layers, Image, FileText, Film, Music, Code, Archive, Filter, FolderPlus, ChevronRight, Home, Plus, X, Loader2, Upload, Lock, Scissors, FolderInput, ClipboardPaste, CornerLeftUp, Copy, Check, Sparkles } from 'lucide-react';

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
  cutItemIds?: string[];
  onCut?: (ids: string[]) => void;
  onCancelCut?: () => void;
  onPaste?: (targetFolderPath?: string) => void;
  onOpenMoveModal?: (items: FileRecord[]) => void;
  onOpenBatchRename?: (items: FileRecord[]) => void;
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
  cutItemIds = [],
  onCut,
  onCancelCut,
  onPaste,
  onOpenMoveModal,
  onOpenBatchRename,
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

  const isUserAdmin = currentUser?.role === 'administrator';

  const normalizePath = (p: string | undefined | null) =>
    (p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  // Filter files by current folder level if search term is empty
  const displayedFiles = searchTerm.trim()
    ? files
    : files.filter((f) => {
        return normalizePath(f.folderPath) === normalizePath(currentFolderPath);
      });

  const selectableFiles = displayedFiles.filter((f) =>
    canPerformFileAction('select', f, currentUser, files)
  );
  const allSelected = selectableFiles.length > 0 && selectedIds.length === selectableFiles.length;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'normal',
          'x-username': currentUser?.username || 'public',
        },
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

  const [copiedPath, setCopiedPath] = useState(false);
  const breadcrumbs = currentFolderPath ? currentFolderPath.split('/').filter(Boolean) : [];
  const parentFolderPath = breadcrumbs.length > 0 ? breadcrumbs.slice(0, -1).join('/') : '';

  const handleCopyPath = () => {
    const fullDisplayPath = currentFolderPath ? `/${currentFolderPath}` : '/';
    navigator.clipboard.writeText(fullDisplayPath);
    setCopiedPath(true);
    showToast?.(`Copied path "${fullDisplayPath}" to clipboard`, 'success');
    setTimeout(() => setCopiedPath(false), 2000);
  };

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
      setSelectedIds(selectableFiles.map((f) => f.id));
    }
  };

  const toggleSelect = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (
      !selectedIds.includes(id) &&
      !canPerformFileAction('select', target, currentUser, files, (msg) => showToast?.(msg, 'error'))
    ) {
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkCut = () => {
    if (selectedIds.length === 0) return;
    onCut?.(selectedIds);
  };

  const handleBulkMoveModal = () => {
    if (selectedIds.length === 0) return;
    const selectedRecords = files.filter((f) => selectedIds.includes(f.id));
    onOpenMoveModal?.(selectedRecords);
  };

  const handleBulkBatchRename = () => {
    if (selectedIds.length === 0) return;
    const selectedRecords = files.filter((f) => selectedIds.includes(f.id));
    onOpenBatchRename?.(selectedRecords);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      
      {/* Combined Header: Title, Search, Sort (Newest First), Category Filter, Action Buttons */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Title & Item Count Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                {currentFolderPath ? (breadcrumbs[breadcrumbs.length - 1] || 'Folder') : 'All Files'}
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-full border border-slate-200/60 dark:border-slate-700/60">
                {displayedFiles.length} item{displayedFiles.length === 1 ? '' : 's'}
              </span>
            </div>
            {(currentFolderPath || activeCategory !== 'all') && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentFolderPath 
                  ? `Directory: /${currentFolderPath}` 
                  : `Category: ${categories.find((c) => c.key === activeCategory)?.label || activeCategory}`}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls & Sort (Newest First) */}
        <div className="flex flex-wrap items-center gap-2.5 justify-between lg:justify-end">
          
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort selector (Newest First by default) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
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

          {/* Category Dropdown */}
          {onSelectCategory && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
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
              <LayoutGrid className="w-3.5 h-3.5" />
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
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Clickable Breadcrumb Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs">
        
        {/* Navigation Breadcrumb Path with Parent Jump */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-0.5 scrollbar-none">
          
          {/* Quick "Up to Parent Folder" Button */}
          {breadcrumbs.length > 0 && (
            <button
              id="breadcrumb-up-parent-btn"
              onClick={() => setCurrentFolderPath(parentFolderPath)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg font-medium transition-all shadow-xs shrink-0 mr-1 group"
              title={`Navigate up to ${breadcrumbs.length > 1 ? `/${parentFolderPath}` : 'Root Vault'}`}
            >
              <CornerLeftUp className="w-3.5 h-3.5 text-blue-500 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-semibold">Up</span>
            </button>
          )}

          {/* Root Vault Breadcrumb */}
          <button
            id="breadcrumb-root-btn"
            onClick={() => setCurrentFolderPath('')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium shrink-0 ${
              currentFolderPath === ''
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
            title="Navigate to Root Directory"
          >
            <Home className="w-3.5 h-3.5 text-blue-500" />
            <span>Root Vault</span>
          </button>

          {/* Hierarchical Folder Segments */}
          {breadcrumbs.map((crumb, idx) => {
            const subPath = breadcrumbs.slice(0, idx + 1).join('/');
            const isLast = idx === breadcrumbs.length - 1;

            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 select-none" />
                <button
                  id={`breadcrumb-folder-${idx}`}
                  onClick={() => setCurrentFolderPath(subPath)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium truncate max-w-[160px] shrink-0 ${
                    isLast
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                  title={`Navigate to /${subPath}`}
                >
                  {isLast ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                  )}
                  <span className="truncate">{crumb}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Action Tools: Direct Path, Copy Button & Paste Action */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          
          {/* Quick Copy Path Button */}
          <button
            id="breadcrumb-copy-path-btn"
            onClick={handleCopyPath}
            className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-[11px]"
            title="Copy current directory path"
          >
            {copiedPath ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="font-mono opacity-80 max-w-[120px] truncate">
                  {currentFolderPath ? `/${currentFolderPath}` : '/'}
                </span>
              </>
            )}
          </button>

          {/* Paste Button if Items in Cut Clipboard */}
          {cutItemIds.length > 0 && onPaste && (
            <button
              id="breadcrumb-paste-here-btn"
              onClick={() => onPaste(currentFolderPath)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all animate-pulse shrink-0"
              title={`Paste ${cutItemIds.length} item(s) into current directory`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Here ({cutItemIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Persistent Cut Clipboard Banner */}
      {cutItemIds.length > 0 && (
        <div className="m-4 sm:m-5 bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-500/30 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>{cutItemIds.length} item{cutItemIds.length === 1 ? '' : 's'} cut to clipboard</span>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-[10px]">
                  Ready to Move
                </span>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                Target: <span className="font-semibold text-amber-900 dark:text-amber-200">/{currentFolderPath || '(Root Vault)'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPaste && (
              <button
                id="clipboard-paste-here-btn"
                onClick={() => onPaste(currentFolderPath)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste in this Folder</span>
              </button>
            )}

            {onOpenMoveModal && (
              <button
                id="clipboard-choose-folder-btn"
                onClick={() => {
                  const cutRecords = files.filter((f) => cutItemIds.includes(f.id));
                  onOpenMoveModal(cutRecords);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-500" />
                <span>Choose Folder...</span>
              </button>
            )}

            {onCancelCut && (
              <button
                id="clipboard-cancel-cut-btn"
                onClick={onCancelCut}
                className="p-1.5 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white rounded-lg transition-colors"
                title="Cancel Cut"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Selection Bar */}
      {displayedFiles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-800/20">
          <button
            id="select-all-files"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            <span>Select All ({displayedFiles.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
              <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">
                {selectedIds.length} selected
              </span>

              {/* Cut Selected Button */}
              {onCut && (
                <button
                  id="bulk-cut-btn"
                  onClick={handleBulkCut}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                  title="Cut selected files/folders to move them"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cut ({selectedIds.length})</span>
                </button>
              )}

              {/* Move Selected Button */}
              {onOpenMoveModal && (
                <button
                  id="bulk-move-btn"
                  onClick={handleBulkMoveModal}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                  title="Move selected items to a different directory"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Move To...</span>
                </button>
              )}

              {/* Batch Rename Button */}
              {onOpenBatchRename && (
                <button
                  id="bulk-rename-btn"
                  onClick={handleBulkBatchRename}
                  className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                  title="Batch rename selected files with prefix/suffix or sequence pattern"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Batch Rename</span>
                </button>
              )}

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

      {/* Main Files Area */}
      <div className="p-4 sm:p-6 flex-1">
        {/* Empty State */}
        {displayedFiles.length === 0 && (
          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
              {currentFolderPath ? `Folder "${currentFolderPath}" is empty` : 'No files or folders found'}
            </h3>
            {searchTerm && (
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                No files match "{searchTerm}"
              </p>
            )}
            {!searchTerm && <div className="mb-6" />}
            <div className="flex items-center gap-3">
              {cutItemIds.length > 0 && onPaste && (
                <button
                  id="empty-paste-btn"
                  onClick={() => onPaste(currentFolderPath)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Paste Cut Items Here ({cutItemIds.length})</span>
                </button>
              )}
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
                isCut={cutItemIds.includes(file.id)}
                onToggleSelect={toggleSelect}
                onCut={(f) => onCut?.([f.id])}
                onMove={(f) => onOpenMoveModal?.([f])}
                onDownload={onDownload}
                onPreview={onPreview}
                onEdit={onEdit}
                onDelete={onDelete}
                onQrCode={onQrCode}
                onOpenFolder={(targetFolder) => setCurrentFolderPath(targetFolder)}
                currentUser={currentUser}
                showToast={showToast}
                allFiles={files}
              />
            ))}
          </div>
        )}
      </div>

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
