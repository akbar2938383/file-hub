import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, Camera, Upload, Link, Check, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User;
  onAvatarUpdated: (updatedUser: User) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
];

export const PfpChangerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetUser,
  onAvatarUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(targetUser.avatar || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedPreset(null);
    }
  };

  const handleSaveAvatar = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === 'upload' && selectedFile) {
        // Submit via file upload endpoint
        const formData = new FormData();
        formData.append('avatar', selectedFile);

        const res = await fetch(`/api/users/${targetUser.id}/avatar`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update avatar');

        showToast('Profile picture updated successfully!', 'success');
        onAvatarUpdated(data.user);
        onClose();
      } else if (activeTab === 'preset' && selectedPreset) {
        // Submit via preset URL
        const res = await fetch(`/api/users/${targetUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: selectedPreset }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update avatar');

        showToast('Profile picture updated successfully!', 'success');
        onAvatarUpdated(data.user);
        onClose();
      } else if (activeTab === 'url' && customUrl.trim()) {
        // Submit via custom URL
        const res = await fetch(`/api/users/${targetUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: customUrl.trim() }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update avatar');

        showToast('Profile picture updated successfully!', 'success');
        onAvatarUpdated(data.user);
        onClose();
      } else {
        showToast('Please select an image or enter a valid URL', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating profile picture', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Change Profile Picture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updating profile picture for @{targetUser.username}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Section */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6">
          <div className="relative group">
            <img
              src={previewUrl || targetUser.avatar}
              alt="Avatar Preview"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.fullName || targetUser.username)}&background=3b82f6&color=fff`;
              }}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-lg border border-slate-200 dark:border-slate-700"
            />
            <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {targetUser.fullName}
            </h4>
            <span className="inline-block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              @{targetUser.username}
            </span>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Preview
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'preset'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Preset Avatars</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4 flex-1">
          {activeTab === 'upload' && (
            <div className="text-center space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer hover:bg-blue-500/5 transition-all"
              >
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Click to select a custom avatar photo
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, WEBP, GIF (Max 10MB)
                </p>
              </div>
              {selectedFile && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Selected file: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {activeTab === 'preset' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Choose a high-resolution avatar preset:
              </p>
              <div className="grid grid-cols-4 gap-3 max-h-52 overflow-y-auto p-1">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(url);
                      setPreviewUrl(url);
                      setSelectedFile(null);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                      selectedPreset === url
                        ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Preset ${idx}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=Preset+${idx + 1}&background=3b82f6&color=fff`;
                      }}
                      className="w-full h-full object-cover"
                    />
                    {selectedPreset === url && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Direct Image Link
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  if (e.target.value.trim()) {
                    setPreviewUrl(e.target.value.trim());
                  }
                }}
                placeholder="https://example.com/my-avatar.jpg"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAvatar}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Save Profile Picture</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
