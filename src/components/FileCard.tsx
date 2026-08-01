import React, { useState } from 'react';
import { FileRecord, ViewMode } from '../types';
import { formatBytes, formatDate, getCategoryBadgeColor } from '../utils/formatters';
import { Download, Eye, Edit3, Trash2, Share2, Check, FileText, Image, Film, Music, Archive, Code, File } from 'lucide-react';

interface Props {
  file: FileRecord;
  viewMode: ViewMode;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
  onEdit: (file: FileRecord) => void;
  onDelete: (id: string) => void;
}

export const FileCard: React.FC<Props> = ({
  file,
  viewMode,
  isSelected,
  onToggleSelect,
  onDownload,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image': return Image;
      case 'video': return Film;
      case 'audio': return Music;
      case 'document': return FileText;
      case 'archive': return Archive;
      case 'code': return Code;
      default: return File;
    }
  };

  const IconComponent = getCategoryIcon(file.category);
  const badgeClass = getCategoryBadgeColor(file.category);
  const directViewUrl = `/api/files/${file.id}/view`;
  const directDownloadUrl = `${window.location.origin}/api/files/${file.id}/download`;

  const copyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(directDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (viewMode === 'list') {
    return (
      <div className={`group flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border rounded-xl hover:shadow-md transition-all ${
        isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5' : 'border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(file.id)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
          />

          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {file.category === 'image' ? (
              <img
                src={directViewUrl}
                alt={file.originalName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                onClick={() => onPreview(file)}
                className="font-medium text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
              >
                {file.originalName}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize shrink-0 ${badgeClass}`}>
                {file.category}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadDate)}</span>
              <span>•</span>
              <span>{file.downloadCount} download{file.downloadCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* List Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`download-file-${file.id}`}
            onClick={() => onDownload(file)}
            title="Download file"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id={`preview-file-${file.id}`}
            onClick={() => onPreview(file)}
            title="Preview file"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            id={`share-file-${file.id}`}
            onClick={copyShareLink}
            title="Copy download link"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            id={`edit-file-${file.id}`}
            onClick={() => onEdit(file)}
            title="Edit details"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            id={`delete-file-${file.id}`}
            onClick={() => onDelete(file.id)}
            title="Delete file"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Grid Card Layout
  return (
    <div className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5' : 'border-slate-200 dark:border-slate-800'
    }`}>
      
      {/* Top Bar with Checkbox & Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(file.id)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${badgeClass}`}>
          {file.category}
        </span>
      </div>

      {/* Thumbnail or Category Icon */}
      <div
        onClick={() => onPreview(file)}
        className="w-full h-36 bg-slate-50 dark:bg-slate-800/60 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border border-slate-100 dark:border-slate-800 mb-3 group-hover:scale-[1.01] transition-transform"
      >
        {file.category === 'image' ? (
          <img
            src={directViewUrl}
            alt={file.originalName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
            <IconComponent className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="mb-3">
        <h4
          onClick={() => onPreview(file)}
          className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate mb-1"
          title={file.originalName}
        >
          {file.originalName}
        </h4>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{formatBytes(file.size)}</span>
          <span>{file.downloadCount} dl</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          id={`grid-download-${file.id}`}
          onClick={() => onDownload(file)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            id={`grid-preview-${file.id}`}
            onClick={() => onPreview(file)}
            title="Preview"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            id={`grid-share-${file.id}`}
            onClick={copyShareLink}
            title="Share URL"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            id={`grid-edit-${file.id}`}
            onClick={() => onEdit(file)}
            title="Edit details"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            id={`grid-delete-${file.id}`}
            onClick={() => onDelete(file.id)}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
