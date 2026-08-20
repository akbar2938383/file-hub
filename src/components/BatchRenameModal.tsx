import React, { useState, useMemo } from 'react';
import { FileRecord, User } from '../types';
import { canPerformFileAction } from '../utils/fileGuards';
import {
  Sparkles,
  X,
  Check,
  Loader2,
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  HardDrive,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Hash,
  CaseSensitive,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: FileRecord[];
  allFiles: FileRecord[];
  currentUser: User | null;
  onRenameSuccess: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

type RenameMode = 'pattern' | 'replace' | 'numbering' | 'case';

export const BatchRenameModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedFiles,
  allFiles,
  currentUser,
  onRenameSuccess,
  showToast,
}) => {
  const [mode, setMode] = useState<RenameMode>('pattern');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [numberingStart, setNumberingStart] = useState(1);
  const [numberingDigits, setNumberingDigits] = useState(2); // 1 = 1, 2 = 01, 3 = 001
  const [numberingStyle, setNumberingStyle] = useState<'suffix' | 'prefix' | 'paren'>('suffix');
  const [caseType, setCaseType] = useState<'lower' | 'upper' | 'title' | 'kebab' | 'snake'>('lower');
  const [preserveExtension, setPreserveExtension] = useState(true);
  const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize active item IDs when modal opens or selection changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveItemIds(selectedFiles.map((f) => f.id));
      setError(null);
    }
  }, [isOpen, selectedFiles]);

  const splitFileName = (fullName: string, isFolder: boolean) => {
    if (isFolder || !preserveExtension) {
      return { base: fullName, ext: '' };
    }
    const lastDot = fullName.lastIndexOf('.');
    if (lastDot <= 0) {
      return { base: fullName, ext: '' };
    }
    return {
      base: fullName.slice(0, lastDot),
      ext: fullName.slice(lastDot),
    };
  };

  const applyCaseConversion = (str: string, type: 'lower' | 'upper' | 'title' | 'kebab' | 'snake'): string => {
    switch (type) {
      case 'lower':
        return str.toLowerCase();
      case 'upper':
        return str.toUpperCase();
      case 'title':
        return str.replace(/\b\w/g, (c) => c.toUpperCase());
      case 'kebab':
        return str
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/[\s_]+/g, '-')
          .toLowerCase();
      case 'snake':
        return str
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[\s-]+/g, '_')
          .toLowerCase();
      default:
        return str;
    }
  };

  // Calculate transformed filenames for all selected files
  const previewItems = useMemo(() => {
    let indexCounter = numberingStart;

    return selectedFiles.map((file) => {
      const isSelected = activeItemIds.includes(file.id);
      const isFolder = file.isFolder || file.category === 'folder';
      const isProtected = !canPerformFileAction('edit', file, currentUser, allFiles);

      const { base, ext } = splitFileName(file.originalName, isFolder);
      let newBase = base;

      if (mode === 'pattern') {
        newBase = `${prefix}${base}${suffix}`;
      } else if (mode === 'replace') {
        if (findText) {
          try {
            const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFind, matchCase ? 'g' : 'gi');
            newBase = base.replace(regex, replaceText);
          } catch (e) {
            newBase = base;
          }
        }
      } else if (mode === 'numbering') {
        const numStr = String(indexCounter).padStart(numberingDigits, '0');
        if (numberingStyle === 'suffix') {
          newBase = `${base}_${numStr}`;
        } else if (numberingStyle === 'prefix') {
          newBase = `${numStr}_${base}`;
        } else if (numberingStyle === 'paren') {
          newBase = `${base} (${numStr})`;
        }
        indexCounter++;
      } else if (mode === 'case') {
        newBase = applyCaseConversion(base, caseType);
      }

      // Clean invalid path characters
      let finalName = `${newBase}${ext}`.trim().replace(/[\/\\]/g, '');
      if (!finalName) finalName = file.originalName;

      const isChanged = finalName !== file.originalName;

      return {
        file,
        isSelected,
        isProtected,
        originalName: file.originalName,
        newName: finalName,
        isChanged,
        category: file.category,
        isFolder,
      };
    });
  }, [
    selectedFiles,
    activeItemIds,
    mode,
    prefix,
    suffix,
    findText,
    replaceText,
    matchCase,
    numberingStart,
    numberingDigits,
    numberingStyle,
    caseType,
    preserveExtension,
    currentUser,
    allFiles,
  ]);

  const itemsToRename = previewItems.filter((item) => item.isSelected && !item.isProtected && item.isChanged);
  const protectedCount = previewItems.filter((item) => item.isProtected).length;

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setActiveItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (activeItemIds.length === selectedFiles.length) {
      setActiveItemIds([]);
    } else {
      setActiveItemIds(selectedFiles.map((f) => f.id));
    }
  };

  const handleApplyRename = async () => {
    if (itemsToRename.length === 0) {
      setError('No eligible files to rename or no name changes detected.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      items: itemsToRename.map((item) => ({
        id: item.file.id,
        newName: item.newName,
      })),
    };

    try {
      const res = await fetch('/api/files/bulk-rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'normal',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to batch rename files');
      }

      showToast?.(`Successfully renamed ${itemsToRename.length} item(s)`, 'success');
      onRenameSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred during batch renaming');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category?: string, isFolder?: boolean) => {
    if (isFolder || category === 'folder') {
      return <Folder className="w-4 h-4 text-amber-500" />;
    }
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <Film className="w-4 h-4 text-purple-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-pink-500" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-amber-500" />;
      case 'code':
        return <Code className="w-4 h-4 text-cyan-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <HardDrive className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Batch Renaming Tool</span>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold">
                  {selectedFiles.length} Selected
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rename multiple files with prefix, suffix, replace, or sequence patterns
              </p>
            </div>
          </div>
          <button
            id="close-batch-rename-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              id="rename-mode-pattern"
              onClick={() => setMode('pattern')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'pattern'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prefix & Suffix</span>
            </button>

            <button
              id="rename-mode-replace"
              onClick={() => setMode('replace')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'replace'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find & Replace</span>
            </button>

            <button
              id="rename-mode-numbering"
              onClick={() => setMode('numbering')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'numbering'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Sequence</span>
            </button>

            <button
              id="rename-mode-case"
              onClick={() => setMode('case')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'case'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
              <span>Case</span>
            </button>
          </div>

          {/* Pattern Mode Inputs */}
          {mode === 'pattern' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prefix Pattern
                </label>
                <div className="relative">
                  <input
                    id="batch-rename-prefix-input"
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. 2026_ or DOC-"
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  {prefix && (
                    <button
                      onClick={() => setPrefix('')}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Prepended to the start of each filename</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Suffix Pattern
                </label>
                <div className="relative">
                  <input
                    id="batch-rename-suffix-input"
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. _final or _v2"
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  {suffix && (
                    <button
                      onClick={() => setSuffix('')}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Appended right before file extension</p>
              </div>
            </div>
          )}

          {/* Find & Replace Inputs */}
          {mode === 'replace' && (
            <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Find Text
                  </label>
                  <input
                    id="batch-rename-find-input"
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Search string..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Replace With
                  </label>
                  <input
                    id="batch-rename-replace-input"
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replacement string..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="match-case-toggle"
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="match-case-toggle" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  Match exact case (Case Sensitive)
                </label>
              </div>
            </div>
          )}

          {/* Numbering Sequence Inputs */}
          {mode === 'numbering' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Start Index
                </label>
                <input
                  id="batch-rename-start-index"
                  type="number"
                  min="0"
                  value={numberingStart}
                  onChange={(e) => setNumberingStart(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Digit Padding
                </label>
                <select
                  id="batch-rename-padding-select"
                  value={numberingDigits}
                  onChange={(e) => setNumberingDigits(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value={1}>1, 2, 3 (No padding)</option>
                  <option value={2}>01, 02, 03 (2 digits)</option>
                  <option value={3}>001, 002, 003 (3 digits)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Position Style
                </label>
                <select
                  id="batch-rename-style-select"
                  value={numberingStyle}
                  onChange={(e) => setNumberingStyle(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="suffix">Suffix (_01)</option>
                  <option value="prefix">Prefix (01_)</option>
                  <option value="paren">Parenthesis (1)</option>
                </select>
              </div>
            </div>
          )}

          {/* Case Conversion Inputs */}
          {mode === 'case' && (
            <div className="flex flex-wrap gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {[
                { type: 'lower', label: 'lowercase' },
                { type: 'upper', label: 'UPPERCASE' },
                { type: 'title', label: 'Title Case' },
                { type: 'kebab', label: 'kebab-case' },
                { type: 'snake', label: 'snake_case' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setCaseType(item.type as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    caseType === item.type
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* General Options Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300 font-medium">
              <input
                id="preserve-extension-toggle"
                type="checkbox"
                checked={preserveExtension}
                onChange={(e) => setPreserveExtension(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
              <span>Preserve file extensions (e.g. .png, .pdf)</span>
            </label>

            <button
              onClick={toggleSelectAll}
              className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 text-xs"
            >
              {activeItemIds.length === selectedFiles.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Select All ({selectedFiles.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Warning for Protected Items */}
          {protectedCount > 0 && currentUser?.role !== 'administrator' && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {protectedCount} item(s) are administrator-protected and will be skipped during rename.
              </span>
            </div>
          )}

          {/* Live Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
              <span>Live Pattern Preview</span>
              <span className="text-[11px] font-normal text-slate-500">
                {itemsToRename.length} of {selectedFiles.length} file(s) will be modified
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40">
              {previewItems.map((item) => (
                <div
                  key={item.file.id}
                  className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                    !item.isSelected || item.isProtected
                      ? 'opacity-45 bg-slate-100/40 dark:bg-slate-800/20'
                      : item.isChanged
                      ? 'bg-purple-500/5 hover:bg-purple-500/10'
                      : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={item.isProtected}
                      onClick={() => toggleItem(item.file.id)}
                      className="text-slate-400 hover:text-purple-600 disabled:cursor-not-allowed shrink-0"
                    >
                      {item.isSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700">
                      {getCategoryIcon(item.category, item.isFolder)}
                    </div>

                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <span className="text-slate-600 dark:text-slate-400 truncate font-mono text-[11px]" title={item.originalName}>
                        {item.originalName}
                      </span>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <ArrowRight className="w-3 h-3 text-purple-400 shrink-0 hidden sm:block" />
                        <span
                          className={`font-mono text-[11px] truncate font-semibold ${
                            item.isChanged
                              ? 'text-purple-700 dark:text-purple-300'
                              : 'text-slate-500'
                          }`}
                          title={item.newName}
                        >
                          {item.newName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {item.isProtected ? (
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-medium">
                        Protected
                      </span>
                    ) : item.isChanged ? (
                      <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded text-[10px] font-semibold">
                        Renaming
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Unchanged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
          <button
            id="cancel-batch-rename-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            id="confirm-batch-rename-btn"
            type="button"
            disabled={isLoading || itemsToRename.length === 0}
            onClick={handleApplyRename}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Renames...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Apply Batch Rename ({itemsToRename.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
