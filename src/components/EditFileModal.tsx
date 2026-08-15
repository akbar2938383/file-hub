import React, { useState, useEffect } from 'react';
import { FileRecord, User } from '../types';
import { canPerformFileAction } from '../utils/fileGuards';
import { Edit3, X, Tag, FileText, Check, Loader2, ShieldAlert, Lock } from 'lucide-react';

interface Props {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentUser?: User | null;
  allFiles?: FileRecord[];
}

export const EditFileModal: React.FC<Props> = ({ file, isOpen, onClose, onSave, currentUser, allFiles = [] }) => {
  const [originalName, setOriginalName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserAdmin = currentUser?.role === 'administrator';

  useEffect(() => {
    if (file) {
      setOriginalName(file.originalName);
      setDescription(file.description || '');
      setTagsInput(file.tags ? file.tags.join(', ') : '');
      setIsAdminOnly(file.isAdminOnly || false);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformFileAction('edit', file, currentUser, allFiles, (msg) => setError(msg))) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const tagsArr = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'normal',
          'x-username': currentUser?.username || 'public',
        },
        body: JSON.stringify({
          originalName: originalName.trim(),
          description: description.trim(),
          tags: tagsArr,
          ...(isUserAdmin ? { isAdminOnly } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update file');
      }

      setIsLoading(false);
      onSave();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Edit File Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rename or categorize file metadata</p>
            </div>
          </div>
          <button
            id="close-edit-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File Display Name</label>
            <input
              type="text"
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. work, receipt, v1"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add optional notes about this file"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Admin Only Toggle (visible for administrators) */}
          {isUserAdmin && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Admin Only Access</span>
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold rounded">
                      Restricted
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {file.isFolder
                      ? 'When active, this folder and all contained files are hidden from non-admin users'
                      : 'When active, only administrators can view or download this file'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="admin-only-edit-toggle"
                  checked={isAdminOnly}
                  onChange={(e) => setIsAdminOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
