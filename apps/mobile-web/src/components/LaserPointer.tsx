'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface LaserPointerProps {
  onLaserMove: (x: number, y: number, visible: boolean) => void;
}

export default function LaserPointer({ onLaserMove }: LaserPointerProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0.5, y: 0.5 });
  const [isActive, setIsActive] = useState(false);
  const lastEmitTime = useRef<number>(0);

  const processTouchEvent = (e: React.TouchEvent<HTMLDivElement>, visible: boolean) => {
    if (!padRef.current) return;
    const touch = e.touches[0];
    if (!touch && !visible) {
      // Finger lifted
      setIsActive(false);
      onLaserMove(coords.x, coords.y, false);
      return;
    }

    const rect = padRef.current.getBoundingClientRect();
    
    // Calculate relative decimal positions, capping strictly between 0 and 1
    let x = (touch.clientX - rect.left) / rect.width;
    let y = (touch.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    setCoords({ x, y });
    setIsActive(true);

    // Throttled emitting (max 60 packets per second / 16ms throttle rate)
    const now = Date.now();
    if (now - lastEmitTime.current > 16 || !visible) {
      onLaserMove(x, y, visible);
      lastEmitTime.current = now;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    processTouchEvent(e, true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    processTouchEvent(e, true);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsActive(false);
    onLaserMove(coords.x, coords.y, false);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto gap-4">
      <div className="flex flex-col px-1">
        <h2 className="text-base font-semibold text-textBright flex items-center gap-2">
          <Target size={18} className="text-accent animate-pulse" />
          Laser Pointer Workspace
        </h2>
        <p className="text-xs text-textMain/40 mt-1">
          Drag your finger inside the gray canvas below. A high-accuracy red laser dot will replicate on your presentation screen.
        </p>
      </div>

      <div
        ref={padRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 h-[420px] bg-gradient-to-b from-surface/20 to-surface/40 border border-white/5 rounded-3xl relative overflow-hidden active:border-accent/20 transition-all flex items-center justify-center cursor-none shadow-2xl"
        style={{ touchAction: 'none' }}
      >
        {/* Visual helper grids */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.02] pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white"></div>
          ))}
        </div>

        {/* Outer bounds helper */}
        <div className="absolute inset-4 border border-dashed border-white/[0.03] rounded-2xl pointer-events-none"></div>

        {/* Simulated Screen Indicator */}
        {!isActive && (
          <div className="flex flex-col items-center gap-3 text-center p-6 pointer-events-none animate-pulse">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.02] text-textMain/40">
              <Target size={24} />
            </div>
            <span className="text-xs text-textMain/40 font-medium">Touch & drag to activate pointer</span>
          </div>
        )}

        {/* Interactive Laser Indicator on mobile screen */}
        {isActive && (
          <div
            className="absolute w-8 h-8 rounded-full border border-accent/20 bg-accent/15 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${coords.x * 100}%`,
              top: `${coords.y * 100}%`,
              boxShadow: '0 0 20px rgba(247, 90, 104, 0.4)',
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping absolute"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-accent"></div>
          </div>
        )}
      </div>
    </div>
  );
}
