'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '@/lib/audio';
import { Play, Pause, RotateCcw, Clock, Plus, Minus, Check } from 'lucide-react';

interface CountdownTimerProps {
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  activeTeam?: 'A' | 'B' | null;
  teamAName?: string;
  teamBName?: string;
  size?: 'compact' | 'normal' | 'huge';
  onStart?: () => void;
  onPause?: () => void;
  onReset?: (newSec?: number) => void;
  onAdjustRemaining?: (delta: number) => void;
  onSetCustomTotal?: (seconds: number) => void;
  showControls?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  totalSeconds,
  isRunning,
  activeTeam,
  teamAName = 'Tim A',
  teamBName = 'Tim B',
  size = 'normal',
  onStart,
  onPause,
  onReset,
  onAdjustRemaining,
  onSetCustomTotal,
  showControls = false,
}) => {
  const prevSecRef = useRef<number>(seconds);
  const [customInput, setCustomInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Sound triggering on seconds change when running
  useEffect(() => {
    if (isRunning && seconds !== prevSecRef.current) {
      if (seconds > 0) {
        const isCritical = seconds <= 5;
        sounds.playTick(isCritical);
      } else if (seconds === 0) {
        sounds.playTimeout();
      }
      prevSecRef.current = seconds;
    }
  }, [seconds, isRunning]);

  const progress = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
  const isCritical = seconds <= 5 && seconds > 0;
  const isTimeUp = seconds === 0;

  // Color mapping based on urgency
  let strokeColor = '#10B981'; // Green
  let textColor = 'text-emerald-400';
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (isTimeUp) {
    strokeColor = '#EF4444'; // Red
    textColor = 'text-red-500 animate-pulse';
    glowColor = 'rgba(239, 68, 68, 0.8)';
  } else if (isCritical) {
    strokeColor = '#EF4444'; // Red urgent
    textColor = 'text-red-400 animate-pulse-fast';
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (progress < 50) {
    strokeColor = '#F59E0B'; // Amber
    textColor = 'text-amber-400';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  // Size configurations
  const dim = size === 'huge' ? 320 : size === 'normal' ? 220 : 130;
  const strokeWidth = size === 'huge' ? 14 : size === 'normal' ? 10 : 7;
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (onSetCustomTotal) {
        onSetCustomTotal(parsed);
      } else if (onReset) {
        onReset(parsed);
      }
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Active Team Floor Badge */}
      {activeTeam && (
        <div
          className={`mb-3 px-5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg ${
            activeTeam === 'A'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-blue-500/20'
              : 'bg-rose-600/30 text-rose-300 border border-rose-500/50 shadow-rose-500/20'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
          Giliran Menjawab: {activeTeam === 'A' ? teamAName : teamBName}
        </div>
      )}

      {/* Circular Glowing Timer */}
      <div
        className="relative flex items-center justify-center rounded-full bg-slate-950/80 backdrop-blur-md shadow-2xl transition-all"
        style={{
          width: dim,
          height: dim,
          boxShadow: `0 0 40px ${glowColor}`,
        }}
      >
        <svg width={dim} height={dim} className="-rotate-90">
          {/* Background Track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Animated Progress Ring */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        {/* Center Countdown Value */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            className={`font-black tracking-tighter leading-none ${textColor} ${
              size === 'huge'
                ? 'text-8xl'
                : size === 'normal'
                ? 'text-6xl'
                : 'text-3xl'
            }`}
          >
            {seconds}
          </span>
          <span
            className={`font-semibold uppercase tracking-widest text-slate-400 mt-1 ${
              size === 'huge' ? 'text-xs' : 'text-[10px]'
            }`}
          >
            {isTimeUp ? 'WAKTU HABIS' : 'DETIK'}
          </span>
        </div>
      </div>

      {/* Control Buttons (Only if showControls is true) */}
      {showControls && (
        <div className="mt-5 flex flex-col items-center gap-3 w-full max-w-sm">
          {/* Main Action Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isRunning ? (
              <button
                onClick={onPause}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-sm transition-all"
              >
                <Pause className="w-4 h-4" /> Jeda
              </button>
            ) : (
              <button
                onClick={onStart}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Mulai
              </button>
            )}

            <button
              onClick={() => onReset?.()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>

            {/* In-Flight +/- 5 Seconds Adjustments */}
            {onAdjustRemaining && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => onAdjustRemaining(5)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold transition-all"
                  title="Tambah 5 detik langsung"
                >
                  +5s
                </button>
                <button
                  onClick={() => onAdjustRemaining(-5)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-bold transition-all"
                  title="Kurangi 5 detik langsung"
                >
                  -5s
                </button>
              </div>
            )}
          </div>

          {/* Preset Pills & Custom Trigger */}
          <div className="flex flex-wrap items-center justify-center gap-1 w-full pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
              Atur:
            </span>
            {[5, 10, 15, 20, 30, 45, 60].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  if (onSetCustomTotal) {
                    onSetCustomTotal(preset);
                  } else if (onReset) {
                    onReset(preset);
                  }
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                  totalSeconds === preset
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {preset}s
              </button>
            ))}

            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all"
              title="Input detik kustom"
            >
              Kustom...
            </button>
          </div>

          {/* Custom Input Form Dropdown */}
          {showCustomInput && (
            <form onSubmit={handleApplyCustom} className="flex items-center gap-1.5 w-full mt-1 animate-fade-in">
              <input
                type="number"
                min="1"
                max="300"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Detik..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shrink-0"
              >
                Terapkan
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
