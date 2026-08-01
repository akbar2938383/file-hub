import React from 'react';
import { HardDrive, Upload, FileCode, RefreshCw, Terminal, FolderPlus } from 'lucide-react';

interface Props {
  onOpenUpload: () => void;
  onOpenCreateText: () => void;
  onOpenCurl: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<Props> = ({
  onOpenUpload,
  onOpenCreateText,
  onOpenCurl,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-slate-900 dark:text-slate-100 leading-tight">
              File Vault & Transfer
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Server Storage Connected</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="refresh-files-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh files"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            id="curl-maker-btn"
            onClick={onOpenCurl}
            className="px-3 py-2 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-500/20"
            title="Generate cURL terminal commands"
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden sm:inline">cURL Maker</span>
          </button>

          <button
            id="create-text-file-btn"
            onClick={onOpenCreateText}
            className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80"
          >
            <FileCode className="w-4 h-4 text-cyan-500" />
            <span className="hidden sm:inline">New Text / Code</span>
          </button>

          <button
            id="upload-files-main-btn"
            onClick={onOpenUpload}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Upload / Folder</span>
          </button>
        </div>

      </div>
    </header>
  );
};
