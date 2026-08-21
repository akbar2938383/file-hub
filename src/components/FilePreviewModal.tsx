import React, { useState, useEffect } from 'react';
import { FileRecord, User } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { canPerformFileAction, isFileAdminProtected } from '../utils/fileGuards';
import { Download, X, Copy, Check, Eye, FileText, Code, Film, Music, Image, Archive, Tag, Calendar, HardDrive, Share2, Trash2, QrCode, Lock } from 'lucide-react';
import { idbGetBlob } from '../lib/idb';

interface Props {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
  onDelete?: (id: string) => void;
  onQrCode?: (file: FileRecord) => void;
  currentUser?: User | null;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  allFiles?: FileRecord[];
}

export const FilePreviewModal: React.FC<Props> = ({
  file,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onQrCode,
  currentUser,
  showToast,
  allFiles = [],
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(null);

  const isUserAdmin = currentUser?.role === 'administrator';
  const isProtected = file ? (isFileAdminProtected(file, allFiles) && !isUserAdmin) : false;

  const notifyBlocked = (msg: string) => {
    showToast?.(msg, 'error');
  };

  const handleDownload = () => {
    if (!file) return;
    if (!canPerformFileAction('download', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onDownload(file);
  };

  const handleDelete = () => {
    if (!file || !onDelete) return;
    if (!canPerformFileAction('delete', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onClose();
    onDelete(file.id);
  };

  const handleQr = () => {
    if (!file || !onQrCode) return;
    if (!canPerformFileAction('qr', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    onQrCode(file);
  };

  const handleCopyLink = () => {
    if (!file) return;
    if (!canPerformFileAction('share', file, currentUser, allFiles, notifyBlocked)) {
      return;
    }
    const directUrl = `${window.location.origin}/api/files/${file.id}/download`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    let isSubscribed = true;
    let createdUrl: string | null = null;

    if (file) {
      idbGetBlob(file.id).then((blob) => {
        if (isSubscribed && blob) {
          createdUrl = URL.createObjectURL(blob);
          setLocalMediaUrl(createdUrl);
        }
      });
    } else {
      setLocalMediaUrl(null);
    }

    if (file && (file.category === 'code' || file.category === 'document' || file.mimeType.startsWith('text/'))) {
      setIsTextLoading(true);
      setTextError(null);
      const authQuery = currentUser?.role ? `?userRole=${encodeURIComponent(currentUser.role)}&username=${encodeURIComponent(currentUser.username || '')}` : '';
      const headers: Record<string, string> = {};
      if (currentUser?.role) headers['x-user-role'] = currentUser.role;
      if (currentUser?.username) headers['x-username'] = currentUser.username;

      fetch(`/api/files/${file.id}/content${authQuery}`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error('Cannot render text preview');
          return res.json();
        })
        .then((data) => {
          if (isSubscribed) {
            setTextContent(data.content);
            setIsTextLoading(false);
          }
        })
        .catch(async () => {
          if (file) {
            const blob = await idbGetBlob(file.id);
            if (blob && isSubscribed) {
              const text = await blob.text();
              setTextContent(text);
              setIsTextLoading(false);
              return;
            }
          }
          if (isSubscribed) {
            setTextContent(null);
            setIsTextLoading(false);
            setTextError('Inline text view not available for this format/size');
          }
        });
    } else {
      setTextContent(null);
      setTextError(null);
    }

    return () => {
      isSubscribed = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file, currentUser]);

  if (!isOpen || !file) return null;

  const authQuery = currentUser?.role ? `?userRole=${encodeURIComponent(currentUser.role)}&username=${encodeURIComponent(currentUser.username || '')}` : '';
  const directViewUrl = `/api/files/${file.id}/view${authQuery}`;
  const mediaUrl = localMediaUrl || directViewUrl;
  const directDownloadUrl = `${window.location.origin}/api/files/${file.id}/download${authQuery}`;

  const copyDownloadLink = () => {
    navigator.clipboard.writeText(directDownloadUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyTextContent = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  const renderMediaPreview = () => {
    if (file.category === 'image') {
      return (
        <div className="flex items-center justify-center min-h-[300px] max-h-[500px] bg-slate-950 rounded-xl overflow-hidden p-2">
          <img
            src={mediaUrl}
            alt={file.originalName}
            referrerPolicy="no-referrer"
            className="max-h-[480px] w-auto object-contain rounded-lg"
          />
        </div>
      );
    }

    if (file.category === 'video') {
      return (
        <div className="flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden p-2">
          <video controls className="max-h-[450px] w-full rounded-lg">
            <source src={mediaUrl} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (file.category === 'audio') {
      return (
        <div className="p-8 bg-slate-950 rounded-xl flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center animate-pulse">
            <Music className="w-8 h-8" />
          </div>
          <p className="text-sm text-slate-300 font-medium">{file.originalName}</p>
          <audio controls className="w-full max-w-md">
            <source src={mediaUrl} type={file.mimeType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (textContent !== null) {
      return (
        <div className="relative group">
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={copyTextContent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg shadow transition-colors"
            >
              {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedContent ? 'Copied' : 'Copy Content'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto max-h-[400px] leading-relaxed select-text border border-slate-800">
            {textContent}
          </pre>
        </div>
      );
    }

    if (file.mimeType === 'application/pdf') {
      return (
        <div className="h-[450px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <iframe src={directViewUrl} title={file.originalName} className="w-full h-full" />
        </div>
      );
    }

    return (
      <div className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl flex items-center justify-center mb-3">
          <FileText className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Direct preview not supported for {file.category} files
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
          You can download this file directly to view it on your device.
        </p>
        <button
          onClick={() => onDownload(file)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download File ({formatBytes(file.size)})</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 gap-2 w-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-1 sm:mr-3">
            <div className="p-2 sm:p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                {file.originalName}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 sm:gap-2 truncate">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="uppercase">{file.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {onQrCode && (
              <button
                id="qr-preview-file"
                onClick={handleQr}
                title="Mobile QR Code"
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="hidden md:inline">QR Code</span>
              </button>
            )}

            <button
              id="copy-download-link"
              onClick={handleCopyLink}
              title="Copy download URL"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Share2 className="w-4 h-4 shrink-0" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              id="download-preview-file"
              onClick={handleDownload}
              title="Download file"
              className="p-1.5 sm:p-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {onDelete && (
              <button
                id="delete-preview-file"
                disabled={isProtected}
                onClick={handleDelete}
                title={isProtected ? "Protected: Administrator files cannot be deleted by members" : "Delete file"}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors ${
                  isProtected
                    ? 'text-amber-500 hover:bg-amber-500/10 cursor-not-allowed opacity-80'
                    : 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                {isProtected ? <Lock className="w-4 h-4 text-amber-500 shrink-0" /> : <Trash2 className="w-4 h-4 shrink-0" />}
              </button>
            )}

            <button
              id="close-preview-modal"
              onClick={onClose}
              title="Close modal"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-5 flex-1">
          {renderMediaPreview()}

          {/* Detailed Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
            <div>
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5" /> Upload Date
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{formatDate(file.uploadDate)}</div>
            </div>

            <div>
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Download className="w-3.5 h-3.5" /> Downloads
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{file.downloadCount} times</div>
            </div>

            <div>
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <HardDrive className="w-3.5 h-3.5" /> Size
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{formatBytes(file.size)}</div>
            </div>

            <div>
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Tag className="w-3.5 h-3.5" /> Category
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200 capitalize">{file.category}</div>
            </div>
          </div>

          {file.description && (
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes:</span>
              <p className="text-slate-600 dark:text-slate-400">{file.description}</p>
            </div>
          )}

          {file.tags && file.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Tags:</span>
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
