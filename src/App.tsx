import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileRecord, StorageStats, ViewMode, SortOption, CategoryFilter, User, ActivePage, WallpaperSettings } from './types';
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
      const res = await fetch('/api/files/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
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

      const res = await fetch(`/api/files?${query.toString()}`, {
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        if (Array.isArray(data)) {
          try {
            localStorage.setItem('vault_files_backup', JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled due to a newer request, ignore quietly
        return;
      }
      console.error('Error fetching files:', err);
      showToast('Failed to load files from server', 'error');
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearchTerm, activeCategory, sortOption]);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const handleDownloadFile = async (file: FileRecord) => {
    if (file.isFolder || file.category === 'folder') {
      showToast(`Compressing folder "${file.originalName}" into ZIP archive...`, 'success');
      try {
        const downloadUrl = `/api/files/${file.id}/download`;
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to download folder');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.originalName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setTimeout(() => {
          fetchFiles();
          fetchStats();
        }, 500);

        showToast(`Downloaded folder "${file.originalName}.zip"`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Error downloading folder archive', 'error');
      }
      return;
    }

    const downloadUrl = `/api/files/${file.id}/download`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Refresh stats & file list to update download count
    setTimeout(() => {
      fetchFiles();
      fetchStats();
    }, 500);

    showToast(`Downloading ${file.originalName}`);
  };

  const requestSingleDelete = (id: string) => {
    const targetFile = files.find((f) => f.id === id);
    if (targetFile?.uploadedByRole === 'administrator' && currentUser?.role !== 'administrator') {
      showToast('This file was uploaded by an Administrator and cannot be deleted by normal users.', 'error');
      return;
    }
    setDeleteTarget({ id, name: targetFile ? targetFile.originalName : 'this file' });
  };

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (currentUser?.role !== 'administrator') {
      const selectedFiles = files.filter((f) => selectedIds.includes(f.id));
      const adminCount = selectedFiles.filter((f) => f.uploadedByRole === 'administrator').length;
      if (adminCount === selectedFiles.length) {
        showToast('Selected file(s) were uploaded by Administrator and cannot be deleted by normal users.', 'error');
        return;
      }
    }
    setDeleteTarget({ bulk: true, name: `${selectedIds.length} selected file(s)` });
  };

  const confirmExecutionDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.bulk) {
      try {
        const res = await fetch('/api/files/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser?.role || 'normal',
          },
          body: JSON.stringify({ ids: selectedIds, userRole: currentUser?.role || 'normal' }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk delete failed');

        showToast(data.message || `${selectedIds.length} file(s) deleted successfully`);
        setSelectedIds([]);
        fetchFiles();
        fetchStats();
      } catch (err: any) {
        showToast(err.message || 'Failed to perform bulk delete', 'error');
      }
    } else if (deleteTarget.id) {
      try {
        const res = await fetch(`/api/files/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: {
            'x-user-role': currentUser?.role || 'normal',
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');

        showToast(data.message || 'File deleted successfully');
        setSelectedIds((prev) => prev.filter((i) => i !== deleteTarget.id));
        fetchFiles();
        fetchStats();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete file', 'error');
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate ZIP archive');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = res.headers.get('content-disposition');
      let filename = 'FileVault_Bundle.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('ZIP archive downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error downloading ZIP archive', 'error');
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

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-slate-200/40 dark:border-slate-800/40 text-center text-xs text-slate-500 dark:text-slate-400 backdrop-blur-md bg-white/20 dark:bg-slate-900/20">
          <p>
            File Vault Hub &bull; Logged in as:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Public Guest'}
            </strong>{' '}
            &bull; Watermark:{' '}
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">akbar293838</span>
          </p>
        </footer>
      </div>

      {/* Floating persistent Watermark */}
      <div className="fixed bottom-3 right-3 z-50 pointer-events-none select-none opacity-50 hover:opacity-100 transition-opacity">
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

