import React, { useState } from 'react';
import { FileRecord } from '../types';
import { Terminal, Copy, Check, X, Code2, Download, Upload, Trash2, HardDrive, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: FileRecord[];
}

export const CurlGeneratorModal: React.FC<Props> = ({ isOpen, onClose, files }) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || '');
  const [selectedAction, setSelectedAction] = useState<'upload' | 'download' | 'list' | 'createText' | 'stats' | 'delete'>('download');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const activeFile = files.find((f) => f.id === selectedFileId) || files[0];
  const fileIdPlaceholder = activeFile ? activeFile.id : 'FILE_ID_HERE';
  const fileNamePlaceholder = activeFile ? activeFile.originalName : 'filename.txt';

  const generateCommand = () => {
    switch (selectedAction) {
      case 'download':
        return `curl -O -J "${baseUrl}/api/files/${fileIdPlaceholder}/download"`;
      case 'upload':
        return `curl -X POST -F "files=@/path/to/local/file.ext" "${baseUrl}/api/files/upload"`;
      case 'list':
        return `curl -s "${baseUrl}/api/files" | jq .`;
      case 'createText':
        return `curl -X POST "${baseUrl}/api/files/create-text" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "server_notes",\n    "extension": "txt",\n    "content": "Created using cURL terminal command!\\nHello Server!",\n    "description": "Uploaded via CLI"\n  }'`;
      case 'stats':
        return `curl -s "${baseUrl}/api/files/stats" | jq .`;
      case 'delete':
        return `curl -X DELETE "${baseUrl}/api/files/${fileIdPlaceholder}"`;
      default:
        return '';
    }
  };

  const command = generateCommand();

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">cURL Command Maker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generate terminal commands to upload, download, or manage files</p>
            </div>
          </div>
          <button
            id="close-curl-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Action Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Select Command Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction('download')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'download'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Download className="w-4 h-4" /> Download File
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('upload')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'upload'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload File
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('list')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'list'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-4 h-4" /> List Files (JSON)
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('createText')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'createText'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-4 h-4" /> Create Note via API
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('stats')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'stats'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <HardDrive className="w-4 h-4" /> Storage Stats
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('delete')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedAction === 'delete'
                    ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Trash2 className="w-4 h-4" /> Delete File
              </button>
            </div>
          </div>

          {/* File Target Picker for file-specific actions */}
          {(selectedAction === 'download' || selectedAction === 'delete') && files.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Target File</label>
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.originalName} ({f.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Output Console Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                Terminal Snippet
              </span>
              <button
                id="copy-curl-cmd"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy cURL'}</span>
              </button>
            </div>

            <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed select-all">
              <pre>{command}</pre>
            </div>
          </div>

          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Paste these commands directly into macOS Terminal, Linux Bash, or Windows PowerShell / Command Prompt to interact with your server files directly via HTTP API.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
