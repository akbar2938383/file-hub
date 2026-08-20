import React, { useState, useMemo } from 'react';
import { FileRecord, User } from '../types';
import { isFileAdminOnly, isFileAdminProtected } from '../utils/fileGuards';
import { Folder, FolderPlus, FolderOpen, Home, ChevronRight, Search, X, Check, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemsToMove: FileRecord[];
  allFiles: FileRecord[];
  currentUser?: User | null;
  currentFolderPath?: string;
  onConfirmMove: (targetFolderPath: string) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  onRefreshFiles?: () => void;
}

export const MoveToFolderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  itemsToMove,
  allFiles,
  currentUser,
  currentFolderPath = '',
  onConfirmMove,
  showToast,
  onRefreshFiles,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>(currentFolderPath);
  const [searchFilter, setSearchFilter] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderAdminOnly, setIsNewFolderAdminOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUserAdmin = currentUser?.role === 'administrator';

  // Normalize path helper
  const normalize = (p: string | undefined | null) =>
    (p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  // Extract all unique folder objects and full paths
  const folderList = useMemo(() => {
    const folders = allFiles.filter((f) => f.isFolder || f.category === 'folder');
    
    // Build full paths
    const fullFolderMap = new Map<string, { record: FileRecord; fullPath: string; level: number }>();

    folders.forEach((f) => {
      const parent = normalize(f.folderPath);
      const fullPath = parent ? `${parent}/${f.originalName}` : f.originalName;
      const level = fullPath.split('/').length;
      fullFolderMap.set(fullPath.toLowerCase(), { record: f, fullPath, level });
    });

    const list = Array.from(fullFolderMap.values());
    list.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    return list;
  }, [allFiles]);

  // Set of invalid destination paths (cannot move folder into itself or its descendants)
  const invalidDestinationPaths = useMemo(() => {
    const invalidSet = new Set<string>();

    itemsToMove.forEach((item) => {
      if (item.isFolder || item.category === 'folder') {
        const parent = normalize(item.folderPath);
        const itemFullPath = parent ? `${parent}/${item.originalName}` : item.originalName;
        const normalizedItemFull = itemFullPath.toLowerCase();

        // Exact folder cannot be target
        invalidSet.add(normalizedItemFull);

        // Any descendant path cannot be target
        folderList.forEach(({ fullPath }) => {
          const normFull = fullPath.toLowerCase();
          if (normFull === normalizedItemFull || normFull.startsWith(`${normalizedItemFull}/`)) {
            invalidSet.add(normFull);
          }
        });
      }
    });

    return invalidSet;
  }, [itemsToMove, folderList]);

  // Filter folders by search
  const filteredFolders = useMemo(() => {
    if (!searchFilter.trim()) return folderList;
    const term = searchFilter.toLowerCase().trim();
    return folderList.filter((f) =>
      f.fullPath.toLowerCase().includes(term) || f.record.originalName.toLowerCase().includes(term)
    );
  }, [folderList, searchFilter]);

  if (!isOpen) return null;

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'normal',
          'x-username': currentUser?.username || 'public',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderPath: selectedTarget,
          uploadedByRole: currentUser?.role || 'normal',
          isAdminOnly: isUserAdmin ? isNewFolderAdminOnly : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');

      showToast?.('Folder created successfully!', 'success');
      const createdFolderParent = selectedTarget ? `${selectedTarget}/${newFolderName.trim()}` : newFolderName.trim();
      setSelectedTarget(createdFolderParent);
      setNewFolderName('');
      setIsNewFolderAdminOnly(false);
      setIsCreatingFolder(false);
      onRefreshFiles?.();
    } catch (err: any) {
      showToast?.(err.message || 'Error creating folder', 'error');
    }
  };

  const handleMoveSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmMove(selectedTarget);
      onClose();
    } catch (err: any) {
      showToast?.(err.message || 'Failed to move items', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div
        id="move-to-folder-modal"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Move {itemsToMove.length} Item{itemsToMove.length === 1 ? '' : 's'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                Select target destination folder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-colors shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Inline Create Folder Form */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateNewFolder}
            className="p-3 bg-amber-500/5 border-b border-amber-500/20 flex flex-col gap-2 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-medium">
              <span>Create new folder inside: <strong className="underline">{selectedTarget ? `/${selectedTarget}` : 'Root Vault'}</strong></span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                autoFocus
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Create
              </button>
            </div>
            {isUserAdmin && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isNewFolderAdminOnly}
                  onChange={(e) => setIsNewFolderAdminOnly(e.target.checked)}
                  className="rounded text-blue-600 w-3.5 h-3.5"
                />
                <span>Restrict folder to Admin Only</span>
              </label>
            )}
          </form>
        )}

        {/* Folder List / Directory Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Root Vault Option */}
          <div
            onClick={() => setSelectedTarget('')}
            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
              selectedTarget === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Home className={`w-4 h-4 shrink-0 ${selectedTarget === '' ? 'text-white' : 'text-blue-500'}`} />
              <div className="min-w-0">
                <span className="font-semibold text-xs block truncate">Root Vault (/)</span>
                <span className={`text-[10px] block ${selectedTarget === '' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Top-level directory
                </span>
              </div>
            </div>
            {selectedTarget === '' && <Check className="w-4 h-4 text-white shrink-0" />}
          </div>

          {/* Subfolders */}
          {filteredFolders.map(({ record, fullPath, level }) => {
            const isSelected = normalize(selectedTarget).toLowerCase() === fullPath.toLowerCase();
            const isInvalidTarget = invalidDestinationPaths.has(fullPath.toLowerCase());
            const isAdminOnly = isFileAdminOnly(record, allFiles);
            const isRestrictedForUser = isAdminOnly && !isUserAdmin;
            const isDisabled = isInvalidTarget || isRestrictedForUser;

            return (
              <div
                key={record.id}
                onClick={() => {
                  if (!isDisabled) {
                    setSelectedTarget(fullPath);
                  }
                }}
                style={{ paddingLeft: `${Math.min(level * 14 + 10, 80)}px` }}
                className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40 text-slate-400'
                    : isSelected
                    ? 'bg-blue-600 text-white shadow-sm cursor-pointer'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs truncate">{record.originalName}</span>
                      {isAdminOnly && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-semibold flex items-center gap-0.5 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          <Lock className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] block truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      /{fullPath}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isInvalidTarget && (
                    <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> (Source)
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            );
          })}

          {filteredFolders.length === 0 && searchFilter && (
            <div className="text-center py-6 text-xs text-slate-400">
              No matching folders found for "{searchFilter}"
            </div>
          )}
        </div>

        {/* Selected Target Summary & Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 w-full sm:w-auto truncate">
            <span>Destination: </span>
            <strong className="text-slate-900 dark:text-slate-100 font-semibold underline">
              {selectedTarget ? `/${selectedTarget}` : 'Root Vault (/)'}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-move-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleMoveSubmit}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Move Here</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
