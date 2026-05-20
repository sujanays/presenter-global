'use client';

import React, { useRef, useState } from 'react';
import { Move, MousePointerClick, Sliders } from 'lucide-react';

interface TrackpadProps {
  onTrackpadMove: (dx: number, dy: number) => void;
  onEmit: (event: string) => void;
}

export default function Trackpad({ onTrackpadMove, onEmit }: TrackpadProps) {
  const [sensitivity, setSensitivity] = useState(1.5);
  const [isMoving, setIsMoving] = useState(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(25);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    lastTouch.current = { x: touch.clientX, y: touch.clientY };
    touchStartTime.current = Date.now();
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsMoving(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isMoving) return;
    
    const touch = e.touches[0];
    const dx = (touch.clientX - lastTouch.current.x) * sensitivity;
    const dy = (touch.clientY - lastTouch.current.y) * sensitivity;

    onTrackpadMove(dx, dy);

    lastTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsMoving(false);

    // Tap-to-click gesture: touch duration < 200ms & delta movement < 5 pixels
    const duration = Date.now() - touchStartTime.current;
    const touch = e.changedTouches[0];
    if (touch) {
      const dist = Math.sqrt(
        Math.pow(touch.clientX - touchStartPos.current.x, 2) +
        Math.pow(touch.clientY - touchStartPos.current.y, 2)
      );

      if (duration < 200 && dist < 5) {
        triggerHaptic();
        onEmit('LEFT_CLICK');
      }
    }
  };

  const handleButtonClick = (button: 'LEFT_CLICK' | 'RIGHT_CLICK') => {
    triggerHaptic();
    onEmit(button);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto gap-4">
      {/* Sensitivity Settings */}
      <div className="bg-surface/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-textMain/75">
          <Sliders size={16} className="text-primary" />
          <span>Sensitivity</span>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end max-w-[200px]">
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs font-bold text-primary font-mono w-8 text-right">
            {sensitivity.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Main Trackpad Gesture Surface */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 h-[280px] bg-gradient-to-b from-surface/20 to-surface/40 border border-white/5 rounded-3xl relative overflow-hidden active:border-primary/20 transition-all flex items-center justify-center cursor-crosshair shadow-2xl"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.01] pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white"></div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 text-center p-6 pointer-events-none">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.02] text-textMain/30">
            <Move size={20} />
          </div>
          <span className="text-xs text-textMain/40 font-medium">Drag for pointer • Tap for left click</span>
        </div>
      </div>

      {/* Dedicated physical click triggers */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleButtonClick('LEFT_CLICK')}
          className="h-14 bg-surface border border-white/5 active:bg-surface/60 active:border-primary/20 rounded-2xl text-sm font-semibold text-textBright transition-all shadow-md active:scale-[0.98]"
        >
          Left Click
        </button>

        <button
          onClick={() => handleButtonClick('RIGHT_CLICK')}
          className="h-14 bg-surface border border-white/5 active:bg-surface/60 active:border-primary/20 rounded-2xl text-sm font-semibold text-textBright transition-all shadow-md active:scale-[0.98]"
        >
          Right Click
        </button>
      </div>
    </div>
  );
}
