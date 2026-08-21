import React, { useState, useEffect } from 'react';
import { FileRecord, ViewMode, User } from '../types';
import { formatBytes, formatDate, getCategoryBadgeColor } from '../utils/formatters';
import { canPerformFileAction, isFileAdminOnly, isFileAdminProtected } from '../utils/fileGuards';
import { Download, Eye, Edit3, Trash2, Share2, Check, FileText, Image, Film, Music, Archive, Code, File, QrCode, ShieldCheck, Lock, Folder, FolderOpen, Scissors, FolderInput } from 'lucide-react';
import { idbGetBlob } from '../lib/idb';

interface Props {
  file: FileRecord;
  viewMode: ViewMode;
  isSelected: boolean;
  isCut?: boolean;
  onToggleSelect: (id: string) => void;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
  onEdit: (file: FileRecord) => void;
  onDelete: (id: string) => void;
  onCut?: (file: FileRecord) => void;
  onMove?: (file: FileRecord) => void;
  onQrCode?: (file: FileRecord) => void;
  onOpenFolder?: (folderPath: string) => void;
  currentUser?: User | null;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  allFiles?: FileRecord[];
}

export const FileCard: React.FC<Props> = ({
  file,
  viewMode,
  isSelected,
  isCut = false,
  onToggleSelect,
  onDownload,
  onPreview,
  onEdit,
  onDelete,
  onCut,
  onMove,
  onQrCode,
  onOpenFolder,
  currentUser,
  showToast,
  allFiles = [],
}) => {
  const [copied, setCopied] = useState(false);

  const isAdminUploaded = file.uploadedByRole === 'administrator';
  const isUserAdmin = currentUser?.role === 'administrator';
  const isAdminOnlyFlag = isFileAdminOnly(file, allFiles);
  const isProtected = isFileAdminProtected(file, allFiles) && !isUserAdmin;
  const isRestrictedAdminOnly = isAdminOnlyFlag && !isUserAdmin;

  const isFolder = file.isFolder === true || file.category === 'folder';
  const folderTargetPath = file.folderPath ? `${file.folderPath}/${file.originalName}` : file.originalName;

  const notifyBlocked = (msg: string) => {
    showToast?.(msg, 'error');
  };

  const handleCardClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (isFolder) {
      if (!canPerformFileAction('open', file, currentUser, allFiles, notifyBlocked)) {
        return;
      }
      if (onOpenFolder) {
        onOpenFolder(folderTargetPath);
      }
    } else {
      if (!canPerformFileAction('preview', file, currentUser, allFiles, notifyBlocked)) {
        return;
      }
      onPreview(file);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('download', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onDownload(file);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('preview', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onPreview(file);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('edit', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onEdit(file);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('delete', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onDelete(file.id);
  };

  const handleQrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('qr', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onQrCode?.(file);
  };

  const handleCutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('cut', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onCut?.(file);
  };

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPerformFileAction('move', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onMove?.(file);
  };

  const handleCheckboxChange = () => {
    if (!canPerformFileAction('select', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onToggleSelect(file.id);
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
  const authQuery = currentUser?.role ? `?userRole=${encodeURIComponent(currentUser.role)}&username=${encodeURIComponent(currentUser.username || '')}` : '';
  const directViewUrl = `/api/files/${file.id}/view${authQuery}`;
  const directDownloadUrl = `${window.location.origin}/api/files/${file.id}/download${authQuery}`;

  const [imgSrc, setImgSrc] = useState<string>(directViewUrl);

  useEffect(() => {
    const query = currentUser?.role ? `?userRole=${encodeURIComponent(currentUser.role)}&username=${encodeURIComponent(currentUser.username || '')}` : '';
    setImgSrc(`/api/files/${file.id}/view${query}`);
  }, [file.id, currentUser]);

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
    if (!canPerformFileAction('share', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    navigator.clipboard.writeText(directDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (viewMode === 'list') {
    return (
      <div className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 gap-3 bg-white dark:bg-slate-900 border rounded-xl hover:shadow-md transition-all ${
        isCut
          ? 'border-dashed border-amber-500 bg-amber-500/10 ring-2 ring-amber-400/30 opacity-75'
          : isSelected
          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5'
          : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Left Info Section */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isProtected}
            onChange={handleCheckboxChange}
            className={`w-4 h-4 mt-1 sm:mt-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 ${
              isProtected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title={isProtected ? "Protected: Administrator items cannot be selected" : "Select item"}
          />

          <div
            onClick={handleCardClick}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
          >
            {isFolder ? (
              <FolderOpen className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            ) : file.category === 'image' && !isRestrictedAdminOnly ? (
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
                className={`font-medium text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs ${
                  isRestrictedAdminOnly
                    ? 'text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                }`}
                title={file.originalName}
              >
                {file.originalName}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize shrink-0 ${badgeClass}`}>
                {isFolder ? 'Folder' : file.category}
              </span>
              {isCut && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0" title="Item cut to clipboard ready to move">
                  <Scissors className="w-3 h-3" />
                  <span>Cut</span>
                </span>
              )}
              {isAdminUploaded && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0" title="Uploaded by Administrator">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </span>
              )}
              {file.isAdminOnly && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0" title="Restricted to Administrators only">
                  <Lock className="w-3 h-3 text-rose-500" />
                  <span>Admin Only</span>
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
          {onCut && (
            <button
              id={`cut-file-${file.id}`}
              disabled={isProtected || isRestrictedAdminOnly}
              onClick={handleCutClick}
              title={isProtected ? "Protected: Administrator items cannot be cut or moved" : "Cut to move"}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isProtected || isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isCut
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Scissors className="w-4 h-4" />
            </button>
          )}

          {onMove && (
            <button
              id={`move-file-${file.id}`}
              disabled={isProtected || isRestrictedAdminOnly}
              onClick={handleMoveClick}
              title={isProtected ? "Protected: Administrator items cannot be moved" : "Move to folder..."}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isProtected || isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <FolderInput className="w-4 h-4" />
            </button>
          )}

          {onQrCode && (
            <button
              id={`qr-file-${file.id}`}
              disabled={isRestrictedAdminOnly}
              onClick={handleQrClick}
              title={isRestrictedAdminOnly ? "Restricted to Administrators" : "Mobile QR Code"}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <button
            id={`download-file-${file.id}`}
            disabled={isRestrictedAdminOnly}
            onClick={handleDownloadClick}
            title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "Download file"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isRestrictedAdminOnly
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id={`preview-file-${file.id}`}
            disabled={isRestrictedAdminOnly}
            onClick={handlePreviewClick}
            title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "Preview file"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isRestrictedAdminOnly
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            id={`share-file-${file.id}`}
            disabled={isRestrictedAdminOnly}
            onClick={copyShareLink}
            title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "Copy download link"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isRestrictedAdminOnly
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            id={`edit-file-${file.id}`}
            disabled={isProtected}
            onClick={handleEditClick}
            title={isProtected ? "Protected: Administrator file cannot be modified" : "Edit details"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isProtected
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            id={`delete-file-${file.id}`}
            disabled={isProtected}
            onClick={handleDeleteClick}
            title={isProtected ? "Protected: Uploaded by Administrator (Deletion Locked)" : "Delete file"}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isProtected
                ? 'text-amber-500 hover:bg-amber-500/10 cursor-not-allowed opacity-80'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            {isProtected ? <Lock className="w-4 h-4 text-amber-500" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // Grid Card Layout
  return (
    <div className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all ${
      isCut
        ? 'border-dashed border-amber-500 bg-amber-500/10 ring-2 ring-amber-400/30 opacity-75'
        : isSelected
        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5'
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      
      {/* Top Bar with Checkbox & Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isProtected}
          onChange={handleCheckboxChange}
          className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
            isProtected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={isProtected ? "Protected: Administrator items cannot be selected" : "Select item"}
        />
        <div className="flex items-center gap-1.5">
          {isCut && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0" title="Item cut to clipboard ready to move">
              <Scissors className="w-3 h-3" />
              <span>Cut</span>
            </span>
          )}
          {isAdminUploaded && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0" title="Uploaded by Administrator">
              <ShieldCheck className="w-3 h-3" />
              <span>Admin</span>
            </span>
          )}
          {file.isAdminOnly && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0" title="Restricted to Administrators only">
              <Lock className="w-3 h-3 text-rose-500" />
              <span>Admin Only</span>
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
            <span className="text-[11px] font-bold">
              {isRestrictedAdminOnly ? 'Admin Only Folder' : 'Open Folder'}
            </span>
          </div>
        ) : file.category === 'image' && !isRestrictedAdminOnly ? (
          <img
            src={imgSrc}
            alt={file.originalName}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex flex-col items-center justify-center gap-1">
            <IconComponent className="w-8 h-8" />
            {isRestrictedAdminOnly && (
              <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Admin Only
              </span>
            )}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="mb-3">
        <h4
          onClick={handleCardClick}
          className={`font-semibold text-sm truncate mb-1 ${
            isRestrictedAdminOnly
              ? 'text-slate-500 dark:text-slate-400 cursor-not-allowed'
              : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
          }`}
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
          disabled={isRestrictedAdminOnly}
          onClick={handleDownloadClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors ${
            isRestrictedAdminOnly
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>

        <div className="flex items-center gap-1">
          {onCut && (
            <button
              id={`grid-cut-${file.id}`}
              disabled={isProtected || isRestrictedAdminOnly}
              onClick={handleCutClick}
              title={isProtected ? "Protected: Administrator items cannot be cut or moved" : "Cut to move"}
              className={`p-1.5 rounded-md transition-colors ${
                isProtected || isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isCut
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Scissors className="w-4 h-4" />
            </button>
          )}
          {onMove && (
            <button
              id={`grid-move-${file.id}`}
              disabled={isProtected || isRestrictedAdminOnly}
              onClick={handleMoveClick}
              title={isProtected ? "Protected: Administrator items cannot be moved" : "Move to folder..."}
              className={`p-1.5 rounded-md transition-colors ${
                isProtected || isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderInput className="w-4 h-4" />
            </button>
          )}
          {onQrCode && (
            <button
              id={`grid-qr-${file.id}`}
              disabled={isRestrictedAdminOnly}
              onClick={handleQrClick}
              title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "QR Code"}
              className={`p-1.5 rounded-md transition-colors ${
                isRestrictedAdminOnly
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          <button
            id={`grid-preview-${file.id}`}
            disabled={isRestrictedAdminOnly}
            onClick={handlePreviewClick}
            title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "Preview"}
            className={`p-1.5 rounded-md transition-colors ${
              isRestrictedAdminOnly
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            id={`grid-share-${file.id}`}
            disabled={isRestrictedAdminOnly}
            onClick={copyShareLink}
            title={isRestrictedAdminOnly ? "Restricted: Administrator Only" : "Share URL"}
            className={`p-1.5 rounded-md transition-colors ${
              isRestrictedAdminOnly
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            id={`grid-edit-${file.id}`}
            disabled={isProtected}
            onClick={handleEditClick}
            title={isProtected ? "Protected: Administrator file cannot be modified" : "Edit details"}
            className={`p-1.5 rounded-md transition-colors ${
              isProtected
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            id={`grid-delete-${file.id}`}
            disabled={isProtected}
            onClick={handleDeleteClick}
            title={isProtected ? "Protected: Uploaded by Administrator (Deletion Locked)" : "Delete"}
            className={`p-1.5 rounded-md transition-colors ${
              isProtected
                ? 'text-amber-500 hover:bg-amber-500/10 cursor-not-allowed opacity-80'
                : 'text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isProtected ? <Lock className="w-4 h-4 text-amber-500" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

    </div>
  );
};
