import React, { useState, useEffect, useCallback } from 'react';
import { FileRecord, StorageStats, ViewMode, SortOption, CategoryFilter } from './types';
import { Navbar } from './components/Navbar';
import { StorageSummaryCard } from './components/StorageSummaryCard';
import { FileList } from './components/FileList';
import { DropzoneModal } from './components/DropzoneModal';
import { CreateTextModal } from './components/CreateTextModal';
import { EditFileModal } from './components/EditFileModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CurlGeneratorModal } from './components/CurlGeneratorModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCreateTextOpen, setIsCreateTextOpen] = useState<boolean>(false);
  const [isCurlOpen, setIsCurlOpen] = useState<boolean>(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [previewingFile, setPreviewingFile] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; bulk?: boolean; name?: string } | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
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
    setIsRefreshing(true);
    try {
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (activeCategory !== 'all') query.append('category', activeCategory);
      if (sortOption) query.append('sort', sortOption);

      const res = await fetch(`/api/files?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      showToast('Failed to load files from server', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, activeCategory, sortOption]);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const handleDownloadFile = (file: FileRecord) => {
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
    setDeleteTarget({ id, name: targetFile ? targetFile.originalName : 'this file' });
  };

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget({ bulk: true, name: `${selectedIds.length} selected file(s)` });
  };

  const confirmExecutionDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.bulk) {
      try {
        const res = await fetch('/api/files/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });

        if (!res.ok) throw new Error('Bulk delete failed');

        showToast(`${selectedIds.length} file(s) deleted successfully`);
        setSelectedIds([]);
        fetchFiles();
        fetchStats();
      } catch (err) {
        showToast('Failed to perform bulk delete', 'error');
      }
    } else if (deleteTarget.id) {
      try {
        const res = await fetch(`/api/files/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');

        showToast('File deleted successfully');
        setSelectedIds((prev) => prev.filter((i) => i !== deleteTarget.id));
        fetchFiles();
        fetchStats();
      } catch (err) {
        showToast('Failed to delete file', 'error');
      }
    }
  };

  const handleBulkDownload = () => {
    if (selectedIds.length === 0) return;
    const selectedFiles = files.filter((f) => selectedIds.includes(f.id));

    selectedFiles.forEach((f, idx) => {
      setTimeout(() => {
        handleDownloadFile(f);
      }, idx * 400);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCreateText={() => setIsCreateTextOpen(true)}
        onOpenCurl={() => setIsCurlOpen(true)}
        onRefresh={() => {
          fetchFiles();
          fetchStats();
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900'
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

        {/* Server Storage Summary & Category Bar */}
        <StorageSummaryCard
          stats={stats}
          onSelectCategory={(cat) => {
            setActiveCategory(cat as CategoryFilter);
            setSelectedIds([]);
          }}
          activeCategory={activeCategory}
        />

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
        />

      </main>

      {/* Modals */}
      <DropzoneModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          showToast('Files uploaded successfully');
          fetchFiles();
          fetchStats();
        }}
      />

      <CreateTextModal
        isOpen={isCreateTextOpen}
        onClose={() => setIsCreateTextOpen(false)}
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
