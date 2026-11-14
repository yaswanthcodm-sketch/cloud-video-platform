'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('yaswanthcodm@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_logged_in', 'true');
          localStorage.setItem('admin_email', data.user?.email || email.trim());
        }
        setTimeout(() => {
          onLoginSuccess(data.user?.email || email.trim());
          setIsSuccess(false);
          setPassword('');
          onClose();
        }, 500);
      } else {
        setErrorMessage(data.error || 'Invalid administrator email or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while attempting login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofill = () => {
    setEmail('yaswanthcodm@gmail.com');
    setPassword('Doraemon@143');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-white border border-[#E5EAF2] rounded-3xl shadow-2xl p-6 sm:p-8 text-[#172B4D] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF2]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#EAF4FF] text-[#2196F3]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D] flex items-center gap-1.5">
                Admin Authentication
              </h2>
              <p className="text-xs text-[#718096]">
                Only authorized admins can upload and manage videos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#718096] hover:text-[#172B4D] hover:bg-[#F7FAFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Quick Credential Helper Pill */}
          <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[#2196F3]" />
              <span className="text-[11px] text-[#718096]">Admin Account Configured</span>
            </div>
            <button
              type="button"
              onClick={handleAutofill}
              className="text-[11px] font-bold text-[#2196F3] hover:underline"
            >
              Fill Credentials
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#16A34A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span className="font-semibold">Authentication verified. Welcome back!</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-[#172B4D] mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yaswanthcodm@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] focus:bg-white focus:border-[#2196F3] focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-[#172B4D] mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] focus:bg-white focus:border-[#2196F3] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B4D]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3 rounded-2xl bg-[#2196F3] hover:bg-[#1976D2] text-white font-bold text-xs shadow-md shadow-[#2196F3]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as Admin</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-[#718096]">
            Visitors and non-admin viewers can stream, seek, and watch all videos freely without logging in.
          </p>

        </form>

      </div>
    </div>
  );
};
