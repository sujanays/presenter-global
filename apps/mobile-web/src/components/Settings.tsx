'use client';

import React from 'react';
import { Settings2, RefreshCw, KeyRound, LogOut, ArrowRightLeft, AlertCircle } from 'lucide-react';

interface SettingsProps {
  deviceId: string;
  onDisconnect: () => void;
}

export default function Settings({ deviceId, onDisconnect }: SettingsProps) {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([30, 50, 30]);
    }
  };

  const handleDisconnect = () => {
    triggerHaptic();
    onDisconnect();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5">
      <div className="flex flex-col px-1">
        <h2 className="text-base font-semibold text-textBright flex items-center gap-2">
          <Settings2 size={18} className="text-primary" />
          System Preferences
        </h2>
        <p className="text-xs text-textMain/40 mt-1">
          Review active devices connection credentials and configure workspace pairing preferences.
        </p>
      </div>

      {/* Session details */}
      <div className="bg-surface/40 border border-white/5 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-textMain/40 mb-3">Pairing Association</div>
          <div className="flex items-center justify-between p-3.5 bg-background/50 border border-white/[0.03] rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">P</div>
              <div>
                <span className="text-xs font-semibold text-textBright block">Paired Laptop Host</span>
                <span className="text-[10px] text-textMain/40 font-mono block truncate max-w-[150px]">{deviceId || 'N/A'}</span>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 border border-accent/20 text-accent font-semibold text-xs rounded-xl active:bg-accent/25 transition-colors"
            >
              <LogOut size={13} />
              <span>Unpair</span>
            </button>
          </div>
        </div>

        {/* Security indicators */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex gap-3 text-xs text-textMain/60 leading-relaxed px-1">
            <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-textBright block mb-0.5">Global Secure Signal</span>
              This channel uses high-strength WebSocket WSS encryption. No keystrokes or coordinates can be captured by intermediate nodes.
            </div>
          </div>
        </div>
      </div>

      {/* Controls description */}
      <div className="bg-surface/20 border border-white/5 rounded-3xl p-5 shadow-sm">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-textMain/45 mb-3 px-1">Keyboard Bindings</h3>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-white/[0.02]">
            <span className="text-textMain/60">Next Slide</span>
            <span className="px-2 py-0.5 bg-white/5 rounded font-mono text-[10px] text-primary">Right Arrow</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-white/[0.02]">
            <span className="text-textMain/60">Previous Slide</span>
            <span className="px-2 py-0.5 bg-white/5 rounded font-mono text-[10px] text-primary">Left Arrow</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-white/[0.02]">
            <span className="text-textMain/60">Slideshow Trigger</span>
            <span className="px-2 py-0.5 bg-white/5 rounded font-mono text-[10px] text-primary">F5</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1 px-1.5">
            <span className="text-textMain/60">Toggle Black Screen</span>
            <span className="px-2 py-0.5 bg-white/5 rounded font-mono text-[10px] text-primary">B Key</span>
          </div>
        </div>
      </div>
    </div>
  );
}
