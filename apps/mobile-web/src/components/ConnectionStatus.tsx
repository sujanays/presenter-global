'use client';

import React from 'react';
import { Wifi, WifiOff, ShieldCheck, Zap } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  latency: number;
  deviceId: string;
  sessionDuration: number;
}

export default function ConnectionStatus({
  status,
  latency,
  deviceId,
  sessionDuration,
}: ConnectionStatusProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-success';
    if (ms < 150) return 'text-yellow-400';
    return 'text-accent';
  };

  return (
    <div className="bg-surface/50 border border-white/10 backdrop-blur-md rounded-2xl p-4 w-full flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl flex items-center justify-center ${
          status === 'connected' ? 'bg-success/15 text-success shadow-neonSuccess' :
          status === 'connecting' ? 'bg-yellow-500/15 text-yellow-500 animate-pulse' :
          'bg-accent/15 text-accent shadow-neonAccent'
        }`}>
          {status === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
        </div>
        
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-textBright text-sm">
              {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
            {status === 'connected' && (
              <span className="flex items-center gap-0.5 text-xs text-textMain/60">
                <Zap size={12} className={getLatencyColor(latency)} />
                <span className={getLatencyColor(latency)}>{latency}ms</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-textMain/40 font-mono block truncate max-w-[140px]">
            Room: {deviceId || 'None'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <div className="text-xs text-textMain/60 font-medium">Session Duration</div>
        <div className="text-base font-bold text-primary font-mono tabular-nums">
          {formatTime(sessionDuration)}
        </div>
      </div>
    </div>
  );
}
