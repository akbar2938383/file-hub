import React from 'react';
import { StorageStats } from '../types';
import { formatBytes } from '../utils/formatters';
import { HardDrive, Download } from 'lucide-react';

interface Props {
  stats: StorageStats | null;
}

export const StorageSummaryCard: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;

  const serverCapacity = stats.serverCapacityBytes || (30 * 1024 * 1024 * 1024);
  const usedPercent = Math.min(100, Math.round((stats.totalSize / serverCapacity) * 100));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans">Server Storage</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {stats.totalFiles} file{stats.totalFiles === 1 ? '' : 's'} stored &bull; <strong className="text-blue-600 dark:text-blue-400">{formatBytes(stats.totalSize)}</strong> / {formatBytes(serverCapacity)}
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
    </div>
  );
};

