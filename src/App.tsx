import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileRecord, StorageStats, ViewMode, SortOption, CategoryFilter, User, ActivePage, WallpaperSettings } from './types';
import { idbSaveRecords, idbGetAllRecords, idbGetBlob, idbDeleteRecord, idbDeleteRecords } from './lib/idb';
import { Navbar } from './components/Navbar';
import { StorageSummaryCard } from './components/StorageSummaryCard';
import { FileList } from './components/FileList';
import { DropzoneModal } from './components/DropzoneModal';
import { CreateTextModal } from './components/CreateTextModal';
import { EditFileModal } from './components/EditFileModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CurlGeneratorModal } from './components/CurlGeneratorModal';
import { QRCodeModal } from './components/QRCodeModal';
import { LoginPage } from './components/LoginPage';
import { WallpaperChangerPage } from './components/WallpaperChangerPage';
import { UserControlPage } from './components/UserControlPage';
import { LiveWallpaperCanvas } from './components/LiveWallpaperCanvas';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vault_theme');
      if (saved) return saved === 'dark';
    } catch (e) {}
    return true; // Default to dark mode
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vault_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vault_theme', 'light');
    }
  }, [isDark]);

  // App Navigation & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vault_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading saved user:', e);
    }
    return null;
  });

  const [activePage, setActivePage] = useState<ActivePage>(() => (currentUser ? 'files' : 'login'));

  // Force login page if unauthenticated
  useEffect(() => {
    if (!currentUser && activePage !== 'login') {
      setActivePage('login');
    }
  }, [currentUser, activePage]);

  // Wallpaper Settings State (Live Polled)
  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings | null>(null);

  // Filters & State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search term to prevent overloading the server with concurrent calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCreateTextOpen, setIsCreateTextOpen] = useState<boolean>(false);
  const [isCurlOpen, setIsCurlOpen] = useState<boolean>(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [previewingFile, setPreviewingFile] = useState<FileRecord | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; bulk?: boolean; name?: string } | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Poll wallpaper settings every 3 seconds for real-time live sync across public users
  const fetchWallpaperSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/wallpaper');
      if (res.ok) {
        const data = await res.json();
        setWallpaperSettings(data);
        if (data && data.activeWallpaper) {
          try {
            localStorage.setItem('vault_wallpaper_backup', JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error fetching wallpaper settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchWallpaperSettings();
    const interval = setInterval(fetchWallpaperSettings, 3000);

    // Sync persistent user accounts, wallpapers, and files on startup
    const rawUsers = localStorage.getItem('vault_persistent_users');
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        if (Array.isArray(users) && users.length > 0) {
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users }),
          }).catch((err) => console.error('Initial user sync failed:', err));
        }
      } catch (e) {
        console.error('Error parsing stored persistent users:', e);
      }
    }

    const rawWallpaper = localStorage.getItem('vault_wallpaper_backup');
    if (rawWallpaper) {
      try {
        const wp = JSON.parse(rawWallpaper);
        if (wp && wp.activeWallpaper) {
          fetch('/api/wallpaper/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wp),
          }).catch((err) => console.error('Initial wallpaper sync failed:', err));
        }
      } catch (e) {
        console.error('Error parsing stored wallpaper backup:', e);
      }
    }

    const rawFiles = localStorage.getItem('vault_files_backup');
    if (rawFiles) {
      try {
        const cachedFiles = JSON.parse(rawFiles);
        if (Array.isArray(cachedFiles) && cachedFiles.length > 0) {
          fetch('/api/files/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: cachedFiles }),
          }).catch((err) => console.error('Initial files metadata sync failed:', err));
        }
      } catch (e) {
        console.error('Error parsing stored files backup:', e);
      }
    }

    return () => clearInterval(interval);
  }, [fetchWallpaperSettings]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('vault_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setActivePage('files');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('vault_user');
    } catch (e) {
      console.error(e);
    }
    setActivePage('login');
    showToast('Signed out successfully. Please log in to access the system.', 'success');
  };

  const fetchStats = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (currentUser) {
        headers['x-username'] = currentUser.username;
        headers['x-user-role'] = currentUser.role;
      }
      const res = await fetch('/api/files/stats', { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [currentUser]);

  const rehydrateServerWithLocalRecords = useCallback(async (records: FileRecord[]) => {
    if (!records || records.length === 0) return;
    try {
      await fetch('/api/files/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: records }),
      });
    } catch (e) {
      console.error('Metadata sync failed during rehydration:', e);
    }

    for (const record of records) {
      if (record.isFolder) continue;
      try {
        const blob = await idbGetBlob(record.id);
        if (blob) {
          const formData = new FormData();
          formData.append('file', blob, record.originalName);
          formData.append('id', record.id);
          formData.append('originalName', record.originalName);
          formData.append('filename', record.filename || '');
          formData.append('folderPath', record.folderPath || '');
          formData.append('relativePath', record.relativePath || record.originalName);
          formData.append('category', record.category);
          formData.append('mimeType', record.mimeType);
          formData.append('uploadedBy', record.uploadedBy || 'public');
          formData.append('uploadedByRole', record.uploadedByRole || 'normal');
          formData.append('description', record.description || '');
          formData.append('tags', JSON.stringify(record.tags || []));
          formData.append('uploadDate', record.uploadDate);

          await fetch('/api/files/rehydrate', {
            method: 'POST',
            body: formData,
          });
        }
      } catch (err) {
        console.error(`Failed rehydrating file ${record.originalName}:`, err);
      }
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    // Abort previous in-flight file fetch request if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRefreshing(true);
    try {
      const query = new URLSearchParams();
      if (debouncedSearchTerm) query.append('search', debouncedSearchTerm);
      if (activeCategory !== 'all') query.append('category', activeCategory);
      if (sortOption) query.append('sort', sortOption);

      const headers: Record<string, string> = {};
      if (currentUser) {
        headers['x-username'] = currentUser.username;
        headers['x-user-role'] = currentUser.role;
      }

      const res = await fetch(`/api/files?${query.toString()}`, {
        signal: controller.signal,
        headers,
      });

      let serverRecords: FileRecord[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          serverRecords = data;
        }
      }

      const filterAvatars = (records: FileRecord[]) => {
        if (currentUser?.role === 'administrator') return records;
        return records.filter((r: FileRecord) => {
          const isAvatarFile =
            r.tags?.includes('avatar') ||
            r.tags?.includes('user-pfp') ||
            r.id?.startsWith('avatar-') ||
            r.originalName?.startsWith('Avatar_') ||
            r.folderPath === 'avatar' ||
            r.folderPath?.startsWith('avatar/');
          const isAvatarFolder = r.isFolder && r.originalName.toLowerCase() === 'avatar';
          return !isAvatarFile && !isAvatarFolder;
        });
      };

      serverRecords = filterAvatars(serverRecords);

      // Persistent records from browser IndexedDB
      const localRecords = await idbGetAllRecords();
      const filteredLocal = filterAvatars(localRecords);

      // Identify local records missing from server records
      const serverIdSet = new Set(serverRecords.map((r) => r.id));
      const missingFromServer = filteredLocal.filter((r) => !serverIdSet.has(r.id));

      let finalFilesList: FileRecord[] = [...serverRecords];

      if (missingFromServer.length > 0) {
        const matchesCategory = (f: FileRecord) => {
          if (activeCategory === 'all') return true;
          if (f.isFolder || f.category === 'folder') return true;
          return f.category === activeCategory;
        };
        const matchesSearch = (f: FileRecord) => {
          if (!debouncedSearchTerm) return true;
          const lower = debouncedSearchTerm.toLowerCase();
          return (
            f.originalName.toLowerCase().includes(lower) ||
            (f.description && f.description.toLowerCase().includes(lower)) ||
            (f.tags && f.tags.some((t) => t.toLowerCase().includes(lower)))
          );
        };

        const matchingMissing = missingFromServer.filter(
          (f) => matchesCategory(f) && matchesSearch(f)
        );

        finalFilesList = [...serverRecords, ...matchingMissing];

        // Restore missing files back to server in background
        rehydrateServerWithLocalRecords(missingFromServer);
      }

      setFiles(finalFilesList);
      idbSaveRecords(finalFilesList);
      try {
        localStorage.setItem('vault_files_backup', JSON.stringify(finalFilesList));
      } catch (e) {}

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error fetching files:', err);
      const localRecords = await idbGetAllRecords();
      const filteredLocal = currentUser?.role === 'administrator'
        ? localRecords
        : localRecords.filter((r) => {
            const isAvatarFile =
              r.tags?.includes('avatar') ||
              r.tags?.includes('user-pfp') ||
              r.id?.startsWith('avatar-') ||
              r.originalName?.startsWith('Avatar_') ||
              r.folderPath === 'avatar' ||
              r.folderPath?.startsWith('avatar/');
            const isAvatarFolder = r.isFolder && r.originalName.toLowerCase() === 'avatar';
            return !isAvatarFile && !isAvatarFolder;
          });
      setFiles(filteredLocal);
      showToast('Loaded files from local offline cache', 'success');
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearchTerm, activeCategory, sortOption, currentUser, rehydrateServerWithLocalRecords]);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const triggerBrowserDownload = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const rehydrateSingleFile = async (record: FileRecord) => {
    try {
      const blob = await idbGetBlob(record.id);
      if (blob) {
        const formData = new FormData();
        formData.append('file', blob, record.originalName);
        formData.append('id', record.id);
        formData.append('originalName', record.originalName);
        formData.append('filename', record.filename || '');
        formData.append('folderPath', record.folderPath || '');
        formData.append('relativePath', record.relativePath || record.originalName);
        formData.append('category', record.category);
        formData.append('mimeType', record.mimeType);
        formData.append('uploadedBy', record.uploadedBy || 'public');
        formData.append('uploadedByRole', record.uploadedByRole || 'normal');
        formData.append('description', record.description || '');
        formData.append('tags', JSON.stringify(record.tags || []));
        formData.append('uploadDate', record.uploadDate);

        await fetch('/api/files/rehydrate', {
          method: 'POST',
          body: formData,
        });
      }
    } catch (err) {
      console.error('Error rehydrating single file to server:', err);
    }
  };

  const handleClientFolderZipDownload = async (folderRecord: FileRecord) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const folderFullPath = folderRecord.folderPath
      ? `${folderRecord.folderPath}/${folderRecord.originalName}`
      : folderRecord.originalName;

    const allLocalRecords = await idbGetAllRecords();
    const subFiles = allLocalRecords.filter(
      (r) =>
        !r.isFolder &&
        ((r.folderPath || '') === folderFullPath ||
          (r.folderPath || '').startsWith(folderFullPath + '/'))
    );

    let count = 0;
    for (const sub of subFiles) {
      let fileBlob: Blob | null = null;
      try {
        const res = await fetch(`/api/files/${sub.id}/download`);
        if (res.ok) {
          fileBlob = await res.blob();
        }
      } catch (e) {}

      if (!fileBlob) {
        fileBlob = await idbGetBlob(sub.id);
      }

      if (fileBlob) {
        let relInFolder = sub.folderPath
          ? sub.folderPath.slice(folderFullPath.length).replace(/^\//, '')
          : '';
        let zipEntryPath = relInFolder
          ? `${folderRecord.originalName}/${relInFolder}/${sub.originalName}`
          : `${folderRecord.originalName}/${sub.originalName}`;
        zip.file(zipEntryPath, fileBlob);
        count++;
      }
    }

    if (count === 0) {
      zip.file(`${folderRecord.originalName}/.keep`, 'Empty Folder Archive');
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBrowserDownload(zipBlob, `${folderRecord.originalName}.zip`);
    showToast(`Downloaded folder "${folderRecord.originalName}.zip"`, 'success');
  };

  const handleDownloadFile = async (file: FileRecord) => {
    if (file.isFolder || file.category === 'folder') {
      showToast(`Compressing folder "${file.originalName}" into ZIP archive...`, 'success');
      try {
        const downloadUrl = `/api/files/${file.id}/download`;
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          triggerBrowserDownload(blob, `${file.originalName}.zip`);
          showToast(`Downloaded folder "${file.originalName}.zip"`, 'success');
          return;
        }
      } catch (e) {}

      try {
        await handleClientFolderZipDownload(file);
      } catch (err: any) {
        showToast(err.message || 'Error downloading folder archive', 'error');
      }
      return;
    }

    showToast(`Downloading ${file.originalName}...`, 'success');
    const downloadUrl = `/api/files/${file.id}/download`;
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        triggerBrowserDownload(blob, file.originalName);
        showToast(`Downloaded ${file.originalName}`, 'success');
      } else {
        // Physical file missing on server -> Fallback to IndexedDB local blob!
        const localBlob = await idbGetBlob(file.id);
        if (localBlob) {
          triggerBrowserDownload(localBlob, file.originalName);
          showToast(`Downloaded "${file.originalName}" from local cache. Restoring on server...`, 'success');
          rehydrateSingleFile(file);
        } else {
          showToast(`Cannot download "${file.originalName}": file was uploaded before cloud persistence was enabled. Please re-upload it.`, 'error');
        }
      }
    } catch (err: any) {
      const localBlob = await idbGetBlob(file.id);
      if (localBlob) {
        triggerBrowserDownload(localBlob, file.originalName);
        showToast(`Downloaded "${file.originalName}" from local cache`, 'success');
      } else {
        showToast(err.message || 'Error downloading file', 'error');
      }
    }

    setTimeout(() => {
      fetchFiles();
      fetchStats();
    }, 1000);
  };

  const requestSingleDelete = (id: string) => {
    const targetFile = files.find((f) => f.id === id);
    if (id === 'folder-avatar' || (targetFile?.isFolder && targetFile.originalName.toLowerCase() === 'avatar')) {
      showToast('The system avatar folder cannot be deleted.', 'error');
      return;
    }
    setDeleteTarget({ id, name: targetFile ? targetFile.originalName : 'this item' });
  };

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const filterSystemFolder = selectedIds.filter((id) => id !== 'folder-avatar');
    if (filterSystemFolder.length === 0) {
      showToast('System avatar folder cannot be deleted.', 'error');
      return;
    }
    setDeleteTarget({ bulk: true, name: `${filterSystemFolder.length} selected item(s)` });
  };

  const confirmExecutionDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.bulk) {
      const idsToDelete = selectedIds.filter((id) => id !== 'folder-avatar');
      try {
        const res = await fetch('/api/files/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser?.role || 'normal',
          },
          body: JSON.stringify({ ids: idsToDelete, userRole: currentUser?.role || 'normal' }),
        });

        const data = await res.json();
        if (!res.ok && res.status !== 404) throw new Error(data.error || 'Bulk delete failed');

        await idbDeleteRecords(idsToDelete);
        setFiles((prev) => prev.filter((f) => !idsToDelete.includes(f.id)));
        showToast(data.message || `${idsToDelete.length} item(s) deleted successfully`, 'success');
        setSelectedIds([]);
        fetchFiles();
        fetchStats();
      } catch (err: any) {
        showToast(err.message || 'Failed to perform bulk delete', 'error');
      } finally {
        setDeleteTarget(null);
      }
    } else if (deleteTarget.id) {
      const targetId = deleteTarget.id;
      try {
        const res = await fetch(`/api/files/${targetId}`, {
          method: 'DELETE',
          headers: {
            'x-user-role': currentUser?.role || 'normal',
          },
        });

        const data = await res.json();
        if (!res.ok && res.status !== 404) throw new Error(data.error || 'Delete failed');

        await idbDeleteRecord(targetId);
        setFiles((prev) => prev.filter((f) => f.id !== targetId));
        showToast(data.message || 'Folder or file deleted successfully', 'success');
        setSelectedIds((prev) => prev.filter((i) => i !== targetId));
        fetchFiles();
        fetchStats();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete file or folder', 'error');
      } finally {
        setDeleteTarget(null);
      }
    }
  };

  const handleBulkDownload = async (idsToZip?: string[], folderPathToZip?: string) => {
    const targetIds = idsToZip || selectedIds;
    if (targetIds.length === 0 && folderPathToZip === undefined) return;

    showToast('Bundling selected files into ZIP archive...', 'success');

    try {
      const res = await fetch('/api/files/bulk-download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: targetIds,
          folderPath: folderPathToZip,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const contentDisposition = res.headers.get('content-disposition');
        let filename = 'FileVault_Bundle.zip';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];
        }
        triggerBrowserDownload(blob, filename);
        showToast('ZIP archive downloaded successfully!', 'success');
        return;
      }
    } catch (err: any) {
      // Server bulk zip failed -> fallback to client JSZip
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const allLocalRecords = await idbGetAllRecords();
      let filesToZip: FileRecord[] = [];

      if (targetIds && targetIds.length > 0) {
        const directRecords = allLocalRecords.filter((r) => targetIds.includes(r.id));
        for (const rec of directRecords) {
          if (rec.isFolder) {
            const folderFullPath = rec.folderPath ? `${rec.folderPath}/${rec.originalName}` : rec.originalName;
            const subFiles = allLocalRecords.filter(
              (r) => !r.isFolder && ((r.folderPath || '') === folderFullPath || (r.folderPath || '').startsWith(folderFullPath + '/'))
            );
            filesToZip.push(...subFiles);
          } else {
            filesToZip.push(rec);
          }
        }
      } else if (folderPathToZip !== undefined) {
        filesToZip = allLocalRecords.filter(
          (r) => !r.isFolder && ((r.folderPath || '') === folderPathToZip || (r.folderPath || '').startsWith(folderPathToZip ? folderPathToZip + '/' : ''))
        );
      }

      filesToZip = filesToZip.filter((f, idx, self) => self.findIndex((x) => x.id === f.id) === idx);

      let count = 0;
      for (const f of filesToZip) {
        let blob: Blob | null = null;
        try {
          const res = await fetch(`/api/files/${f.id}/download`);
          if (res.ok) blob = await res.blob();
        } catch (e) {}

        if (!blob) blob = await idbGetBlob(f.id);

        if (blob) {
          let entryPath = f.originalName;
          if (f.folderPath) entryPath = `${f.folderPath}/${f.originalName}`;
          zip.file(entryPath, blob);
          count++;
        }
      }

      if (count === 0) {
        showToast('No file content available to bundle into ZIP', 'error');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerBrowserDownload(zipBlob, `FileVault_Export_${Date.now()}.zip`);
      showToast('ZIP archive downloaded successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to create ZIP archive', 'error');
    }
  };

  const activeWallpaper = wallpaperSettings?.activeWallpaper;

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500 selection:text-white transition-colors overflow-x-hidden">
      
      {/* Dynamic Global Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-all duration-700 bg-slate-100 dark:bg-slate-950">
        {activeWallpaper?.isLive ? (
          <LiveWallpaperCanvas
            isLive={true}
            liveType={activeWallpaper.liveType}
            videoUrl={activeWallpaper.videoUrl}
            className="w-full h-full object-cover scale-105 transition-all duration-700"
            style={{
              filter: `blur(${activeWallpaper.blur || 0}px) brightness(${activeWallpaper.brightness ?? 0.85})`,
            }}
          />
        ) : activeWallpaper?.url ? (
          <img
            src={activeWallpaper.url}
            alt="Dynamic Server Wallpaper"
            className="w-full h-full object-cover transition-all duration-1000 scale-105"
            style={{
              filter: `blur(${activeWallpaper.blur || 0}px) brightness(${activeWallpaper.brightness ?? 0.85})`,
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 bg-slate-200/60 dark:bg-slate-950 transition-opacity duration-700"
          style={{ opacity: activeWallpaper?.overlayOpacity ?? 0.35 }}
        />
      </div>

      {/* Main Foreground Container */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between">
        <div>
          {/* Navbar */}
          <Navbar
            activePage={activePage}
            currentUser={currentUser}
            fileCount={files.length}
            showToast={showToast}
            onNavigate={(page) => setActivePage(page)}
            onLogout={handleLogout}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenCreateText={() => setIsCreateTextOpen(true)}
            onOpenCurl={() => setIsCurlOpen(true)}
            onRefresh={() => {
              fetchFiles();
              fetchStats();
              fetchWallpaperSettings();
            }}
            isRefreshing={isRefreshing}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
          />

          {/* Toast Alert */}
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-200 ${
                toast.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-700 dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-red-600 text-white border-red-700'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* PAGE ROUTING */}
          {activePage === 'login' && (
            <LoginPage
              currentUser={currentUser}
              onLoginSuccess={handleLoginSuccess}
              onContinueAsGuest={() => setActivePage('files')}
              showToast={showToast}
            />
          )}

          {activePage === 'wallpaper' && (
            currentUser?.role === 'administrator' ? (
              <WallpaperChangerPage
                currentUser={currentUser}
                wallpaperSettings={wallpaperSettings}
                onRefreshWallpaper={fetchWallpaperSettings}
                showToast={showToast}
              />
            ) : (
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <FileList
                  files={files}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  onDownload={handleDownloadFile}
                  onPreview={(f) => setPreviewingFile(f)}
                  onEdit={(f) => setEditingFile(f)}
                  onDelete={requestSingleDelete}
                  onBulkDelete={requestBulkDelete}
                  onBulkDownload={handleBulkDownload}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onQrCode={(f) => setQrCodeFile(f)}
                  currentUser={currentUser}
                  currentFolderPath={currentFolderPath}
                  setCurrentFolderPath={setCurrentFolderPath}
                />
              </main>
            )
          )}

          {activePage === 'users' && (
            currentUser?.role === 'administrator' ? (
              <UserControlPage
                currentUser={currentUser}
                showToast={showToast}
                onCurrentUserUpdated={(updatedUser) => {
                  setCurrentUser(updatedUser);
                  try {
                    localStorage.setItem('vault_user', JSON.stringify(updatedUser));
                  } catch (e) {}
                }}
              />
            ) : (
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <FileList
                  files={files}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  onDownload={handleDownloadFile}
                  onPreview={(f) => setPreviewingFile(f)}
                  onEdit={(f) => setEditingFile(f)}
                  onDelete={requestSingleDelete}
                  onBulkDelete={requestBulkDelete}
                  onBulkDownload={handleBulkDownload}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onQrCode={(f) => setQrCodeFile(f)}
                  currentUser={currentUser}
                  currentFolderPath={currentFolderPath}
                  setCurrentFolderPath={setCurrentFolderPath}
                />
              </main>
            )
          )}

          {activePage === 'files' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              
              {/* Storage Summary Card */}
              <StorageSummaryCard stats={stats} />

              {/* File Manager Section */}
              <FileList
                files={files}
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortOption={sortOption}
                setSortOption={setSortOption}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                onDownload={handleDownloadFile}
                onPreview={(f) => setPreviewingFile(f)}
                onEdit={(f) => setEditingFile(f)}
                onDelete={requestSingleDelete}
                onBulkDelete={requestBulkDelete}
                onBulkDownload={handleBulkDownload}
                onOpenUpload={() => setIsUploadOpen(true)}
                onQrCode={(f) => setQrCodeFile(f)}
                activeCategory={activeCategory}
                onSelectCategory={(cat) => {
                  setActiveCategory(cat as CategoryFilter);
                  setSelectedIds([]);
                }}
                stats={stats}
                currentUser={currentUser}
                onRefreshFiles={fetchFiles}
                showToast={showToast}
                currentFolderPath={currentFolderPath}
                setCurrentFolderPath={setCurrentFolderPath}
              />

            </main>
          )}
        </div>
      </div>

      {/* Floating persistent Watermark */}
      <div className="fixed bottom-3 right-3 z-50 pointer-events-none select-none opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 dark:bg-slate-900/90 text-white border border-slate-700/80 shadow-lg backdrop-blur-md text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="tracking-wider text-slate-200">akbar293838</span>
        </div>
      </div>

      {/* Modals */}
      <DropzoneModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentUser={currentUser}
        currentFolderPath={currentFolderPath}
        onUploadSuccess={() => {
          showToast('Files uploaded successfully');
          fetchFiles();
          fetchStats();
        }}
      />

      <CreateTextModal
        isOpen={isCreateTextOpen}
        onClose={() => setIsCreateTextOpen(false)}
        currentUser={currentUser}
        currentFolderPath={currentFolderPath}
        onCreated={() => {
          showToast('File created successfully');
          fetchFiles();
          fetchStats();
        }}
      />

      <EditFileModal
        file={editingFile}
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        onSave={() => {
          showToast('File details updated');
          fetchFiles();
        }}
      />

      <FilePreviewModal
        file={previewingFile}
        isOpen={!!previewingFile}
        onClose={() => setPreviewingFile(null)}
        onDownload={handleDownloadFile}
        onDelete={requestSingleDelete}
        onQrCode={(f) => setQrCodeFile(f)}
      />

      <QRCodeModal
        file={qrCodeFile}
        isOpen={!!qrCodeFile}
        onClose={() => setQrCodeFile(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.bulk ? "Delete Selected Files?" : "Delete File?"}
        message={`Are you sure you want to delete ${deleteTarget?.name || 'this item'}? This action cannot be undone.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmExecutionDelete}
      />

      <CurlGeneratorModal
        isOpen={isCurlOpen}
        onClose={() => setIsCurlOpen(false)}
        files={files}
      />

    </div>
  );
}

