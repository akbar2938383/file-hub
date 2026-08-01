import React from 'react';
import { StorageStats } from '../types';
import { formatBytes } from '../utils/formatters';
import { HardDrive, Download, FileText, Image, Film, Music, Archive, Code, Layers } from 'lucide-react';

interface Props {
  stats: StorageStats | null;
  onSelectCategory: (cat: string) => void;
  activeCategory: string;
}

export const StorageSummaryCard: React.FC<Props> = ({ stats, onSelectCategory, activeCategory }) => {
  if (!stats) return null;

  const MAX_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB simulated threshold
  const usedPercent = Math.min(100, Math.round((stats.totalSize / MAX_STORAGE_LIMIT) * 100));

  const categories = [
    { key: 'all', label: 'All Files', icon: Layers, count: stats.totalFiles, size: stats.totalSize, color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200' },
    { key: 'image', label: 'Images', icon: Image, count: stats.categoryBreakdown?.image?.count || 0, size: stats.categoryBreakdown?.image?.size || 0, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { key: 'document', label: 'Documents', icon: FileText, count: stats.categoryBreakdown?.document?.count || 0, size: stats.categoryBreakdown?.document?.size || 0, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
    { key: 'video', label: 'Videos', icon: Film, count: stats.categoryBreakdown?.video?.count || 0, size: stats.categoryBreakdown?.video?.size || 0, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400' },
    { key: 'audio', label: 'Audio', icon: Music, count: stats.categoryBreakdown?.audio?.count || 0, size: stats.categoryBreakdown?.audio?.size || 0, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-400' },
    { key: 'code', label: 'Code', icon: Code, count: stats.categoryBreakdown?.code?.count || 0, size: stats.categoryBreakdown?.code?.size || 0, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400' },
    { key: 'archive', label: 'Archives', icon: Archive, count: stats.categoryBreakdown?.archive?.count || 0, size: stats.categoryBreakdown?.archive?.size || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-10 font-sans">Server Storage</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {stats.totalFiles} file{stats.totalFiles === 1 ? '' : 's'} stored • {formatBytes(stats.totalSize)} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <Download className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Downloads</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stats.totalDownloads}</div>
            </div>
          </div>

          <div className="min-w-[180px]">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Used Space</span>
              <span>{usedPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(usedPercent, 2)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="pt-5 flex flex-wrap gap-2.5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              id={`category-filter-${cat.key}`}
              onClick={() => onSelectCategory(cat.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm scale-[1.02]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
