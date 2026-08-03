import React, { useState } from 'react';
import { FileCode, X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { User } from '../types';
import { idbSaveRecord, idbSaveBlob } from '../lib/idb';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentUser?: User | null;
  currentFolderPath?: string;
}

export const CreateTextModal: React.FC<Props> = ({ isOpen, onClose, onCreated, currentUser, currentFolderPath }) => {
  const [title, setTitle] = useState('');
  const [extension, setExtension] = useState('txt');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('File title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser) {
        headers['x-username'] = currentUser.username;
        headers['x-user-role'] = currentUser.role;
      }

      const res = await fetch('/api/files/create-text', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          extension,
          content,
          description: description.trim(),
          folderPath: currentFolderPath || '',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create file');
      }

      const resData = await res.json();
      if (resData.file) {
        await idbSaveRecord(resData.file);
        const textBlob = new Blob([content], { type: 'text/plain' });
        await idbSaveBlob(resData.file.id, textBlob);
      }

      setIsLoading(false);
      setTitle('');
      setContent('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error creating file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-600 rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Create Text / Code File</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Write text, code, or markdown directly on server</p>
            </div>
          </div>
          <button
            id="close-text-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. notes, script, index"
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Extension</label>
              <select
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="txt">.txt</option>
                <option value="md">.md</option>
                <option value="json">.json</option>
                <option value="js">.js</option>
                <option value="ts">.ts</option>
                <option value="html">.html</option>
                <option value="css">.css</option>
                <option value="py">.py</option>
                <option value="csv">.csv</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Note (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short memo about this file"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Type or paste your text/code here..."
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              className="px-5 py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create File</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
