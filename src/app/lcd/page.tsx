'use client';

import React, { useState, useEffect, useRef } from 'react';
import { realtime } from '@/lib/realtime';
import { sounds } from '@/lib/audio';
import { AppState, Team } from '@/types/cca';
import { INITIAL_APP_STATE } from '@/lib/initialData';
import { SpinWheel } from '@/components/SpinWheel';
import { CountdownTimer } from '@/components/CountdownTimer';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';
import confetti from 'canvas-confetti';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Target,
} from 'lucide-react';

export default function LcdStagePage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const hideCursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimestampRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    // Initialize WebRTC as LCD Client
    realtime.initPeer('lcd');
    setState(realtime.getState());

    const unsub = realtime.subscribe((newState) => {
      setState(newState);

      // Trigger audio based on new actions if received
      const action = newState.match.lastAction;
      if (action && action.timestamp !== lastActionTimestampRef.current) {
        lastActionTimestampRef.current = action.timestamp;
        if (action.type === 'BENAR') {
          sounds.playCorrect();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: {
              x: action.team === 'A' ? 0.3 : 0.7,
              y: 0.5,
            },
            colors: ['#10B981', '#34D399', '#F59E0B'],
          });
        } else if (action.type === 'SALAH') {
          sounds.playWrong();
        } else if (action.type === 'TIMER_TIMEOUT') {
          sounds.playTimeout();
        }
      }
    });

    // Auto-hide cursor when mouse is idle
    const handleMouseMove = () => {
      setShowCursor(true);
      if (hideCursorTimeoutRef.current) clearTimeout(hideCursorTimeoutRef.current);
      hideCursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsub();
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideCursorTimeoutRef.current) clearTimeout(hideCursorTimeoutRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const teamA = state.teams.find((t) => t.id === state.match.teamAId);
  const teamB = state.teams.find((t) => t.id === state.match.teamBId);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl shadow-lg shadow-amber-500/20 animate-pulse">
            CCA
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Memuat Layar Panggung Semifinal CCA 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden overflow-y-auto select-none relative ${
        showCursor ? '' : 'cursor-none'
      }`}
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating HUD Controls (Fades out when mouse is idle) */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 transition-opacity duration-300 ${
          showCursor ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${
            soundMuted
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={soundMuted ? 'Suara LCD Senyap' : 'Suara LCD Aktif'}
        >
          {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md transition-all"
          title="Mode Layar Penuh (Fullscreen)"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Persistent Elegant Top Bar */}
      <header className="px-6 sm:px-8 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 backdrop-blur-md z-20 sticky top-0 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            CCA
          </div>
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-widest text-amber-400">
              SEMIFINAL CERDAS CERMAT ALKITAB 2026
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              SMA & SMK Kota Malang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE STAGE DISPLAY
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            TIMER: {(state.match.timerTotal || 15) > 60 ? `${Math.floor((state.match.timerTotal || 15) / 60)} Menit` : `${state.match.timerTotal || 15}s`}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            POIN: +{state.match.correctPoints ?? 10} / {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0}
          </span>
          <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            SESI {state.match.sessionNumber} • {state.match.sessionTitle || 'SEMIFINAL'}
          </span>
        </div>
      </header>

      {/* Floating Realtime Action Toast on LCD (Only in match mode) */}
      {state.match.screenMode === 'match' && state.match.lastAction && (Date.now() - state.match.lastAction.timestamp < 3500) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce-soft">
          <div
            className={`px-6 py-3 rounded-2xl border-2 font-black text-lg sm:text-xl shadow-2xl backdrop-blur-md flex items-center gap-3 ${
              state.match.lastAction.type === 'BENAR'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-emerald-500/30'
                : state.match.lastAction.type === 'SALAH'
                ? 'bg-rose-950/90 border-rose-400 text-rose-300 shadow-rose-500/30'
                : 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/30'
            }`}
          >
            {state.match.lastAction.type === 'BENAR' ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>
                  JAWABAN BENAR! {state.match.lastAction.team ? `TIM ${state.match.lastAction.team}` : ''} (+{state.match.lastAction.points} Poin)
                </span>
              </>
            ) : state.match.lastAction.type === 'SALAH' ? (
              <>
                <XCircle className="w-6 h-6 text-rose-400" />
                <span>
                  JAWABAN SALAH / WAKTU HABIS {state.match.lastAction.team ? `TIM ${state.match.lastAction.team}` : ''} ({state.match.lastAction.points > 0 ? '+' : ''}{state.match.lastAction.points} Poin)
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* SCREEN CONTENT (SWITCHED VIA ADMIN) */}
      <main
        className={`flex-1 flex flex-col items-center ${
          state.match.screenMode === 'leaderboard'
            ? 'justify-start py-6 sm:py-10 px-4 sm:px-8'
            : 'justify-center p-6 sm:p-12'
        } relative z-10 w-full`}
      >
        {/* ================= MODE 1: WELCOME / STANDBY ================= */}
        {state.match.screenMode === 'welcome' && (
          <div className="text-center max-w-4xl mx-auto flex flex-col items-center animate-fade-in">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent border-2 border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.3)] mb-6 animate-bounce-soft">
              <BookOpen className="w-12 h-12 text-amber-400" />
            </div>

            <span className="px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-extrabold uppercase tracking-widest mb-4">
              Kompetisi Tingkat Kota Malang
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-none mb-4 drop-shadow-lg">
              CERDAS CERMAT ALKITAB
            </h2>

            <p className="text-xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-8">
              BABAK SEMIFINAL SMA & SMK
            </p>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-6 py-4 max-w-xl text-center shadow-2xl">
              <p className="text-sm sm:text-base text-slate-300 italic font-serif">
                &ldquo;Hendaklah firman Kristus diam dengan segala kekayaannya di antara kamu...&rdquo;
              </p>
              <span className="block mt-1 text-xs font-bold text-amber-400 tracking-wider">
                — Kolose 3:16a
              </span>
            </div>
          </div>
        )}

        {/* ================= MODE 2: SPIN WHEEL (RODA PENGUNDIAN) ================= */}
        {state.match.screenMode === 'spin' && (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs sm:text-sm font-extrabold uppercase tracking-wider border border-amber-500/40 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {state.match.isSpinning
                  ? `Sedang Mengundi Tim ${state.match.wheelCandidateSlot || (!state.match.teamAId ? 'A' : 'B')}...`
                  : 'Pengundian Tim Semifinal'}
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                PENGUNDIAN SESI {state.match.sessionNumber}
              </h2>
              <p className="text-amber-300 font-bold text-sm sm:text-base mt-1">
                {state.match.sessionTitle || 'Babak Semifinal'} — Dua tim terpilih akan bertanding
              </p>
            </div>

            {/* Main Stage Grid: Wheel on Left, Slots & Winner Announcement on Right */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
              {/* Wheel Center/Left */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                <SpinWheel
                  teams={state.teams}
                  targetSlot={!state.match.teamAId ? 'A' : 'B'}
                  spinData={state.match.spinData}
                  size={460}
                  readOnly={true} // Controlled by admin
                  showWinnerModal={true}
                />
              </div>

              {/* Selected Slots on Right */}
              <div className="lg:col-span-5 flex flex-col gap-4 w-full">
                {/* Slot Tim A */}
                <div
                  className={`rounded-3xl p-6 border-2 transition-all ${
                    teamA
                      ? 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.3)]'
                      : state.match.isSpinning && state.match.wheelCandidateSlot === 'A'
                      ? 'bg-blue-950/40 border-blue-400/80 animate-pulse'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3.5 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-full font-black text-xs uppercase tracking-wider">
                      SLOT TIM A
                    </span>
                    {teamA ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Terpilih
                      </span>
                    ) : state.match.isSpinning && state.match.wheelCandidateSlot === 'A' ? (
                      <span className="text-xs font-bold text-amber-400 animate-pulse">
                        Sedang Diputar...
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Menunggu Spin</span>
                    )}
                  </div>
                  {teamA ? (
                    <div>
                      <h3 className="text-2xl font-black text-white">{teamA.name}</h3>
                      <p className="text-sm text-blue-200/90 font-medium mt-1">{teamA.school}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic mt-1">
                      {state.match.isSpinning && state.match.wheelCandidateSlot === 'A'
                        ? 'Roda sedang berputar mencari Tim A...'
                        : 'Menunggu putaran roda untuk Tim A'}
                    </p>
                  )}
                </div>

                {/* VS Divider */}
                <div className="flex items-center justify-center -my-1">
                  <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-black text-xs">
                    VS
                  </span>
                </div>

                {/* Slot Tim B */}
                <div
                  className={`rounded-3xl p-6 border-2 transition-all ${
                    teamB
                      ? 'bg-gradient-to-r from-rose-950/80 to-slate-900 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
                      : state.match.isSpinning && state.match.wheelCandidateSlot === 'B'
                      ? 'bg-rose-950/40 border-rose-400/80 animate-pulse'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3.5 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-full font-black text-xs uppercase tracking-wider">
                      SLOT TIM B
                    </span>
                    {teamB ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Terpilih
                      </span>
                    ) : state.match.isSpinning && state.match.wheelCandidateSlot === 'B' ? (
                      <span className="text-xs font-bold text-amber-400 animate-pulse">
                        Sedang Diputar...
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Menunggu Spin</span>
                    )}
                  </div>
                  {teamB ? (
                    <div>
                      <h3 className="text-2xl font-black text-white">{teamB.name}</h3>
                      <p className="text-sm text-rose-200/90 font-medium mt-1">{teamB.school}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic mt-1">
                      {state.match.isSpinning && state.match.wheelCandidateSlot === 'B'
                        ? 'Roda sedang berputar mencari Tim B...'
                        : 'Menunggu putaran roda untuk Tim B'}
                    </p>
                  )}
                </div>

                {/* Ready Status Callout */}
                {teamA && teamB && (
                  <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400/50 rounded-2xl p-4 text-center animate-fade-in shadow-xl shadow-amber-500/10">
                    <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full mb-1">
                      KEDUA TIM LENGKAP
                    </span>
                    <h4 className="text-lg font-black text-white">
                      {teamA.name} <span className="text-amber-400">VS</span> {teamB.name}
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Silakan kedua tim naik ke atas panggung untuk bertanding
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 3: MATCH 1 VS 1 DUEL ARENA ================= */}
        {state.match.screenMode === 'match' && (
          <div className="w-full max-w-7xl mx-auto flex flex-col justify-between h-full animate-fade-in">
            {/* Arena Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
              {/* TIM A CARD (BLUE CORNER) */}
              <div
                className={`lg:col-span-4 rounded-3xl p-8 border-4 transition-all duration-300 relative overflow-hidden ${
                  state.match.activeAnsweringTeam === 'A'
                    ? 'bg-gradient-to-b from-blue-950/80 to-slate-950 border-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.5)] scale-[1.03]'
                    : 'bg-slate-900/80 border-blue-500/30'
                }`}
              >
                {/* Active Answering Indicator Ring */}
                {state.match.activeAnsweringTeam === 'A' && (
                  <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="px-4 py-1.5 bg-blue-600/30 text-blue-300 border border-blue-500/50 rounded-full font-black text-xs uppercase tracking-widest">
                    TIM A
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Kategori {teamA?.category || 'SMA'}
                  </span>
                </div>

                <div className="min-h-[100px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                    {teamA?.name || 'Tim A'}
                  </h3>
                  <p className="text-base text-blue-200/90 font-semibold mt-1">
                    {teamA?.school || 'Menunggu Penentuan Tim'}
                  </p>
                </div>

                {/* GIANT SCORE */}
                <div className="mt-8 bg-slate-950/90 rounded-3xl p-6 text-center border border-blue-500/30 shadow-inner">
                  <span className="text-8xl sm:text-9xl font-black text-blue-400 tracking-tighter drop-shadow-[0_4px_20px_rgba(59,130,246,0.5)]">
                    {state.match.teamAScore}
                  </span>
                  <span className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-2">
                    POIN
                  </span>
                </div>
              </div>

              {/* CENTER CONSOLE: TIMER & VS */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center my-4 lg:my-0">
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full">
                      {state.match.sessionTitle || 'Babak Semifinal'}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                      <Target className="w-3 h-3 text-emerald-400" />
                      +{state.match.correctPoints ?? 10} / {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0}
                    </span>
                  </div>
                  <span className="px-5 py-2 rounded-2xl bg-slate-900 border-2 border-slate-800 text-amber-400 font-black text-lg tracking-wider shadow-2xl">
                    VS
                  </span>
                </div>

                {/* Giant Stage Countdown Timer */}
                <CountdownTimer
                  seconds={state.match.timerSeconds}
                  totalSeconds={state.match.timerTotal}
                  isRunning={state.match.timerRunning}
                  expiresAt={state.match.timerExpiresAt}
                  activeTeam={state.match.activeAnsweringTeam}
                  teamAName={teamA?.name}
                  teamBName={teamB?.name}
                  size="huge"
                />

                {/* Floor Answering Tagline */}
                {state.match.activeAnsweringTeam ? (
                  <div className="mt-6 text-center animate-bounce-soft">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30">
                      WAKTU MENJAWAB BERJALAN
                    </span>
                  </div>
                ) : (
                  <div className="mt-6 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Menunggu Pembacaan Soal oleh Moderator
                    </span>
                  </div>
                )}
              </div>

              {/* TIM B CARD (RED CORNER) */}
              <div
                className={`lg:col-span-4 rounded-3xl p-8 border-4 transition-all duration-300 relative overflow-hidden ${
                  state.match.activeAnsweringTeam === 'B'
                    ? 'bg-gradient-to-b from-rose-950/80 to-slate-950 border-rose-400 shadow-[0_0_60px_rgba(244,63,94,0.5)] scale-[1.03]'
                    : 'bg-slate-900/80 border-rose-500/30'
                }`}
              >
                {/* Active Answering Indicator Ring */}
                {state.match.activeAnsweringTeam === 'B' && (
                  <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-rose-400 to-pink-400 animate-pulse" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="px-4 py-1.5 bg-rose-600/30 text-rose-300 border border-rose-500/50 rounded-full font-black text-xs uppercase tracking-widest">
                    TIM B
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Kategori {teamB?.category || 'SMA'}
                  </span>
                </div>

                <div className="min-h-[100px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                    {teamB?.name || 'Tim B'}
                  </h3>
                  <p className="text-base text-rose-200/90 font-semibold mt-1">
                    {teamB?.school || 'Menunggu Penentuan Tim'}
                  </p>
                </div>

                {/* GIANT SCORE */}
                <div className="mt-8 bg-slate-950/90 rounded-3xl p-6 text-center border border-rose-500/30 shadow-inner">
                  <span className="text-8xl sm:text-9xl font-black text-rose-400 tracking-tighter drop-shadow-[0_4px_20px_rgba(244,63,94,0.5)]">
                    {state.match.teamBScore}
                  </span>
                  <span className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-2">
                    POIN
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <footer className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>
                  Aturan Poin Sesi Ini: Benar = +{state.match.correctPoints ?? 10} Poin | Salah / Tidak Menjawab = {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0} Poin
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sistem Penjurian & Skor Terintegrasi Realtime</span>
              </div>
            </footer>
          </div>
        )}

        {/* ================= MODE 4: LEADERBOARD & PODIUM (3 BESAR) ================= */}
        {state.match.screenMode === 'leaderboard' && (
          <div className="w-full animate-fade-in">
            <LeaderboardPodium teams={state.teams} fullscreen={true} />
          </div>
        )}
      </main>
    </div>
  );
}
