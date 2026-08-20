export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'image':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'document':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'video':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'audio':
      return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    case 'archive':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'code':
      return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
}
