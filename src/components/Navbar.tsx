import React from 'react';
import { User, ActivePage } from '../types';
import { HardDrive, Upload, FileCode, RefreshCw, Terminal, Image, Users, LogIn, LogOut, ShieldCheck, UserCheck, Folder } from 'lucide-react';

interface Props {
  activePage: ActivePage;
  currentUser: User | null;
  fileCount?: number;
  showToast?: (message: string, type?: 'success' | 'error') => void;
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
  fileCount = 0,
  showToast,
  onNavigate,
  onLogout,
  onOpenUpload,
  onOpenCreateText,
  onOpenCurl,
  onRefresh,
  isRefreshing,
}) => {
  const isCurlActive = currentUser !== null && fileCount >= 1;
  const isAdmin = currentUser?.role === 'administrator';

  const handleCurlClick = () => {
    if (!currentUser) {
      if (showToast) {
        showToast('Please sign in as User or Administrator to access cURL Maker.', 'error');
      }
      onNavigate('login');
      return;
    }

    if (fileCount < 1) {
      if (showToast) {
        showToast('Please upload at least 1 file to generate cURL terminal commands.', 'error');
      }
      if (activePage === 'files') {
        onOpenUpload();
      } else {
        onNavigate('files');
      }
      return;
    }

    onOpenCurl();
  };
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4 overflow-x-hidden">
        
        {/* Brand & Page Selector */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <div
            onClick={() => onNavigate('files')}
            className="hidden md:flex items-center gap-2 cursor-pointer group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-tight">
                  File Vault & Hub
                </h1>
                <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                  akbar293838
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Global Wallpaper Live</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] sm:text-xs font-semibold">
            <button
              onClick={() => onNavigate(currentUser ? 'files' : 'login')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 ${
                activePage === 'files'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              } ${!currentUser ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="Files Manager"
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span>Files</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => onNavigate('wallpaper')}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 ${
                    activePage === 'wallpaper'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Wallpapers"
                >
                  <Image className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="hidden xs:inline">Wallpapers</span>
                </button>

                <button
                  onClick={() => onNavigate('users')}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 ${
                    activePage === 'users'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Users Control"
                >
                  <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="hidden sm:inline">Users</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Action Controls & User Account Menu */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* cURL Command Maker Button */}
          <button
            id="curl-maker-btn"
            onClick={handleCurlClick}
            className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 cursor-pointer ${
              isCurlActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 border-emerald-500 active:scale-95'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}
            title={
              isCurlActive
                ? 'cURL Generator Ready! Click to create terminal commands'
                : !currentUser
                ? 'Sign in as User or Administrator to enable cURL Maker'
                : 'Upload 1 or more files to enable cURL Maker'
            }
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span>cURL<span className="hidden sm:inline"> Maker</span></span>
            {isCurlActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse hidden sm:inline-block" />
            )}
          </button>

          {activePage === 'files' && (
            <>
              <button
                id="refresh-files-btn"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh files"
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                id="create-text-file-btn"
                onClick={onOpenCreateText}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap shrink-0"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-500" />
                <span>Text/Code</span>
              </button>

              <button
                id="upload-files-main-btn"
                onClick={onOpenUpload}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </>
          )}

          {/* User Account / Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <div
                onClick={() => {
                  if (isAdmin) onNavigate('users');
                }}
                className={`flex items-center gap-1.5 p-1 rounded-xl transition-colors ${
                  isAdmin ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer' : ''
                }`}
                title={`Logged in as ${currentUser.fullName} (${currentUser.role})`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover ring-2 ring-blue-500/30 shrink-0"
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
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

