import React, { useState, useEffect } from 'react';
import { User, WallpaperSettings, WallpaperConfig, LiveType } from '../types';
import { Image, Upload, Sliders, CheckCircle2, Sparkles, RefreshCw, ShieldAlert, Globe, Layers, Eye, Link, Trash2, Zap, Play } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LiveWallpaperCanvas } from './LiveWallpaperCanvas';

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

  const active = wallpaperSettings?.activeWallpaper;

  const [selectedUrl, setSelectedUrl] = useState<string>(active?.url || '');
  const [selectedName, setSelectedName] = useState<string>(active?.name || 'Selected Wallpaper');
  const [blur, setBlur] = useState<number>(active?.blur ?? 0);
  const [opacity, setOpacity] = useState<number>(active?.overlayOpacity ?? 0.35);
  const [brightness, setBrightness] = useState<number>(active?.brightness ?? 0.85);

  // Live Wallpaper State
  const [isLive, setIsLive] = useState<boolean>(active?.isLive ?? false);
  const [liveType, setLiveType] = useState<LiveType>(active?.liveType ?? 'aurora');
  const [videoUrl, setVideoUrl] = useState<string>(active?.videoUrl ?? '');

  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<WallpaperConfig | null>(null);

  useEffect(() => {
    if (active) {
      setSelectedUrl(active.url || '');
      setSelectedName(active.name || 'Selected Wallpaper');
      setBlur(active.blur ?? 0);
      setOpacity(active.overlayOpacity ?? 0.35);
      setBrightness(active.brightness ?? 0.85);
      setIsLive(Boolean(active.isLive));
      setLiveType(active.liveType || 'aurora');
      setVideoUrl(active.videoUrl || '');
    }
  }, [wallpaperSettings]);

  // Delete custom wallpaper preset
  const handleDeletePreset = async (preset: WallpaperConfig) => {
    try {
      const res = await fetch(`/api/wallpaper/preset/${preset.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove wallpaper preset');
      showToast(`Wallpaper preset "${preset.name}" removed`, 'success');
      onRefreshWallpaper();
    } catch (err: any) {
      showToast(err.message || 'Error removing wallpaper preset', 'error');
    } finally {
      setPresetToDelete(null);
    }
  };

  // Apply selected wallpaper globally
  const handleApplyWallpaper = async (
    targetUrl: string,
    targetName: string,
    targetBlur = blur,
    targetOpacity = opacity,
    targetBrightness = brightness,
    targetIsLive = isLive,
    targetLiveType = liveType,
    targetVideoUrl = videoUrl
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
          isLive: targetIsLive,
          liveType: targetLiveType,
          videoUrl: targetVideoUrl,
          updatedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Administrator',
        }),
      });

      if (!res.ok) throw new Error('Failed to update wallpaper');

      showToast('Global wallpaper updated live across all connected clients!', 'success');
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload wallpaper image');

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

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      
      {/* Combined Header & Live Wallpaper Mode Banner */}
      <div className="relative rounded-3xl bg-slate-900/90 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border border-slate-800 backdrop-blur-md space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Wallpapers & Background Manager
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-2 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>Live Public Sync: <strong>ON</strong></span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative z-10 border-t border-white/10" />

        {/* Live Wallpaper Mode Section */}
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Live Animated Wallpaper Mode</h3>
              </div>
            </div>

            {/* Toggle Switch Button */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-300">
                Live Mode: <span className={isLive ? 'text-indigo-400 font-extrabold' : 'text-slate-400'}>{isLive ? 'ACTIVE' : 'OFF'}</span>
              </span>
              <button
                type="button"
                id="toggle-live-wallpaper-btn"
                onClick={() => {
                  if (!isAdmin) {
                    showToast('Log in as Administrator to toggle Live Wallpaper mode', 'error');
                    return;
                  }
                  const nextState = !isLive;
                  setIsLive(nextState);
                  handleApplyWallpaper(
                    selectedUrl,
                    nextState ? `✨ Live ${liveType.toUpperCase()} Wallpaper` : selectedName,
                    blur,
                    opacity,
                    brightness,
                    nextState,
                    liveType,
                    videoUrl
                  );
                }}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isLive ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isLive ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Live Animation Themes Selector */}
          {isLive && (
            <div className="pt-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Select Live Animation Theme:
                </p>
                {liveType === 'video' && (
                  <span className="text-[11px] text-cyan-400 font-medium">Playing looping video feed</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5">
                {[
                  { key: 'aurora', label: 'Aurora Wave', icon: Sparkles },
                  { key: 'particles', label: 'Cosmic Stars', icon: Layers },
                  { key: 'nebula', label: 'Nebula Glow', icon: Eye },
                  { key: 'matrix', label: 'Matrix Code', icon: Globe },
                  { key: 'waves', label: 'Fluid Wave', icon: RefreshCw },
                  { key: 'cybergrid', label: 'Cyber Grid', icon: Sliders },
                  { key: 'video', label: 'MP4 Video', icon: Play },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = liveType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      id={`live-type-btn-${item.key}`}
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Log in as Administrator to change live theme', 'error');
                          return;
                        }
                        const newType = item.key as LiveType;
                        setLiveType(newType);
                        handleApplyWallpaper(
                          selectedUrl,
                          `✨ Live ${item.label} Theme`,
                          blur,
                          opacity,
                          brightness,
                          true,
                          newType,
                          videoUrl
                        );
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 text-xs font-semibold ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg scale-105 ring-2 ring-indigo-400/50'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {liveType === 'video' && (
                <div className="pt-3 space-y-2 max-w-xl">
                  <label className="text-xs font-medium text-slate-300">Custom MP4 / WebM Video Direct Link:</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4"
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (videoUrl.trim()) {
                          handleApplyWallpaper(
                            selectedUrl,
                            '✨ Live Custom MP4 Video',
                            blur,
                            opacity,
                            brightness,
                            true,
                            'video',
                            videoUrl.trim()
                          );
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                    >
                      Apply Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
        <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner group bg-slate-950">
          {isLive ? (
            <LiveWallpaperCanvas
              isLive={true}
              liveType={liveType}
              videoUrl={videoUrl}
              className="w-full h-full object-cover transition-all duration-500"
              style={{
                filter: `blur(${blur}px) brightness(${brightness})`,
              }}
            />
          ) : (
            <img
              src={active?.url || 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=2000&q=80'}
              alt={active?.name || 'Active Wallpaper'}
              className="w-full h-full object-cover transition-all duration-500"
              style={{
                filter: `blur(${blur}px) brightness(${brightness})`,
              }}
            />
          )}
          <div
            className="absolute inset-0 bg-slate-950 transition-all pointer-events-none"
            style={{ opacity }}
          />

          {/* Overlay Info Card */}
          <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-950/80 border border-white/10 text-white backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
                {isLive && <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
                <span>{isLive ? 'Active Live Mode' : 'Active Static Preset'}</span>
              </p>
              <p className="text-sm font-bold">
                {isLive ? `✨ Live ${liveType.toUpperCase()} Wallpaper` : (active?.name || 'Custom Wallpaper')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Blur: {blur}px</span>
              <span>Overlay: {Math.round(opacity * 100)}%</span>
              <span>Brightness: {Math.round(brightness * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Control Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left Col: Presets & Custom Upload (Hidden in Live Wallpaper Mode) */}
        <div className="lg:col-span-8 space-y-6">
          
          {!isLive ? (
            <>
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
                    const isActive = active?.url === preset.url || (preset.isLive && isLive && active?.liveType === preset.liveType);
                    const isCustom = preset.category === 'Custom Upload' || preset.url.includes('/api/files/');

                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          if (isAdmin) {
                            setSelectedUrl(preset.url);
                            setSelectedName(preset.name);
                            const nextLive = Boolean(preset.isLive);
                            const nextLiveType = preset.liveType || 'aurora';
                            setIsLive(nextLive);
                            if (preset.liveType) setLiveType(preset.liveType);
                            handleApplyWallpaper(
                              preset.url,
                              preset.name,
                              blur,
                              opacity,
                              brightness,
                              nextLive,
                              nextLiveType,
                              preset.videoUrl || videoUrl
                            );
                          } else {
                            showToast('Log in as Administrator to apply this wallpaper', 'error');
                          }
                        }}
                        className={`relative rounded-2xl overflow-hidden aspect-video border-2 transition-all cursor-pointer group bg-slate-800 ${
                          isActive
                            ? 'border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:scale-[1.01]'
                        }`}
                      >
                        {preset.isLive ? (
                          <div className="w-full h-full relative overflow-hidden bg-slate-900">
                            <LiveWallpaperCanvas
                              isLive={true}
                              liveType={preset.liveType || 'aurora'}
                              videoUrl={preset.videoUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <img
                            src={preset.url}
                            alt={preset.name}
                            onError={(e) => {
                              // Fallback image handling for deleted files or broken links
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.fallback-placeholder')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-placeholder absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-800 text-slate-400 text-xs font-sans';
                                fallback.innerHTML = `<span class="font-bold text-slate-300 truncate max-w-full">${preset.name}</span><span class="text-[10px] text-red-400 mt-1">Image removed/missing</span>`;
                                parent.appendChild(fallback);
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                        
                        {/* Live Badge */}
                        {preset.isLive && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-[10px] font-extrabold text-white flex items-center gap-1 shadow-md backdrop-blur-sm">
                            <Zap className="w-3 h-3 text-indigo-200 animate-pulse" />
                            <span>LIVE</span>
                          </div>
                        )}

                        {/* Delete preset button */}
                        {(isAdmin || isCustom) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPresetToDelete(preset);
                            }}
                            title="Delete wallpaper preset"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-red-600 text-slate-300 hover:text-white transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100 z-10 shadow-md backdrop-blur-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                          <span className="text-xs font-semibold text-white drop-shadow-md truncate max-w-[80%]">
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
            </>
          ) : null}

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

      {/* Delete Preset Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={presetToDelete !== null}
        title="Remove Wallpaper Preset"
        message={`Are you sure you want to remove wallpaper "${presetToDelete?.name || ''}"? If this image was uploaded, its server file will also be deleted.`}
        onClose={() => setPresetToDelete(null)}
        onConfirm={() => {
          if (presetToDelete) {
            handleDeletePreset(presetToDelete);
          }
        }}
      />

    </div>
  );
};
