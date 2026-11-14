'use client';

import React, { useState } from 'react';
import { X, Cloud, Key, Server, CheckCircle2, Shield, ExternalLink, HardDrive } from 'lucide-react';
import { SupportedLang } from '../lib/i18n';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: SupportedLang;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const [provider, setProvider] = useState<'huggingface' | 'backblaze' | 'cloudflare' | 'aws'>('huggingface');
  const [hfToken, setHfToken] = useState(
    process.env.NEXT_PUBLIC_HF_TOKEN || ''
  );
  const [hfRepo, setHfRepo] = useState(
    process.env.NEXT_PUBLIC_HF_REPO || 'Yaswanth11ui/video-vault'
  );
  const [hfIsPrivate, setHfIsPrivate] = useState(true);

  // Server 2: Backblaze B2 (10 GB Free - No Card)
  const [b2KeyId, setB2KeyId] = useState(process.env.NEXT_PUBLIC_B2_KEY_ID || '');
  const [b2AppKey, setB2AppKey] = useState(process.env.NEXT_PUBLIC_B2_APP_KEY || '');
  const [b2Bucket, setB2Bucket] = useState(process.env.NEXT_PUBLIC_B2_BUCKET || 'video-vault-user');
  const [b2Endpoint, setB2Endpoint] = useState(process.env.NEXT_PUBLIC_B2_ENDPOINT || 's3.us-east-005.backblazeb2.com');

  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareAccountId, setCloudflareAccountId] = useState(
    process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || ''
  );
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsBucket, setAwsBucket] = useState('production-video-vault-7gb');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provider === 'backblaze' && b2KeyId && b2AppKey) {
      try {
        await fetch('/api/settings/b2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyId: b2KeyId,
            applicationKey: b2AppKey,
            bucketName: b2Bucket || 'video-vault-user',
            endpoint: b2Endpoint || 's3.us-east-005.backblazeb2.com',
            region: 'us-east-005',
          }),
        });
      } catch (err) {
        console.error('Error saving B2 settings:', err);
      }
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5EAF2] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#172B4D]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF2]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#EAF4FF] text-[#2196F3]">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
                Cloud Storage & Streaming Configuration
              </h2>
              <p className="text-xs text-[#718096]">
                Configure cloud vaults for up to 7.5GB per video (Zero laptop storage)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#718096] hover:text-[#172B4D] hover:bg-[#F7FAFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zero-Storage Guarantee Callout */}
        <div className="mt-5 p-3.5 rounded-2xl bg-[#EAF4FF] border border-[#2196F3]/30 flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#2196F3] shrink-0 mt-0.5" />
          <div className="text-xs text-[#172B4D] leading-relaxed">
            <span className="font-bold text-[#2196F3]">Zero Laptop Storage Guarantee:</span> Client uploads are streamed directly to cloud object storage. No temporary files remain on your local disk.
          </div>
        </div>

        {/* Provider Switcher */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#172B4D] mb-2">
            Select Cloud Storage Vault (Dual-Server Free Support)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider('huggingface')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                provider === 'huggingface'
                  ? 'bg-[#EAF4FF] border-[#2196F3] text-[#172B4D] shadow-sm'
                  : 'bg-[#F7FAFF] border-[#E5EAF2] text-[#718096] hover:border-[#2196F3]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#2196F3]">Server 1: Hugging Face</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold">
                  50 GB FREE
                </span>
              </div>
              <div className="text-[11px] text-[#718096] mt-1">
                Zero card required. Private dataset repository.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider('backblaze')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                provider === 'backblaze'
                  ? 'bg-[#EAF4FF] border-[#2196F3] text-[#172B4D] shadow-sm'
                  : 'bg-[#F7FAFF] border-[#E5EAF2] text-[#718096] hover:border-[#2196F3]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#2196F3]">Server 2: Backblaze B2</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold">
                  10 GB FREE
                </span>
              </div>
              <div className="text-[11px] text-[#718096] mt-1">
                Zero card required. High-speed S3-compatible streaming.
              </div>
            </button>
          </div>
        </div>

        {/* Forms */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {provider === 'backblaze' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF2]">
                <span className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
                  🔥 Server 2: Backblaze B2 Storage Vault
                </span>
                <span className="text-[11px] text-[#16A34A] font-bold">
                  10 GB Free Forever
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    keyID (Access Key ID)
                  </label>
                  <input
                    type="text"
                    value={b2KeyId}
                    onChange={(e) => setB2KeyId(e.target.value)}
                    placeholder="004xxxxxxxxxxxxxxxx0001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    applicationKey (Secret Key)
                  </label>
                  <input
                    type="password"
                    value={b2AppKey}
                    onChange={(e) => setB2AppKey(e.target.value)}
                    placeholder="K004xxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Bucket Name (Public)
                  </label>
                  <input
                    type="text"
                    value={b2Bucket}
                    onChange={(e) => setB2Bucket(e.target.value)}
                    placeholder="e.g. video-vault-oneh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    S3 Endpoint
                  </label>
                  <input
                    type="text"
                    value={b2Endpoint}
                    onChange={(e) => setB2Endpoint(e.target.value)}
                    placeholder="s3.us-west-004.backblazeb2.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
          {provider === 'huggingface' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF2]">
                <span className="text-xs font-bold text-[#172B4D]">
                  🤗 Hugging Face Vault Configuration
                </span>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#2196F3] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Get Free Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">
                  Hugging Face Access Token (Role: Write)
                </label>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Dataset Repository Name
                  </label>
                  <input
                    type="text"
                    value={hfRepo}
                    onChange={(e) => setHfRepo(e.target.value)}
                    placeholder="e.g. Yaswanth11ui/video-vault"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#172B4D]">
                    <input
                      type="checkbox"
                      checked={hfIsPrivate}
                      onChange={(e) => setHfIsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#2196F3]"
                    />
                    <span>Private Repository (Hidden from public)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {provider === 'cloudflare' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  value={cloudflareAccountId}
                  onChange={(e) => setCloudflareAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">
                  Cloudflare API Token
                </label>
                <input
                  type="password"
                  value={cloudflareToken}
                  onChange={(e) => setCloudflareToken(e.target.value)}
                  placeholder="Paste Cloudflare API token..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                />
              </div>
            </div>
          )}

          {provider === 'aws' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    AWS Access Key
                  </label>
                  <input
                    type="text"
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    AWS Secret Key
                  </label>
                  <input
                    type="password"
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    placeholder="Secret Key..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-mono text-[#172B4D] focus:border-[#2196F3] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#2196F3] hover:bg-[#1976D2] text-white font-bold text-xs shadow-md shadow-[#2196F3]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Server className="w-4 h-4" />}
              <span>{isSaved ? 'Cloud Settings Saved!' : 'Save Cloud Credentials'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
