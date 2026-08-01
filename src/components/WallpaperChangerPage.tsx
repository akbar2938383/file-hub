import React, { useState } from 'react';
import { User, WallpaperSettings, WallpaperConfig } from '../types';
import { Image, Upload, Sliders, CheckCircle2, Sparkles, RefreshCw, ShieldAlert, Globe, Layers, Eye, Link } from 'lucide-react';

interface Props {
  currentUser: User | null;
  wallpaperSettings: WallpaperSettings | null;
  onRefreshWallpaper: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const WallpaperChangerPage: React.FC<Props> = ({
  currentUser,
  wallpaperSettings,
  onRefreshWallpaper,
  showToast,
}) => {
  const isAdmin = currentUser?.role === 'administrator';

  const [selectedUrl, setSelectedUrl] = useState<string>(
    wallpaperSettings?.activeWallpaper.url || ''
  );
  const [selectedName, setSelectedName] = useState<string>(
    wallpaperSettings?.activeWallpaper.name || 'Selected Wallpaper'
  );
  const [blur, setBlur] = useState<number>(
    wallpaperSettings?.activeWallpaper.blur ?? 0
  );
  const [opacity, setOpacity] = useState<number>(
    wallpaperSettings?.activeWallpaper.overlayOpacity ?? 0.35
  );
  const [brightness, setBrightness] = useState<number>(
    wallpaperSettings?.activeWallpaper.brightness ?? 0.85
  );

  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Apply selected wallpaper globally
  const handleApplyWallpaper = async (
    targetUrl: string,
    targetName: string,
    targetBlur = blur,
    targetOpacity = opacity,
    targetBrightness = brightness
  ) => {
    if (!isAdmin) {
      showToast('Only Administrators can change global wallpaper', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          name: targetName,
          blur: targetBlur,
          overlayOpacity: targetOpacity,
          brightness: targetBrightness,
          updatedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Administrator',
        }),
      });

      if (!res.ok) throw new Error('Failed to update wallpaper');

      showToast('Global wallpaper changed! Public users can see this update live.', 'success');
      onRefreshWallpaper();
    } catch (err: any) {
      showToast(err.message || 'Error changing wallpaper', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Upload custom file as wallpaper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      showToast('Only Administrators can upload global wallpapers', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('wallpaper', file);
      formData.append('updatedBy', currentUser?.fullName || 'Administrator');

      const res = await fetch('/api/wallpaper/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload wallpaper image');

      const data = await res.json();
      showToast('Custom wallpaper uploaded and activated globally!', 'success');
      onRefreshWallpaper();

      if (data.activeWallpaper) {
        setSelectedUrl(data.activeWallpaper.url);
        setSelectedName(data.activeWallpaper.name);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload custom wallpaper', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const active = wallpaperSettings?.activeWallpaper;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      
      {/* Page Header Banner */}
      <div className="relative rounded-3xl bg-slate-900/90 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border border-slate-800 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-time Dynamic Wallpaper Engine</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Wallpapers & Background Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {isAdmin ? (
                <span>
                  As <strong className="text-amber-400">Administrator</strong>, any background you choose or upload here is broadcasted <strong className="text-emerald-400">live across all connected sessions and public guests</strong>.
                </span>
              ) : (
                <span>
                  Viewing active global wallpaper set by Administrator. Public users see this background dynamically updated in real-time.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-2 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>Live Public Sync: <strong>ON</strong></span>
            </div>
            <button
              onClick={onRefreshWallpaper}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
              title="Refresh Wallpaper"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Wallpaper Preview Bar */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Currently Displayed Global Background
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Updated by: <strong className="text-slate-800 dark:text-slate-200">{active?.updatedBy || 'System'}</strong>
          </span>
        </div>

        {/* Live Wallpaper Stage */}
        <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner group">
          <img
            src={active?.url || 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2000&q=80'}
            alt={active?.name || 'Active Wallpaper'}
            className="w-full h-full object-cover transition-all duration-500"
            style={{
              filter: `blur(${active?.blur || 0}px) brightness(${active?.brightness ?? 0.85})`,
            }}
          />
          <div
            className="absolute inset-0 bg-slate-950 transition-all pointer-events-none"
            style={{ opacity: active?.overlayOpacity ?? 0.35 }}
          />

          {/* Overlay Info Card */}
          <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-950/70 border border-white/10 text-white backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Preset</p>
              <p className="text-sm font-bold">{active?.name || 'Custom Wallpaper'}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Blur: {active?.blur || 0}px</span>
              <span>Overlay: {Math.round((active?.overlayOpacity ?? 0.35) * 100)}%</span>
              <span>Brightness: {Math.round((active?.brightness ?? 0.85) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Control Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Presets & Custom Upload */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-cyan-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Preset Curated Wallpapers
                </h3>
              </div>
              {!isAdmin && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Admin Permission Required To Change</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {wallpaperSettings?.presets.map((preset) => {
                const isActive = active?.url === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedUrl(preset.url);
                        setSelectedName(preset.name);
                        handleApplyWallpaper(preset.url, preset.name);
                      } else {
                        showToast('Log in as Administrator to apply this wallpaper', 'error');
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden aspect-video border-2 transition-all cursor-pointer group ${
                      isActive
                        ? 'border-blue-600 ring-4 ring-blue-500/20 shadow-lg scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:scale-[1.01]'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                      <span className="text-xs font-semibold text-white drop-shadow-md truncate">
                        {preset.name}
                      </span>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload Custom Image & URL Section */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* File Upload Box */}
              <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center">
                <Upload className="w-8 h-8 text-blue-500 mb-2" />
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  Upload Image File From Computer
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  PNG, JPG, WEBP up to 50MB. Uploads directly to server uploads folder.
                </p>
                <label className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-sm transition-colors">
                  {isUploading ? 'Uploading Wallpaper...' : 'Browse Image File'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Direct URL Input */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="w-4 h-4 text-cyan-500" />
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Use External Web Image URL
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    Paste any high-resolution image URL (Unsplash, Pexels, direct link).
                  </p>
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (customUrlInput.trim()) {
                      handleApplyWallpaper(customUrlInput.trim(), 'Custom Link Wallpaper');
                      setCustomUrlInput('');
                    }
                  }}
                  disabled={!customUrlInput.trim() || isUpdating}
                  className="mt-3 w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Apply Custom URL
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Right Col: Visual Effects Adjuster (Blur, Overlay, Brightness) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Visual Effect Tuning
              </h3>
            </div>

            <div className="space-y-5">
              
              {/* Blur Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Background Blur</span>
                  <span>{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Darkness Overlay Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Dark Overlay Contrast</span>
                  <span>{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Brightness Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Wallpaper Brightness</span>
                  <span>{Math.round(brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.2"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {isAdmin ? (
                <button
                  onClick={() =>
                    handleApplyWallpaper(
                      active?.url || selectedUrl,
                      active?.name || selectedName,
                      blur,
                      opacity,
                      brightness
                    )
                  }
                  disabled={isUpdating}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Broadcast Effect Settings</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs text-center font-medium">
                  Log in as Administrator to broadcast wallpaper settings to all users.
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
