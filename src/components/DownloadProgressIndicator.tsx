import React from 'react';
import { DownloadTask } from '../types';
import { formatBytes } from '../utils/formatters';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Archive, 
  Code, 
  Folder, 
  HardDrive,
  Zap
} from 'lucide-react';

interface Props {
  tasks: DownloadTask[];
  onCancelTask: (taskId: string) => void;
  onDismissTask: (taskId: string) => void;
}

export const DownloadProgressIndicator: React.FC<Props> = ({
  tasks,
  onCancelTask,
  onDismissTask,
}) => {
  if (!tasks || tasks.length === 0) return null;

  const getFileIcon = (category?: string) => {
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
      case 'folder':
        return <Folder className="w-4 h-4 text-amber-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <HardDrive className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div 
      id="download-progress-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed';
        const isError = task.status === 'error';
        const isCancelled = task.status === 'cancelled';
        const isCompressing = task.status === 'compressing';
        const isDownloading = task.status === 'downloading' || task.status === 'starting';

        return (
          <div
            key={task.id}
            id={`download-progress-card-${task.id}`}
            className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 overflow-hidden"
          >
            {/* Header: Icon, File Name, Percent/Status, Cancel Button */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                  {getFileIcon(task.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
                      title={task.fileName}
                    >
                      {task.fileName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {isDownloading && (
                      <>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Streaming...
                        </span>
                        {task.speed && (
                          <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300 font-mono">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {task.speed}
                          </span>
                        )}
                      </>
                    )}
                    {isCompressing && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Archiving folder...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Download finished
                      </span>
                    )}
                    {isError && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {task.errorMessage || 'Download failed'}
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-slate-500 font-medium">Cancelled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress percentage pill & Close/Cancel */}
              <div className="flex items-center gap-2 shrink-0">
                <span 
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                    isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isError
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      : isCancelled
                      ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  }`}
                >
                  {isCompleted ? '100%' : `${Math.min(100, Math.max(0, task.progress))}%`}
                </span>

                {/* Cancel or Dismiss Button */}
                {(isDownloading || isCompressing) ? (
                  <button
                    id={`cancel-download-btn-${task.id}`}
                    onClick={() => onCancelTask(task.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Cancel download stream"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    id={`dismiss-download-btn-${task.id}`}
                    onClick={() => onDismissTask(task.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Stream Progress Bar */}
            <div className="space-y-1.5 mt-2">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-200 ease-out ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isError
                      ? 'bg-red-500'
                      : isCancelled
                      ? 'bg-slate-400'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(isDownloading && task.progress === 0 ? 5 : 0, task.progress))}%` }}
                />
              </div>

              {/* Bytes and Remaining Size stats */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <span>
                  {task.loadedBytes > 0 
                    ? formatBytes(task.loadedBytes) 
                    : (task.totalBytes > 0 ? '0 Bytes' : 'Streaming...')}
                  {task.totalBytes > 0 && ` / ${formatBytes(task.totalBytes)}`}
                </span>
                <span>
                  {isCompleted
                    ? 'Saved to disk'
                    : isError
                    ? 'Failed'
                    : isCancelled
                    ? 'Aborted'
                    : `${Math.round(task.progress)}% completed`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
