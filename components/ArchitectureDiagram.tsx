'use client';

import React from 'react';
import { Cloud, Server, Laptop, Cpu, Globe, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            Zero-Local Storage Pipeline
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
            How 7GB Videos Stream Across Languages from Cloud
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Laptop Hard Drive: 0 Bytes Used</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Step 1 */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono">
            01
          </div>
          <h4 className="text-sm font-bold text-white">Browser Chunking</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your 7GB video (MKV, AVI, MOV) is sliced into memory buffers and pushed directly via S3 Multipart/Tus protocol.
          </p>
          <div className="text-[11px] font-mono text-cyan-400/90 pt-1">
            • 10MB chunked streams<br />• Resumable on disconnect
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
            02
          </div>
          <h4 className="text-sm font-bold text-white">Cloud Object Storage</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            The raw 7GB master lands in Hugging Face (50GB Free / No Card) or R2/S3. It never downloads or saves locally to your laptop.
          </p>
          <div className="text-[11px] font-mono text-indigo-400/90 pt-1">
            • 50 GB Free per repository<br />• 100% Private & No Card Needed
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold font-mono">
            03
          </div>
          <h4 className="text-sm font-bold text-white">Cloud Transcoding</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cloud workers repackage unplayable formats (MKV, AVI) into adaptive HLS (.m3u8) with multiple audio & subtitle streams.
          </p>
          <div className="text-[11px] font-mono text-fuchsia-400/90 pt-1">
            • Multi-Audio Dub mapping<br />• 4K, 1080p, 720p renditions
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">
            04
          </div>
          <h4 className="text-sm font-bold text-white">Universal HLS Streaming</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Global CDN streams video smoothly to any phone, tablet, or browser with instant language & audio switching.
          </p>
          <div className="text-[11px] font-mono text-emerald-400/90 pt-1">
            • Low-latency playback<br />• Synced transcripts
          </div>
        </div>
      </div>
    </div>
  );
};
