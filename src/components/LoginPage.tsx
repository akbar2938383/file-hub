import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, UserCheck, Lock, User as UserIcon, LogIn, Sparkles, ArrowRight, CheckCircle2, Globe } from 'lucide-react';

interface Props {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const LoginPage: React.FC<Props> = ({
  currentUser,
  onLoginSuccess,
  onContinueAsGuest,
  showToast,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Please fill in both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
      showToast(`Welcome back, ${data.user.fullName}!`, 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (userType: 'admin' | 'user') => {
    setIsLoading(true);
    setErrorMessage('');

    const creds =
      userType === 'admin'
        ? { username: 'admin', password: 'admin123' }
        : { username: 'user', password: 'user123' };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
      showToast(`Logged in as ${data.user.role === 'administrator' ? 'System Administrator' : 'Normal User'}`, 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      
      {/* Current User Status Banner if already logged in */}
      {currentUser && (
        <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.fullName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Currently Logged In
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {currentUser.fullName} (@{currentUser.username}) &bull;{' '}
                <span className="capitalize">{currentUser.role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onContinueAsGuest}
            className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>Proceed to App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Quick Login / Role Selection */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Role Access Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Authentication & Role Switcher
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select a pre-configured role below for instant access, or enter your credentials.
            </p>
          </div>

          <div className="space-y-3 my-4">
            
            {/* Quick Admin Login Card */}
            <div
              onClick={() => quickLogin('admin')}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md hover:border-amber-500/50 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Administrator User
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                        Full Control
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Change live wallpaper, manage users, edit roles, full storage privileges.
                    </p>
                  </div>
                </div>
                <button
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg group-hover:scale-105 transition-all shadow-sm shrink-0"
                >
                  Login Admin &rarr;
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-4 text-[11px] text-slate-400">
                <span>User: <code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin</code></span>
                <span>Pass: <code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin123</code></span>
              </div>
            </div>

            {/* Quick Normal User Login Card */}
            <div
              onClick={() => quickLogin('user')}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Normal User
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-md">
                        Standard
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload files, view live public wallpaper, manage files & text snippets.
                    </p>
                  </div>
                </div>
                <button
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg group-hover:scale-105 transition-all shadow-sm shrink-0"
                >
                  Login User &rarr;
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-4 text-[11px] text-slate-400">
                <span>User: <code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">user</code></span>
                <span>Pass: <code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">user123</code></span>
              </div>
            </div>

            {/* Public Guest View */}
            <div
              onClick={onContinueAsGuest}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md hover:border-emerald-500/50 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Public Guest Mode
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      View live public wallpaper changed by administrator in real-time.
                    </p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all shrink-0 text-slate-800 dark:text-slate-200">
                  Guest View
                </button>
              </div>
            </div>

          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Real-Time Wallpaper Broadcast is active: when Administrator changes background, all public guests see it immediately.
            </span>
          </div>
        </div>

        {/* Right Side: Manual Credentials Form */}
        <div className="lg:col-span-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                Sign In with Credentials
              </h3>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or user"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Verifying Account...' : 'Sign In To Account'}</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Need administrator assistance? Log in with <span className="font-semibold text-slate-700 dark:text-slate-300">admin / admin123</span> to manage user accounts.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
