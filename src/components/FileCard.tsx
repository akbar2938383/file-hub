import React, { useState, useEffect } from 'react';
import { FileRecord, ViewMode, User } from '../types';
import { formatBytes, formatDate, getCategoryBadgeColor } from '../utils/formatters';
import { Download, Eye, Edit3, Trash2, Share2, Check, FileText, Image, Film, Music, Archive, Code, File, QrCode, ShieldCheck, Lock, Folder, FolderOpen } from 'lucide-react';
import { idbGetBlob } from '../lib/idb';

interface Props {
  file: FileRecord;
  viewMode: ViewMode;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
  onEdit: (file: FileRecord) => void;
  onDelete: (id: string) => void;
  onQrCode?: (file: FileRecord) => void;
  onOpenFolder?: (folderPath: string) => void;
  currentUser?: User | null;
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
  onQrCode,
  onOpenFolder,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);

  const isAdminUploaded = file.uploadedByRole === 'administrator';
  const isUserAdmin = currentUser?.role === 'administrator';
  const isProtected = isAdminUploaded && !isUserAdmin;

  const isFolder = file.isFolder === true || file.category === 'folder';
  const folderTargetPath = file.folderPath ? `${file.folderPath}/${file.originalName}` : file.originalName;

  const handleCardClick = () => {
    if (isFolder && onOpenFolder) {
      onOpenFolder(folderTargetPath);
    } else {
      onPreview(file);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (isFolder) return Folder;
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

  const [imgSrc, setImgSrc] = useState<string>(directViewUrl);

  useEffect(() => {
    setImgSrc(`/api/files/${file.id}/view`);
  }, [file.id]);

  const handleImageError = async () => {
    try {
      const blob = await idbGetBlob(file.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImgSrc(url);
      }
    } catch (e) {}
  };

  const copyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(directDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (viewMode === 'list') {
    return (
      <div className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 gap-3 bg-white dark:bg-slate-900 border rounded-xl hover:shadow-md transition-all ${
        isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5' : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Left Info Section */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(file.id)}
            className="w-4 h-4 mt-1 sm:mt-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
          />

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {isFolder ? (
              <FolderOpen className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            ) : file.category === 'image' ? (
              <img
                src={imgSrc}
                alt={file.originalName}
                referrerPolicy="no-referrer"
                onError={handleImageError}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                onClick={handleCardClick}
                className="font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate max-w-[180px] sm:max-w-xs"
                title={file.originalName}
              >
                {file.originalName}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize shrink-0 ${badgeClass}`}>
                {isFolder ? 'Folder' : file.category}
              </span>
              {isAdminUploaded && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0" title="Uploaded by Administrator">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              {isFolder ? (
                <>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{file.itemCount || 0} item{(file.itemCount || 0) === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadDate)}</span>
                </>
              ) : (
                <>
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadDate)}</span>
                  <span>•</span>
                  <span>{file.downloadCount} download{file.downloadCount === 1 ? '' : 's'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1 shrink-0 justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-2 sm:pt-0 w-full sm:w-auto">
          {onQrCode && (
            <button
              id={`qr-file-${file.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onQrCode(file);
              }}
              title="Mobile QR Code"
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <button
            id={`download-file-${file.id}`}
            onClick={() => onDownload(file)}
            title="Download file"
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id={`preview-file-${file.id}`}
            onClick={() => onPreview(file)}
            title="Preview file"
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            id={`share-file-${file.id}`}
            onClick={copyShareLink}
            title="Copy download link"
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            id={`edit-file-${file.id}`}
            onClick={() => onEdit(file)}
            title="Edit details"
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            id={`delete-file-${file.id}`}
            onClick={() => onDelete(file.id)}
            title={isProtected ? "Protected: Uploaded by Administrator" : "Delete file"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isProtected
                ? 'text-amber-500 hover:bg-amber-500/10 cursor-not-allowed'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            {isProtected ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
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
        <div className="flex items-center gap-1.5">
          {isAdminUploaded && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0" title="Uploaded by Administrator">
              <ShieldCheck className="w-3 h-3" />
              <span>Admin</span>
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${badgeClass}`}>
            {isFolder ? 'Folder' : file.category}
          </span>
        </div>
      </div>

      {/* Thumbnail or Category Icon */}
      <div
        onClick={handleCardClick}
        className="w-full h-36 bg-slate-50 dark:bg-slate-800/60 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border border-slate-100 dark:border-slate-800 mb-3 group-hover:scale-[1.01] transition-transform"
      >
        {isFolder ? (
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl flex flex-col items-center justify-center gap-1">
            <FolderOpen className="w-10 h-10" />
            <span className="text-[11px] font-bold">Open Folder</span>
          </div>
        ) : file.category === 'image' ? (
          <img
            src={imgSrc}
            alt={file.originalName}
            referrerPolicy="no-referrer"
            onError={handleImageError}
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
          onClick={handleCardClick}
          className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate mb-1"
          title={file.originalName}
        >
          {file.originalName}
        </h4>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{isFolder ? `${file.itemCount || 0} item(s)` : formatBytes(file.size)}</span>
          <span>{isFolder ? 'Folder' : `${file.downloadCount} dl`}</span>
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
          {onQrCode && (
            <button
              id={`grid-qr-${file.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onQrCode(file);
              }}
              title="QR Code"
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
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
            title={isProtected ? "Protected: Uploaded by Administrator" : "Delete"}
            className={`p-1.5 rounded-md transition-colors ${
              isProtected
                ? 'text-amber-500 hover:bg-amber-500/10 cursor-not-allowed'
                : 'text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isProtected ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

    </div>
  );
};
