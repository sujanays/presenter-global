'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { KeyRound, Smartphone, Monitor, ChevronRight, Play, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ConnectionStatus from '../components/ConnectionStatus';
import SlideControls from '../components/SlideControls';
import LaserPointer from '../components/LaserPointer';
import Trackpad from '../components/Trackpad';
import Settings from '../components/Settings';
import { getBackendUrl } from '../lib/backendUrl';
import { getSocketOptions } from '../lib/socketOptions';

export default function MobileRemoteApp() {
  // Navigation & session state
  const [activeTab, setActiveTab] = useState<'slides' | 'laser' | 'trackpad' | 'settings'>('slides');
  const [paired, setPaired] = useState(false);
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [pairTokenInput, setPairTokenInput] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [pairError, setPairError] = useState<string | null>(null);
  
  // Realtime network status
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [latency, setLatency] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const autoPairStartedRef = useRef(false);

  // 2. Session timer ticks
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const clearHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  // Setup WebSocket connection after pairing is verified
  const connectSocket = useCallback((targetDeviceId: string, verifiedToken: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    clearHeartbeat();

    setStatus('connecting');

    const backendUrl = getBackendUrl();
    console.log('Connecting remote client to socket at:', backendUrl);

    const socket = io(backendUrl, getSocketOptions(backendUrl));
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket channel connected.');
      setStatus('connected');
      setPaired(true);

      socket.emit('SESSION_JOIN', {
        deviceId: targetDeviceId,
        role: 'mobile',
        token: verifiedToken,
      });

      heartbeatRef.current = setInterval(() => {
        if (socket.connected) {
          const start = Date.now();
          socket.emit('HEARTBEAT', { clientTime: start });
        }
      }, 3000);
    });

    socket.on('HEARTBEAT_ACK', (data: { clientTime: number }) => {
      setLatency(Date.now() - data.clientTime);
    });

    socket.on('disconnect', () => {
      console.warn('WebSocket channel disconnected.');
      setStatus('disconnected');
      clearHeartbeat();
    });

    socket.on('connect_error', () => {
      setStatus('disconnected');
      setPaired(false);
      setPairError('Could not connect to presentation server. Check network and try again.');
      clearHeartbeat();
    });

    socket.on('error', (data: { message?: string }) => {
      console.error('Socket authorization error:', data);
      setStatus('disconnected');
      setPaired(false);
      setPairError(data?.message || 'Session authorization failed. Please pair again.');
      clearHeartbeat();
    });
  }, []);

  const handlePair = useCallback(async (targetDevice: string, targetToken: string) => {
    if (!targetDevice) return;
    setPairError(null);
    setStatus('connecting');

    try {
      const backendUrl = getBackendUrl();

      // Try to verify the pairing token with the backend
      const response = await fetch(`${backendUrl}/api/v1/devices/pair/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: targetToken,
          mobileDeviceId: 'mobile_' + Math.random().toString(36).substring(2, 9),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Pairing token has expired or is invalid');
      }

      const resData = await response.json();
      const verifiedDeviceId = resData.deviceId;
      const verifiedToken = resData.accessToken;

      setDeviceId(verifiedDeviceId);
      connectSocket(verifiedDeviceId, verifiedToken);
    } catch (err: any) {
      console.error('Pairing failed:', err);
      setPairError(err.message || 'Verification failed. Please check your Pairing Pin/Token.');
      setStatus('disconnected');
      setPaired(false);
    }
  }, [connectSocket]);

  // Auto-pair when opened via QR deep link (?token=&deviceId=)
  useEffect(() => {
    if (typeof window === 'undefined' || autoPairStartedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlDeviceId = params.get('deviceId');

    if (urlToken && urlDeviceId) {
      autoPairStartedRef.current = true;
      setDeviceIdInput(urlDeviceId);
      setPairTokenInput(urlToken);
      handlePair(urlDeviceId, urlToken);
    }
  }, [handlePair]);

  useEffect(() => {
    return () => {
      clearHeartbeat();
      socketRef.current?.disconnect();
    };
  }, []);

  const handleManualPairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceIdInput.trim()) return;
    handlePair(deviceIdInput.trim(), pairTokenInput.trim());
  };

  const handleDisconnect = () => {
    clearHeartbeat();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setPaired(false);
    setStatus('disconnected');
    setDeviceId('');
    setDeviceIdInput('');
    setPairTokenInput('');
    
    // Clean search params
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const emitControlEvent = (event: string) => {
    if (socketRef.current && status === 'connected') {
      console.log(`Emitting control action: ${event}`);
      socketRef.current.emit(event);
    }
  };

  const emitLaserMove = (x: number, y: number, visible: boolean) => {
    if (socketRef.current && status === 'connected') {
      socketRef.current.emit('LASER_MOVE', { x, y, visible });
    }
  };

  const emitTrackpadMove = (dx: number, dy: number) => {
    if (socketRef.current && status === 'connected') {
      socketRef.current.emit('TRACKPAD_MOVE', { dx, dy });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen max-w-md mx-auto bg-background text-textMain overflow-hidden select-none pb-safe">
      
      {/* 1. Pairing Portal Screen */}
      {!paired ? (
        <div className="flex-1 flex flex-col justify-center p-6 relative">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/5 filter blur-[60px] pointer-events-none"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-primary/15 border border-primary/20 rounded-3xl text-primary mb-4 shadow-neon/10">
              <Smartphone size={32} />
            </div>
            <h1 className="text-2xl font-bold text-textBright">Connect Remote</h1>
            <p className="text-sm text-textMain/50 mt-1 max-w-[280px] mx-auto">
              Scan the QR code displayed on the desktop app, or enter pairing credentials below.
            </p>
          </div>

          <form onSubmit={handleManualPairSubmit} className="flex flex-col gap-4 bg-surface/30 border border-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative">
            {pairError && (
              <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-4 text-xs text-red-200 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-300">Connection Failed</p>
                  <p className="mt-0.5 opacity-90">{pairError}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-textMain/40 px-1">Device ID</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. desktop_dev_xyz"
                  value={deviceIdInput}
                  onChange={(e) => {
                    setDeviceIdInput(e.target.value);
                    if (pairError) setPairError(null);
                  }}
                  className="w-full h-12 bg-background/60 border border-white/10 rounded-2xl px-4 text-sm text-textBright placeholder:text-textMain/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                />
                <Monitor size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-textMain/30" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-textMain/40 px-1">Pairing PIN / Code</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="6-digit PIN"
                  value={pairTokenInput}
                  onChange={(e) => {
                    setPairTokenInput(e.target.value);
                    if (pairError) setPairError(null);
                  }}
                  className="w-full h-12 bg-background/60 border border-white/10 rounded-2xl px-4 text-sm text-textBright placeholder:text-textMain/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all font-mono tracking-widest"
                />
                <KeyRound size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-textMain/30" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!deviceIdInput.trim() || !pairTokenInput.trim()}
              className="h-12 w-full mt-2 bg-gradient-to-r from-primary to-secondary text-background font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-neon/15"
            >
              <span>Verify & Connect</span>
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      ) : (
        
        // 2. Active Remote Interface
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top telemetry bar */}
          <div className="p-4 border-b border-white/5 bg-background">
            <ConnectionStatus
              status={status}
              latency={latency}
              deviceId={deviceId}
              sessionDuration={sessionDuration}
            />
          </div>

          {/* Core dynamic work canvas */}
          <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-gradient-to-b from-background to-surface/10 flex flex-col justify-start">
            {activeTab === 'slides' && <SlideControls onEmit={emitControlEvent} />}
            {activeTab === 'laser' && <LaserPointer onLaserMove={emitLaserMove} />}
            {activeTab === 'trackpad' && (
              <Trackpad onTrackpadMove={emitTrackpadMove} onEmit={emitControlEvent} />
            )}
            {activeTab === 'settings' && (
              <Settings deviceId={deviceId} onDisconnect={handleDisconnect} />
            )}
          </div>

          {/* Premium Bottom navigation bar */}
          <div className="p-3 bg-surface/50 border-t border-white/5 backdrop-blur-lg flex items-center justify-around shadow-2xl">
            <button
              onClick={() => setActiveTab('slides')}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
                activeTab === 'slides' ? 'text-primary bg-primary/10 font-bold' : 'text-textMain/50 hover:text-textMain'
              }`}
            >
              <Monitor size={20} />
              <span className="text-[10px]">Slides</span>
            </button>

            <button
              onClick={() => setActiveTab('laser')}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
                activeTab === 'laser' ? 'text-accent bg-accent/10 font-bold' : 'text-textMain/50 hover:text-textMain'
              }`}
            >
              <Smartphone size={20} />
              <span className="text-[10px]">Laser</span>
            </button>

            <button
              onClick={() => setActiveTab('trackpad')}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
                activeTab === 'trackpad' ? 'text-primary bg-primary/10 font-bold' : 'text-textMain/50 hover:text-textMain'
              }`}
            >
              <Smartphone size={20} />
              <span className="text-[10px]">Trackpad</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
                activeTab === 'settings' ? 'text-textBright bg-white/5 font-bold' : 'text-textMain/50 hover:text-textMain'
              }`}
            >
              <KeyRound size={20} />
              <span className="text-[10px]">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
