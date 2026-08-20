import { FileRecord, User } from '../types';

export type FileInteractionAction =
  | 'download'
  | 'delete'
  | 'edit'
  | 'preview'
  | 'share'
  | 'select'
  | 'open'
  | 'qr'
  | 'cut'
  | 'move';

export interface GuardCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks if a file or any of its parent folders is flagged as Admin-Only.
 */
export function isFileAdminOnly(
  file: FileRecord | null | undefined,
  allFiles: FileRecord[] = []
): boolean {
  if (!file) return false;
  if (file.isAdminOnly) return true;
  if (!file.folderPath) return false;

  const parts = file.folderPath.split('/').filter(Boolean);
  let accum = '';
  for (let i = 0; i < parts.length; i++) {
    const parent = allFiles.find(
      (r) =>
        r.isFolder &&
        (r.folderPath || '') === accum &&
        r.originalName.toLowerCase() === parts[i].toLowerCase()
    );
    if (parent && parent.isAdminOnly) {
      return true;
    }
    accum = accum ? `${accum}/${parts[i]}` : parts[i];
  }
  return false;
}

/**
 * Checks if a file is protected from non-admin modifications or deletion
 * (either flagged as isAdminOnly, uploaded by an administrator, or nested in an admin folder).
 */
export function isFileAdminProtected(
  file: FileRecord | null | undefined,
  allFiles: FileRecord[] = []
): boolean {
  if (!file) return false;
  if (file.isAdminOnly) return true;
  if (file.uploadedByRole === 'administrator') return true;
  if (!file.folderPath) return false;

  const parts = file.folderPath.split('/').filter(Boolean);
  let accum = '';
  for (let i = 0; i < parts.length; i++) {
    const parent = allFiles.find(
      (r) =>
        r.isFolder &&
        (r.folderPath || '') === accum &&
        r.originalName.toLowerCase() === parts[i].toLowerCase()
    );
    if (parent && (parent.isAdminOnly || parent.uploadedByRole === 'administrator')) {
      return true;
    }
    accum = accum ? `${accum}/${parts[i]}` : parts[i];
  }
  return false;
}

/**
 * Core permission guard function for file interaction triggers.
 * Verifies currentUser.role before allowing file interaction triggers (download, delete, edit, preview, etc.).
 */
export function checkFileActionPermission(
  action: FileInteractionAction,
  file: FileRecord | null | undefined,
  currentUser?: User | null,
  allFiles: FileRecord[] = []
): GuardCheckResult {
  // Administrators have unrestricted access to all actions
  if (currentUser?.role === 'administrator') {
    return { allowed: true };
  }

  if (!file) {
    return { allowed: false, reason: 'File or folder target not found.' };
  }

  const adminOnly = isFileAdminOnly(file, allFiles);
  const adminProtected = isFileAdminProtected(file, allFiles);

  // If the file or folder is marked as Admin Only
  if (adminOnly) {
    switch (action) {
      case 'download':
        return {
          allowed: false,
          reason: 'Access restricted: Only administrators can download Admin Only files.',
        };
      case 'delete':
        return {
          allowed: false,
          reason: 'Access restricted: Files flagged as Admin Only cannot be deleted by members.',
        };
      case 'edit':
        return {
          allowed: false,
          reason: 'Access restricted: Only administrators can edit Admin Only files.',
        };
      case 'preview':
        return {
          allowed: false,
          reason: 'Access restricted: Only administrators can preview Admin Only files.',
        };
      case 'share':
        return {
          allowed: false,
          reason: 'Access restricted: Admin Only file links cannot be shared with members.',
        };
      case 'select':
        return {
          allowed: false,
          reason: 'Access restricted: Admin Only files cannot be selected for batch operations.',
        };
      case 'open':
        return {
          allowed: false,
          reason: 'Access restricted: Only administrators can open Admin Only folders.',
        };
      case 'qr':
        return {
          allowed: false,
          reason: 'Access restricted: Admin Only files cannot generate public QR codes.',
        };
      case 'cut':
      case 'move':
        return {
          allowed: false,
          reason: 'Access restricted: Admin Only files cannot be moved by members.',
        };
      default:
        return {
          allowed: false,
          reason: 'Access restricted: Only administrators have access to this item.',
        };
    }
  }

  // If the file was created/uploaded by an administrator, protect it from member delete and edit triggers
  if (adminProtected) {
    if (action === 'delete') {
      return {
        allowed: false,
        reason: 'Protected: Files created by administrators cannot be deleted by members.',
      };
    }
    if (action === 'edit') {
      return {
        allowed: false,
        reason: 'Protected: Files created by administrators cannot be modified by members.',
      };
    }
    if (action === 'select') {
      return {
        allowed: false,
        reason: 'Protected: Administrator files cannot be selected for deletion or modification.',
      };
    }
    if (action === 'cut' || action === 'move') {
      return {
        allowed: false,
        reason: 'Protected: Administrator files cannot be moved or cut by members.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Imperative helper that checks permission and optionally triggers a notification toast if blocked.
 * Returns true if action is allowed, false if blocked.
 */
export function canPerformFileAction(
  action: FileInteractionAction,
  file: FileRecord | null | undefined,
  currentUser?: User | null,
  allFiles: FileRecord[] = [],
  onBlocked?: (reason: string) => void
): boolean {
  const result = checkFileActionPermission(action, file, currentUser, allFiles);
  if (!result.allowed) {
    if (onBlocked && result.reason) {
      onBlocked(result.reason);
    }
    return false;
  }
  return true;
}

/**
 * Middleware wrapper function that guards any file interaction trigger.
 * If user does not have permission, execution is blocked and onBlocked is called.
 */
export function withFileGuard<Args extends any[], R>(
  action: FileInteractionAction,
  getFile: (...args: Args) => FileRecord | null | undefined,
  getCurrentUser: () => User | null | undefined,
  getAllFiles: () => FileRecord[],
  fn: (...args: Args) => R,
  onBlocked?: (reason: string) => void
): (...args: Args) => R | undefined {
  return (...args: Args): R | undefined => {
    const file = getFile(...args);
    const user = getCurrentUser();
    const allFiles = getAllFiles();

    const check = checkFileActionPermission(action, file, user, allFiles);
    if (!check.allowed) {
      if (onBlocked && check.reason) {
        onBlocked(check.reason);
      }
      return undefined;
    }

    return fn(...args);
  };
}
