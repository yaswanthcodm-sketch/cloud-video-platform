'use client';

import React, { useState } from 'react';
import { FileText, Play, Globe, MessageSquare } from 'lucide-react';
import { TranscriptItem } from '../lib/types';
import { SupportedLang } from '../lib/i18n';

interface MultiLangTranscriptProps {
  transcripts?: Record<string, TranscriptItem[]>;
  currentTime: number;
  onSeek: (seconds: number) => void;
  currentLang: SupportedLang;
}

export const MultiLangTranscript: React.FC<MultiLangTranscriptProps> = ({
  transcripts,
  currentTime,
  onSeek,
  currentLang,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('en');

  if (!transcripts || Object.keys(transcripts).length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2">
        <MessageSquare className="w-4 h-4 text-slate-500" />
        <span>Transcripts generated in cloud during audio ingestion.</span>
      </div>
    );
  }

  const availableLangs = Object.keys(transcripts);
  const currentLines = transcripts[selectedLang] || transcripts[availableLangs[0]] || [];

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const langLabels: Record<string, string> = {
    en: 'English (US)',
    es: 'Español',
    hi: 'हिन्दी (Hindi)',
    fr: 'Français',
    ja: '日本語 (Japanese)',
    de: 'Deutsch',
  };

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Interactive Multi-Language Transcript
          </h3>
        </div>

        {/* Transcript Language Switcher */}
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {availableLangs.map((code) => (
              <option key={code} value={code}>
                {langLabels[code] || code.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transcript Items List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {currentLines.map((item) => {
          const isActive = currentTime >= item.start && currentTime <= item.end;

          return (
            <div
              key={item.id}
              onClick={() => onSeek(item.start)}
              className={`p-3 rounded-2xl cursor-pointer transition-all text-xs flex items-start gap-3 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border border-cyan-500/40 text-cyan-200 shadow-md'
                  : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span
                  className={`font-mono text-[11px] px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'
                  }`}
                >
                  {formatTimestamp(item.start)}
                </span>
              </div>

              <div className="flex-1">
                {item.speaker && (
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
                    {item.speaker}
                  </span>
                )}
                <p className={`leading-relaxed ${isActive ? 'font-medium text-white' : ''}`}>
                  {item.text}
                </p>
              </div>

              <button
                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                  isActive ? 'text-cyan-400 opacity-100' : 'text-slate-500 hover:text-white'
                }`}
                title="Jump to time"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
        💡 Click any line above to seek the video player to that timestamp.
      </div>
    </div>
  );
};
