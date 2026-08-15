import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, File, Folder, CheckCircle2, AlertCircle, Loader2, FolderPlus, Zap, StopCircle, Image as ImageIcon, Lock } from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { User } from '../types';
import { idbSaveRecord, idbSaveRecords, idbSaveBlob } from '../lib/idb';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentUser?: User | null;
  currentFolderPath?: string;
}

interface QueuedFile {
  id: string;
  file: File;
  relativePath?: string;
  previewUrl?: string;
  status?: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const DropzoneModal: React.FC<Props> = ({ isOpen, onClose, onUploadSuccess, currentUser, currentFolderPath = '' }) => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isUserAdmin = currentUser?.role === 'administrator';
  
  // Real-time progress stats
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string>('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const currentXhrRef = useRef<XMLHttpRequest | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Clean up object URLs when modal unmounts or files change
  useEffect(() => {
    return () => {
      queuedFiles.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const traverseFileTree = async (item: any, path = ''): Promise<{ file: File; relativePath: string }[]> => {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file: File) => {
          resolve([{ file, relativePath: path + file.name }]);
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      let allEntries: any[] = [];
      
      const readBatch = (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries((result: any[]) => resolve(result || []));
        });
      };

      let entries = await readBatch();
      while (entries.length > 0) {
        allEntries = allEntries.concat(entries);
        entries = await readBatch();
      }

      const filesArrays = await Promise.all(
        allEntries.map((entry) => traverseFileTree(entry, path + item.name + '/'))
      );
      return filesArrays.flat();
    }
    return [];
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const fileEntries: { file: File; relativePath: string }[] = [];
      const promises: Promise<any>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            promises.push(
              traverseFileTree(entry).then((extracted) => {
                fileEntries.push(...extracted);
              })
            );
          }
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        if (fileEntries.length > 0) {
          addFilesWithPaths(fileEntries);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFilesWithPaths = (items: { file: File; relativePath: string }[]) => {
    setErrorMessage(null);
    const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

    const newItems: QueuedFile[] = items.map(({ file, relativePath }) => {
      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
        previewUrl = URL.createObjectURL(file);
      }
      const isTooLarge = file.size > MAX_SIZE;

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        relativePath,
        previewUrl,
        status: isTooLarge ? 'error' : 'pending',
        errorMessage: isTooLarge ? 'File exceeds 500 MB limit' : undefined,
      };
    });

    setQueuedFiles((prev) => {
      const existingKeys = new Set(prev.map((item) => `${item.file.name}-${item.file.size}-${item.relativePath || ''}`));
      const filteredNew = newItems.filter((item) => !existingKeys.has(`${item.file.name}-${item.file.size}-${item.relativePath || ''}`));
      return [...prev, ...filteredNew];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const addFiles = (files: File[]) => {
    setErrorMessage(null);
    const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

    const newItems: QueuedFile[] = files.map((f) => {
      const relPath = (f as any).webkitRelativePath || f.name;
      let previewUrl: string | undefined = undefined;
      
      if (f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024) {
        previewUrl = URL.createObjectURL(f);
      }

      const isTooLarge = f.size > MAX_SIZE;

      return {
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        relativePath: relPath,
        previewUrl,
        status: isTooLarge ? 'error' : 'pending',
        errorMessage: isTooLarge ? 'File exceeds 500 MB limit' : undefined,
      };
    });

    setQueuedFiles((prev) => {
      // Prevent duplicates based on relative path + size
      const existingKeys = new Set(prev.map((item) => `${item.file.name}-${item.file.size}-${item.relativePath || ''}`));
      const filteredNew = newItems.filter((item) => !existingKeys.has(`${item.file.name}-${item.file.size}-${item.relativePath || ''}`));
      return [...prev, ...filteredNew];
    });
  };

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const cancelActiveUpload = () => {
    isCancelledRef.current = true;
    if (currentXhrRef.current) {
      currentXhrRef.current.abort();
      currentXhrRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('Upload cancelled by user.');
  };

  const uploadLargeFileInChunks = async (
    item: QueuedFile,
    onChunkProgress: (loadedInChunk: number) => void,
    onChunkSuccess: (chunkSize: number) => void
  ) => {
    const file = item.file;
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunk size
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `up-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    for (let c = 0; c < totalChunks; c++) {
      if (isCancelledRef.current) {
        throw new Error('Upload cancelled');
      }

      const start = c * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);
      const currentChunkSize = end - start;

      let attempts = 0;
      const maxAttempts = 3;
      let chunkSuccess = false;

      while (attempts < maxAttempts && !chunkSuccess && !isCancelledRef.current) {
        attempts++;
        try {
          const formData = new FormData();
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', c.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('chunk', chunkBlob, file.name);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            currentXhrRef.current = xhr;

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                onChunkProgress(e.loaded);
              }
            });

            xhr.addEventListener('load', () => {
              currentXhrRef.current = null;
              if (xhr.status >= 200 && xhr.status < 300) {
                chunkSuccess = true;
                resolve();
              } else {
                reject(new Error(`Chunk HTTP error ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              currentXhrRef.current = null;
              reject(new Error('Network error during chunk upload'));
            });

            xhr.addEventListener('abort', () => {
              currentXhrRef.current = null;
              reject(new Error('Upload cancelled'));
            });

            xhr.open('POST', '/api/files/upload-chunk');
            if (currentUser) {
              xhr.setRequestHeader('x-username', currentUser.username);
              xhr.setRequestHeader('x-user-role', currentUser.role);
            }
            xhr.send(formData);
          });
        } catch (err: any) {
          if (isCancelledRef.current || err.message === 'Upload cancelled') {
            throw new Error('Upload cancelled');
          }
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }

      if (chunkSuccess) {
        onChunkSuccess(currentChunkSize);
      } else {
        throw new Error(`Failed to upload chunk ${c + 1}/${totalChunks}`);
      }
    }

    if (isCancelledRef.current) {
      throw new Error('Upload cancelled');
    }

    // Finalize chunked upload
    const completeBody = {
      uploadId,
      totalChunks,
      originalName: file.name,
      relativePath: item.relativePath || file.name,
      folderPath: currentFolderPath || '',
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      isAdminOnly: isUserAdmin ? isAdminOnly : undefined,
    };

    const res = await fetch('/api/files/upload-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentUser ? { 'x-username': currentUser.username, 'x-user-role': currentUser.role } : {}),
      },
      body: JSON.stringify(completeBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to finalize chunked upload');
    }

    const completeData = await res.json().catch(() => ({}));
    if (completeData.uploadedFile) {
      await idbSaveRecord(completeData.uploadedFile);
      await idbSaveBlob(completeData.uploadedFile.id, file);
    }
    if (Array.isArray(completeData.createdFolders) && completeData.createdFolders.length > 0) {
      await idbSaveRecords(completeData.createdFolders);
    }
  };

  // Resumable Chunked & Monotonic Upload Engine with Precise Speed Stats
  const handleStartUpload = async () => {
    const validFiles = queuedFiles.filter((q) => q.status !== 'error' && q.status !== 'completed');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    isCancelledRef.current = false;
    setErrorMessage(null);
    setUploadProgress(0);

    const totalBatchBytes = validFiles.reduce((acc, item) => acc + item.file.size, 0);
    setTotalBytes(totalBatchBytes);
    setBytesUploaded(0);

    let completedBytes = 0;
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    const updateStats = (currentLoaded: number) => {
      const currentTotalUploaded = Math.min(totalBatchBytes, completedBytes + currentLoaded);
      setBytesUploaded(currentTotalUploaded);

      const percentage = Math.min(100, Math.round((currentTotalUploaded / totalBatchBytes) * 100));
      setUploadProgress(percentage);

      const elapsedTime = (Date.now() - startTime) / 1000;
      if (elapsedTime > 0.3) {
        const speedBytesPerSec = currentTotalUploaded / elapsedTime;
        setUploadSpeed(`${formatBytes(speedBytesPerSec)}/s`);

        const remainingBytes = Math.max(0, totalBatchBytes - currentTotalUploaded);
        const remainingSecs = Math.ceil(remainingBytes / (speedBytesPerSec || 1));
        if (remainingSecs > 60) {
          setEstimatedTimeLeft(`${Math.ceil(remainingSecs / 60)} min remaining`);
        } else {
          setEstimatedTimeLeft(`${remainingSecs}s remaining`);
        }
      }
    };

    const CHUNK_THRESHOLD = 25 * 1024 * 1024; // 25 MB threshold for chunked upload

    const uploadSingleFileDirectly = async (item: QueuedFile): Promise<boolean> => {
      let attempts = 0;
      const maxAttempts = 3;
      let directSuccess = false;

      while (attempts < maxAttempts && !directSuccess && !isCancelledRef.current) {
        attempts++;
        try {
          const formData = new FormData();
          if (currentFolderPath) {
            formData.append('folderPath', currentFolderPath);
          }
          if (isUserAdmin && isAdminOnly) {
            formData.append('isAdminOnly', 'true');
          }
          const relPath = item.relativePath || item.file.name;
          formData.append('relativePaths', JSON.stringify([relPath]));
          formData.append('files', item.file);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            currentXhrRef.current = xhr;

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                updateStats(e.loaded);
              }
            });

            xhr.addEventListener('load', () => {
              currentXhrRef.current = null;
              if (xhr.status >= 200 && xhr.status < 300) {
                directSuccess = true;
                try {
                  const resData = JSON.parse(xhr.responseText);
                  if (resData.uploadedFile) {
                    idbSaveRecord(resData.uploadedFile);
                    idbSaveBlob(resData.uploadedFile.id, item.file);
                  } else if (Array.isArray(resData.uploadedFiles)) {
                    for (const f of resData.uploadedFiles) {
                      idbSaveRecord(f);
                      idbSaveBlob(f.id, item.file);
                    }
                  }
                  if (Array.isArray(resData.createdFolders) && resData.createdFolders.length > 0) {
                    idbSaveRecords(resData.createdFolders);
                  }
                } catch (e) {}
                resolve();
              } else {
                try {
                  const res = JSON.parse(xhr.responseText);
                  reject(new Error(res.error || `Upload HTTP error ${xhr.status}`));
                } catch {
                  reject(new Error(`Server error ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => {
              currentXhrRef.current = null;
              reject(new Error('Network drop during upload'));
            });

            xhr.addEventListener('abort', () => {
              currentXhrRef.current = null;
              reject(new Error('Upload cancelled'));
            });

            xhr.open('POST', '/api/files/upload');
            if (currentUser) {
              xhr.setRequestHeader('x-username', currentUser.username);
              xhr.setRequestHeader('x-user-role', currentUser.role);
            }
            xhr.send(formData);
          });
        } catch (err: any) {
          if (isCancelledRef.current || err.message === 'Upload cancelled') {
            throw new Error('Upload cancelled');
          }
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }

      return directSuccess;
    };

    try {
      for (let i = 0; i < validFiles.length; i++) {
        if (isCancelledRef.current) break;

        const item = validFiles[i];

        // Mark current item as uploading
        setQueuedFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
        );

        let fileSuccess = false;

        if (item.file.size > CHUNK_THRESHOLD) {
          // Large file: Resumable chunked upload with fallback
          try {
            await uploadLargeFileInChunks(item, updateStats, (chunkSize) => {
              completedBytes += chunkSize;
              updateStats(0);
            });
            fileSuccess = true;
          } catch (err: any) {
            if (isCancelledRef.current || err.message === 'Upload cancelled') {
              throw new Error('Upload cancelled');
            }
            console.warn(`Chunked upload failed for ${item.file.name}, trying direct upload fallback...`, err);
            fileSuccess = await uploadSingleFileDirectly(item);
            if (fileSuccess) {
              completedBytes += item.file.size;
              updateStats(0);
            }
          }
        } else {
          // Small / Medium file: Single request
          fileSuccess = await uploadSingleFileDirectly(item);
          if (fileSuccess) {
            completedBytes += item.file.size;
            updateStats(0);
          }
        }

        if (fileSuccess) {
          successCount++;
          setQueuedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'completed' } : f))
          );
        } else {
          failCount++;
          setQueuedFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: 'error', errorMessage: 'Upload failed' } : f
            )
          );
        }
      }

      if (isCancelledRef.current) {
        setIsUploading(false);
        setUploadProgress(0);
        setErrorMessage('Upload cancelled by user.');
        return;
      }

      setUploadProgress(100);
      onUploadSuccess();

      if (failCount === 0) {
        setTimeout(() => {
          setIsUploading(false);
          setQueuedFiles([]);
          setUploadProgress(0);
          onClose();
        }, 600);
      } else {
        setIsUploading(false);
        setErrorMessage(`Uploaded ${successCount} file(s) successfully. ${failCount} file(s) failed.`);
      }
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      if (err.message !== 'Upload cancelled') {
        setErrorMessage(err.message || 'An error occurred during upload');
      }
    }
  };

  const totalQueueSize = queuedFiles.reduce((acc, item) => acc + item.file.size, 0);
  const invalidFilesCount = queuedFiles.filter((item) => item.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-2xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Optimized Vault Upload</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> High-Speed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop files, folders, or bulk media assets</p>
            </div>
          </div>
          <button
            id="close-upload-modal"
            onClick={isUploading ? cancelActiveUpload : onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-medium">
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
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Drag & drop files or full folders here
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Parallel multi-thread streaming • Max 500 MB per file
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                id="select-individual-files-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <File className="w-4 h-4" />
                <span>Select Files</span>
              </button>

              <button
                type="button"
                id="select-folder-btn"
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Select Folder</span>
              </button>
            </div>
          </div>

          {/* Admin Only Toggle (visible for administrators) */}
          {isUserAdmin && (
            <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Upload as Admin Only</span>
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold rounded">
                      Restricted
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Uploaded files and folders will only be visible to administrators.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="admin-only-dropzone-toggle"
                  checked={isAdminOnly}
                  onChange={(e) => setIsAdminOnly(e.target.checked)}
                  disabled={isUploading}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>
          )}

          {/* Queued Files List */}
          {queuedFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center gap-2">
                  <span>Selected Queue ({queuedFiles.length})</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({formatBytes(totalQueueSize)})
                  </span>
                </span>
                {!isUploading && (
                  <button
                    id="clear-queued-files"
                    onClick={() => setQueuedFiles([])}
                    className="text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {queuedFiles.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                      item.status === 'error'
                        ? 'bg-red-500/5 border-red-500/20 text-red-600'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden mr-2">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : item.relativePath && item.relativePath.includes('/') ? (
                        <div className="w-9 h-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                          <File className="w-4 h-4" />
                        </div>
                      )}

                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.relativePath || item.file.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{formatBytes(item.file.size)}</span>
                          {item.errorMessage && (
                            <span className="text-red-500 font-medium">• {item.errorMessage}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isUploading && (
                      <button
                        id={`remove-queued-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQueuedFile(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Real-time Upload Stats Progress */}
          {isUploading && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Streaming upload to vault...</span>
                </span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Live Speed & ETA Info */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>
                  {formatBytes(bytesUploaded)} / {formatBytes(totalBytes)}
                </span>
                <div className="flex items-center gap-3">
                  {uploadSpeed && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{uploadSpeed}</span>}
                  {estimatedTimeLeft && <span>• {estimatedTimeLeft}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {invalidFilesCount > 0 && (
              <span className="text-amber-500 font-medium">
                {invalidFilesCount} file(s) will be skipped
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isUploading ? (
              <button
                id="cancel-upload-active-btn"
                onClick={cancelActiveUpload}
                className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Cancel Upload</span>
              </button>
            ) : (
              <button
                id="cancel-upload-btn"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              id="confirm-upload-btn"
              onClick={handleStartUpload}
              disabled={queuedFiles.length === 0 || queuedFiles.every((q) => q.status === 'error') || isUploading}
              className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading ({uploadProgress}%)</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Upload {queuedFiles.filter((q) => q.status !== 'error').length > 0 ? `${queuedFiles.filter((q) => q.status !== 'error').length} File(s)` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

