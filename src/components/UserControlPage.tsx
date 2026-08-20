import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Users, UserPlus, ShieldCheck, UserCheck, Trash2, Edit3, Key, Lock, CheckCircle2, AlertCircle, X, ShieldAlert, Sparkles, Clock, Camera } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { PfpChangerModal } from './PfpChangerModal';

interface Props {
  currentUser: User | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onCurrentUserUpdated?: (user: User) => void;
}

export const UserControlPage: React.FC<Props> = ({ currentUser, showToast, onCurrentUserUpdated }) => {
  const isAdmin = currentUser?.role === 'administrator';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New User Form Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'administrator' | 'normal'>('normal');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'normal'>('normal');
  const [editPassword, setEditPassword] = useState('');

  // PFP Changer Modal State
  const [pfpTargetUser, setPfpTargetUser] = useState<User | null>(null);

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Restore from localStorage backup if present
      let savedUsersRaw = localStorage.getItem('vault_persistent_users');
      if (savedUsersRaw) {
        try {
          const savedUsers = JSON.parse(savedUsersRaw);
          if (Array.isArray(savedUsers) && savedUsers.length > 0) {
            await fetch('/api/users/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ users: savedUsers }),
            });
          }
        } catch (e) {
          console.error('Sync error:', e);
        }
      }

      const res = await fetch('/api/users');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data) setUsers(data);
        }
      }
    } catch (err) {
      showToast('Failed to load user list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName || newUsername,
          role: newRole,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      // Save to localStorage persistent backup
      if (data.record) {
        try {
          const existingRaw = localStorage.getItem('vault_persistent_users');
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          const updated = [...existing.filter((u: any) => u.username !== data.record.username), data.record];
          localStorage.setItem('vault_persistent_users', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
      }

      showToast(`User @${data.user.username} created successfully`, 'success');
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error creating user', 'error');
    }
  };

  // Update user handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName,
          role: editRole,
          password: editPassword || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      // Update in localStorage
      try {
        const existingRaw = localStorage.getItem('vault_persistent_users');
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          const updated = existing.map((u: any) => {
            if (u.id === editingUser.id || u.username === editingUser.username) {
              return {
                ...u,
                fullName: editFullName || u.fullName,
                role: editRole || u.role,
                ...(editPassword ? { password: editPassword } : {}),
              };
            }
            return u;
          });
          localStorage.setItem('vault_persistent_users', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Error updating localStorage:', e);
      }

      showToast(`User @${editingUser.username} updated`, 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error updating user', 'error');
    }
  };

  // Delete user handler
  const handlePromptDeleteUser = (targetUser: User) => {
    if (targetUser.username === 'akbar293838' || targetUser.username === 'admin' || targetUser.id === 'user-admin-1') {
      showToast('Cannot delete primary System Administrator account', 'error');
      return;
    }
    setUserToDelete(targetUser);
  };

  const handleExecuteDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      // Remove from localStorage
      try {
        const existingRaw = localStorage.getItem('vault_persistent_users');
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          const updated = existing.filter((u: any) => u.id !== userToDelete.id && u.username !== userToDelete.username);
          localStorage.setItem('vault_persistent_users', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Error deleting from localStorage:', e);
      }

      showToast(`User @${userToDelete.username} deleted successfully`, 'success');
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error deleting user', 'error');
      setUserToDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-slate-900/90 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border border-slate-800 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Privileges Active</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              User Control & Access Panel
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Manage system accounts, assign administrator roles, reset credentials, and audit access permissions across the system.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Account</span>
            </button>
          )}
        </div>
      </div>


      {/* Users Roster Grid */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Registered System Users ({users.length})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const isUserAdmin = u.role === 'administrator';
            const isSelf = currentUser?.id === u.id;

            return (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => (isAdmin || isSelf) && setPfpTargetUser(u)}
                        className={`relative group cursor-pointer ${
                          isAdmin || isSelf ? 'hover:opacity-90' : ''
                        }`}
                        title={isAdmin || isSelf ? 'Click to change profile picture' : ''}
                      >
                        <img
                          src={u.avatar}
                          alt={u.fullName}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.username)}&background=3b82f6&color=fff`;
                          }}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        {(isAdmin || isSelf) && (
                          <div className="absolute inset-0 bg-slate-900/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          {u.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          @{u.username} {isSelf && <span className="text-blue-500 font-bold">(You)</span>}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
                        isUserAdmin
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {isUserAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      <span>{isUserAdmin ? 'Admin' : 'Normal'}</span>
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span>Created Date:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Active:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 justify-end">
                  {(isAdmin || isSelf) && (
                    <button
                      onClick={() => setPfpTargetUser(u)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change PFP</span>
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditFullName(u.fullName);
                          setEditRole(u.role);
                          setEditPassword('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Role</span>
                      </button>

                      {u.username !== 'akbar293838' && u.username !== 'admin' && u.id !== 'user-admin-1' && (
                        <button
                          onClick={() => handlePromptDeleteUser(u)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Add New System User
              </h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. sarah_admin"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Assign password"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned User Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal User (Standard Storage Access)</option>
                  <option value="administrator">Administrator (Full Control & Wallpaper Control)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-600 rounded-xl shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Edit User @{editingUser.username}
              </h3>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  User Role
                </label>
                <select
                  value={editRole}
                  disabled={editingUser.username === 'admin'}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="administrator">Administrator</option>
                  <option value="normal">Normal User</option>
                </select>
                {editingUser.username === 'admin' && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    Primary Administrator role cannot be demoted.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={userToDelete !== null}
        title="Delete User Account"
        message={`Are you sure you want to delete user @${userToDelete?.username || ''}? This action cannot be undone.`}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleExecuteDeleteUser}
      />

      {/* PFP Changer Modal */}
      {pfpTargetUser && (
        <PfpChangerModal
          isOpen={pfpTargetUser !== null}
          targetUser={pfpTargetUser}
          onClose={() => setPfpTargetUser(null)}
          onAvatarUpdated={(updatedUser) => {
            fetchUsers();
            if (currentUser && currentUser.id === updatedUser.id) {
              onCurrentUserUpdated?.(updatedUser);
            }
          }}
          showToast={showToast}
        />
      )}

    </div>
  );
};
