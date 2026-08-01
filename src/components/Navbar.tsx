import React from 'react';
import { User, ActivePage } from '../types';
import { HardDrive, Upload, FileCode, RefreshCw, Terminal, Image, Users, LogIn, LogOut, ShieldCheck, UserCheck, Folder } from 'lucide-react';

interface Props {
  activePage: ActivePage;
  currentUser: User | null;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  onOpenUpload: () => void;
  onOpenCreateText: () => void;
  onOpenCurl: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<Props> = ({
  activePage,
  currentUser,
  onNavigate,
  onLogout,
  onOpenUpload,
  onOpenCreateText,
  onOpenCurl,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Page Selector */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => onNavigate('files')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-tight">
                File Vault & Hub
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Global Wallpaper Live</span>
              </div>
            </div>
          </div>

          {/* Navigation Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => onNavigate('files')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activePage === 'files'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>

            <button
              onClick={() => onNavigate('wallpaper')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activePage === 'wallpaper'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Image className="w-3.5 h-3.5 text-cyan-500" />
              <span>Wallpapers</span>
            </button>

            <button
              onClick={() => onNavigate('users')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activePage === 'users'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">User Control</span>
            </button>
          </nav>
        </div>

        {/* Action Controls & User Account Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {activePage === 'files' && (
            <>
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
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors hidden lg:flex items-center gap-1.5 border border-emerald-500/20"
                title="Generate cURL terminal commands"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>cURL</span>
              </button>

              <button
                id="create-text-file-btn"
                onClick={onOpenCreateText}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-500" />
                <span>Text/Code</span>
              </button>

              <button
                id="upload-files-main-btn"
                onClick={onOpenUpload}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </>
          )}

          {/* User Account / Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div
                onClick={() => onNavigate('users')}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title={`Logged in as ${currentUser.fullName} (${currentUser.role})`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-500/30"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 truncate max-w-[100px]">
                    {currentUser.username}
                  </p>
                  <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">
                    {currentUser.role === 'administrator' ? 'Admin' : 'Normal'}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Roles</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

