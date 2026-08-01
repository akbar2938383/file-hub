import React, { useState, useRef } from 'react';
import { Upload, X, File, Folder, CheckCircle2, AlertCircle, Loader2, FolderPlus } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  relativePath?: string;
}

export const DropzoneModal: React.FC<Props> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    setErrorMessage(null);
    const valid = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      relativePath: (f as any).webkitRelativePath || f.name,
    }));
    setQueuedFiles((prev) => [...prev, ...valid]);
  };

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartUpload = async () => {
    if (queuedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    const formData = new FormData();
    queuedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      setUploadProgress(40);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setQueuedFiles([]);
        setUploadProgress(0);
        onUploadSuccess();
        onClose();
      }, 500);
    } catch (err: unknown) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during upload');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Upload Files & Folders</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop files or upload an entire folder</p>
            </div>
          </div>
          <button
            id="close-upload-modal"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderChange}
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            className="hidden"
          />

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
              Drag & drop files or folders here
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Supports any file format up to 500 MB per file
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                id="select-individual-files-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <File className="w-4 h-4" />
                <span>Select Files</span>
              </button>

              <button
                type="button"
                id="select-folder-btn"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Select Folder</span>
              </button>
            </div>
          </div>

          {/* Queued Files List */}
          {queuedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                <span>Selected Files / Folder Contents ({queuedFiles.length})</span>
                <button
                  id="clear-queued-files"
                  onClick={() => setQueuedFiles([])}
                  className="text-red-500 hover:underline"
                  disabled={isUploading}
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {queuedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl"
                  >
                    <div className="flex items-center gap-3 overflow-hidden mr-2">
                      {item.relativePath && item.relativePath.includes('/') ? (
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.relativePath || item.file.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatBytes(item.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      id={`remove-queued-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQueuedFile(item.id);
                      }}
                      disabled={isUploading}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploading progress bar */}
          {isUploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  Uploading to server...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            id="cancel-upload-btn"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-upload-btn"
            onClick={handleStartUpload}
            disabled={queuedFiles.length === 0 || isUploading}
            className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Upload {queuedFiles.length > 0 ? `${queuedFiles.length} File(s)` : ''}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
