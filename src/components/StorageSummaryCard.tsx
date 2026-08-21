import React, { useState } from 'react';
import { StorageStats, User } from '../types';
import { formatBytes } from '../utils/formatters';
import { HardDrive, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  stats: StorageStats | null;
  currentUser?: User | null;
  onClearStorage?: () => Promise<void> | void;
}

export const StorageSummaryCard: React.FC<Props> = ({ stats, currentUser, onClearStorage }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!stats) return null;

  const serverCapacity = stats.serverCapacityBytes || (30 * 1024 * 1024 * 1024);
  const usedPercent = Math.min(100, Math.round((stats.totalSize / serverCapacity) * 100));
  const isUserAdmin = currentUser?.role === 'administrator';

  const handleConfirmClear = async () => {
    if (!onClearStorage) return;
    setIsClearing(true);
    try {
      await onClearStorage();
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans">Server Storage</h2>
              {isUserAdmin && onClearStorage && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg border border-rose-200 dark:border-rose-800/60 transition-colors inline-flex items-center gap-1.5"
                  title="Clear all stored files and reset storage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Files</span>
                </button>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.totalFiles} file{stats.totalFiles === 1 ? '' : 's'} stored
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <Download className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Downloads</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stats.totalDownloads}</div>
            </div>
          </div>

          <div className="min-w-[220px] flex-1 sm:flex-none">
            <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 gap-2">
              <span>Used Space ({formatBytes(stats.totalSize)} / {formatBytes(serverCapacity)})</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{usedPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(usedPercent, 1)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Clear All Server Storage?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              This will permanently delete all uploaded files, folders, and cached storage records on the server and reset storage to <strong className="text-slate-900 dark:text-slate-200">0 files (0 MB)</strong>. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-rose-600/20 inline-flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Clearing Storage...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Clear Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

