'use client';

import React from 'react';
import { Play, Square, ChevronLeft, ChevronRight, EyeOff, Maximize2 } from 'lucide-react';

interface SlideControlsProps {
  onEmit: (event: string) => void;
}

export default function SlideControls({ onEmit }: SlideControlsProps) {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  };

  const handleAction = (event: string) => {
    triggerHaptic();
    onEmit(event);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Primary big touch targets */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAction('PREVIOUS_SLIDE')}
          className="flex flex-col items-center justify-center h-40 bg-surface border border-white/5 active:bg-surface/70 active:border-primary/30 rounded-3xl transition-all shadow-lg active:scale-[0.98] group"
        >
          <div className="p-4 bg-white/5 rounded-2xl mb-2 group-active:text-primary group-active:bg-primary/10 transition-colors">
            <ChevronLeft size={36} className="text-textBright" />
          </div>
          <span className="text-sm font-semibold text-textMain">Previous</span>
        </button>

        <button
          onClick={() => handleAction('NEXT_SLIDE')}
          className="flex flex-col items-center justify-center h-40 bg-primary/10 border border-primary/20 active:bg-primary/25 active:border-primary/40 rounded-3xl transition-all shadow-neon/10 active:scale-[0.98] group"
        >
          <div className="p-4 bg-primary/20 rounded-2xl mb-2 text-primary transition-colors">
            <ChevronRight size={36} />
          </div>
          <span className="text-sm font-semibold text-primary">Next Slide</span>
        </button>
      </div>

      {/* Grid of utility slideshow features */}
      <div className="bg-surface/30 border border-white/5 rounded-3xl p-5 shadow-inner">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-textMain/50 mb-4 px-1">Presentation Utilities</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAction('START_SLIDESHOW')}
            className="flex items-center gap-3 p-3.5 bg-surface/80 hover:bg-surface border border-white/5 rounded-2xl active:scale-[0.97] transition-all text-left group"
          >
            <div className="p-2.5 bg-success/15 text-success rounded-xl group-active:bg-success/25 transition-colors">
              <Play size={18} fill="currentColor" />
            </div>
            <div>
              <div className="text-xs font-semibold text-textBright">Start Slideshow</div>
              <div className="text-[10px] text-textMain/40 font-mono">F5 Key</div>
            </div>
          </button>

          <button
            onClick={() => handleAction('END_SLIDESHOW')}
            className="flex items-center gap-3 p-3.5 bg-surface/80 hover:bg-surface border border-white/5 rounded-2xl active:scale-[0.97] transition-all text-left group"
          >
            <div className="p-2.5 bg-accent/15 text-accent rounded-xl group-active:bg-accent/25 transition-colors">
              <Square size={18} fill="currentColor" />
            </div>
            <div>
              <div className="text-xs font-semibold text-textBright">End Slideshow</div>
              <div className="text-[10px] text-textMain/40 font-mono">Esc Key</div>
            </div>
          </button>

          <button
            onClick={() => handleAction('BLACK_SCREEN')}
            className="flex items-center gap-3 p-3.5 bg-surface/80 hover:bg-surface border border-white/5 rounded-2xl active:scale-[0.97] transition-all text-left group"
          >
            <div className="p-2.5 bg-white/5 text-textMain rounded-xl group-active:bg-primary/10 group-active:text-primary transition-colors">
              <EyeOff size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-textBright">Black Screen</div>
              <div className="text-[10px] text-textMain/40 font-mono">B Key</div>
            </div>
          </button>

          <button
            onClick={() => handleAction('FULLSCREEN_TOGGLE')}
            className="flex items-center gap-3 p-3.5 bg-surface/80 hover:bg-surface border border-white/5 rounded-2xl active:scale-[0.97] transition-all text-left group"
          >
            <div className="p-2.5 bg-white/5 text-textMain rounded-xl group-active:bg-primary/10 group-active:text-primary transition-colors">
              <Maximize2 size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-textBright">Fullscreen</div>
              <div className="text-[10px] text-textMain/40 font-mono">F11 Key</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
