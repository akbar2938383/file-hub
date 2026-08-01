import React from 'react';
import { FileRecord, ViewMode, SortOption } from '../types';
import { FileCard } from './FileCard';
import { LayoutGrid, List, Search, ArrowUpDown, Trash2, Download, CheckSquare, Square, FolderOpen } from 'lucide-react';

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
}) => {
  const allSelected = files.length > 0 && selectedIds.length === files.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(files.map((f) => f.id));
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
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

        {/* View & Sort controls */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          
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

      {/* Bulk Selection Bar */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
          <button
            id="select-all-files"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            <span>Select All ({files.length})</span>
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
                <span>Download Selected</span>
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
      {files.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
            No files found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            {searchTerm ? `No files match "${searchTerm}"` : 'Your vault is empty. Upload files or create a text file to get started.'}
          </p>
          <button
            id="empty-upload-btn"
            onClick={onOpenUpload}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 rotate-180" />
            <span>Upload Your First File</span>
          </button>
        </div>
      )}

      {/* File List Grid or List */}
      {files.length > 0 && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2.5'}>
          {files.map((file) => (
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
            />
          ))}
        </div>
      )}

    </div>
  );
};
