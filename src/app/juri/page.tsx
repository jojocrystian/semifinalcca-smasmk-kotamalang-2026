'use client';

import React, { useState, useEffect } from 'react';
import { realtime } from '@/lib/realtime';
import { sounds } from '@/lib/audio';
import { AppState } from '@/types/cca';
import { INITIAL_APP_STATE } from '@/lib/initialData';
import { CountdownTimer } from '@/components/CountdownTimer';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Wifi,
  ChevronRight,
  Flame,
  AlertCircle,
  Target,
} from 'lucide-react';

export default function JuryPortalPage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [connection, setConnection] = useState({
    isPeerConnected: false,
    activeClientsCount: 0,
    lastSyncSource: 'Local',
  });
  const [soundMuted, setSoundMuted] = useState(false);
  const [lastJudgedNotice, setLastJudgedNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Initialize WebRTC as Juri Client
    realtime.initPeer('juri');
    setState(realtime.getState());

    const unsubState = realtime.subscribe((newState) => {
      setState(newState);
    });

    const unsubConn = realtime.subscribeConnection((conn) => {
      setConnection(conn);
    });

    return () => {
      unsubState();
      unsubConn();
    };
  }, []);

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleJudgement = (team: 'A' | 'B', isCorrect: boolean) => {
    // Play sound immediately on jury device
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    // Dispatch realtime score
    realtime.dispatch({
      type: 'RECORD_SCORE',
      payload: { team, isCorrect },
    });

    const correctPts = state.match.correctPoints ?? 10;
    const wrongPts = state.match.wrongPoints ?? 0;
    const teamObj = team === 'A' ? teamA : teamB;
    const teamName = teamObj?.name || `Tim ${team}`;
    const resultText = isCorrect
      ? `BENAR (+${correctPts} Poin)`
      : `SALAH (${wrongPts > 0 ? '+' : ''}${wrongPts} Poin)`;

    setLastJudgedNotice(`${teamName}: ${resultText}`);
    setTimeout(() => setLastJudgedNotice(null), 3000);
  };

  const handleStartTimerFor = (team: 'A' | 'B') => {
    realtime.dispatch({
      type: 'START_TIMER',
      payload: { team, seconds: state.settings.defaultTimerSeconds },
    });
  };

  const handlePauseTimer = () => {
    realtime.dispatch({ type: 'PAUSE_TIMER' });
  };

  const handleResetTimer = () => {
    realtime.dispatch({
      type: 'RESET_TIMER',
      payload: { seconds: state.settings.defaultTimerSeconds },
    });
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
            Memuat Portal Dewan Juri CCA 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* Jury Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white">PORTAL DEWAN JURI</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SESI {state.match.sessionNumber} • {state.match.sessionTitle || 'SEMIFINAL'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">CCA SMA & SMK Kota Malang</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Connection Status */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
              <Wifi
                className={`w-3.5 h-3.5 ${
                  connection.isPeerConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="hidden sm:inline font-mono text-[11px] text-amber-300">
                {state.settings.roomCode}
              </span>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={soundMuted ? 'Suara Senyap' : 'Suara Aktif'}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notice Banner on Judgement */}
      {lastJudgedNotice && (
        <div className="max-w-md mx-auto w-full px-4 mt-3 animate-fade-in">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm py-2 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-center">
            <Sparkles className="w-4 h-4" />
            {lastJudgedNotice}
          </div>
        </div>
      )}

      {/* Active Point Rules Banner */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-3">
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              Aturan Poin Realtime:
            </span>
            <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg">
              Benar: +{state.match.correctPoints ?? 10}
            </span>
            <span className="text-xs font-black text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 rounded-lg">
              Salah: {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tersinkron dengan LCD & Admin
          </span>
        </div>
      </div>

      {/* Live Timer Strip */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                PENGATUR WAKTU MENJAWAB
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {state.match.activeAnsweringTeam
                  ? `Sedang Menjawab: Tim ${state.match.activeAnsweringTeam}`
                  : 'Timer Siap Digunakan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <span
                className={`font-black text-2xl ${
                  state.match.timerSeconds <= 5 && state.match.timerSeconds > 0
                    ? 'text-rose-400 animate-pulse'
                    : state.match.timerSeconds === 0
                    ? 'text-red-500'
                    : 'text-amber-400'
                }`}
              >
                {state.match.timerSeconds}
              </span>
              <span className="text-[11px] font-bold text-slate-400">Detik</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {state.match.timerRunning ? (
                <button
                  onClick={handlePauseTimer}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold hover:bg-amber-500/30"
                >
                  Jeda
                </button>
              ) : null}
              <button
                onClick={handleResetTimer}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                title={`Reset Timer (${state.match.timerTotal}s)`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Quick +/- 5s adjustments */}
              <button
                onClick={() => realtime.dispatch({ type: 'ADJUST_TIMER_REMAINING', payload: { deltaSeconds: 5 } })}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700"
                title="Tambah 5 detik"
              >
                +5s
              </button>
              <button
                onClick={() => realtime.dispatch({ type: 'ADJUST_TIMER_REMAINING', payload: { deltaSeconds: -5 } })}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-bold border border-slate-700"
                title="Kurangi 5 detik"
              >
                -5s
              </button>

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center gap-1 ml-1 border-l border-slate-800 pl-2">
                {[5, 10, 15, 30].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => realtime.dispatch({ type: 'SET_CUSTOM_TIMER', payload: { seconds: preset, setAsDefault: false } })}
                    className={`px-2 py-1 rounded text-[11px] font-bold border ${
                      state.match.timerTotal === preset
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {preset}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Jury Control Arena: Team A vs Team B */}
      <main className="max-w-4xl mx-auto w-full px-4 mt-6 flex-1">
        {/* If match teams are not selected yet */}
        {(!state.match.teamAId || !state.match.teamBId) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center mb-6">
            <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-200 text-sm font-semibold">
              Operator belum memulai sesi tanding atau belum memilih tim pada roda putar.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tombol penjurian di bawah tetap aktif dan akan mencatat skor ke sesi saat ini.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ==================== PANEL JURI: TIM A ==================== */}
          <div
            className={`bg-slate-900/90 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-2xl ${
              state.match.activeAnsweringTeam === 'A'
                ? 'border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/30'
                : 'border-blue-500/30'
            }`}
          >
            <div>
              {/* Team A Badge & Score */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3.5 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/40 rounded-full font-black text-xs uppercase tracking-wider">
                  BAGIAN TIM A
                </span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                    SKOR SAAT INI
                  </span>
                  <span className="text-4xl font-black text-blue-400">
                    {state.match.teamAScore}
                  </span>
                </div>
              </div>

              {/* Team A Identity */}
              <div className="mb-5">
                <h2 className="text-2xl font-black text-white">
                  {teamA?.name || 'Tim A'}
                </h2>
                <p className="text-xs text-blue-200/80 font-medium">
                  {teamA?.school || 'Sekolah Belum Terpilih'}
                </p>
              </div>

              {/* Quick Timer Trigger for Team A */}
              <button
                onClick={() => handleStartTimerFor('A')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mb-4 border transition-all ${
                  state.match.activeAnsweringTeam === 'A' && state.match.timerRunning
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-blue-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                {state.match.activeAnsweringTeam === 'A' && state.match.timerRunning
                  ? 'Timer Berjalan...'
                  : 'Mulai Timer Menjawab Tim A'}
              </button>
            </div>

            {/* ACTION BUTTONS TIM A */}
            <div className="space-y-3 mt-4">
              {/* TOMBOL BENAR */}
              <button
                onClick={() => handleJudgement('A', true)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-[0_6px_25px_rgba(16,185,129,0.35)] transition-all"
              >
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                BENAR (+{state.match.correctPoints ?? 10})
              </button>

              {/* TOMBOL SALAH */}
              <button
                onClick={() => handleJudgement('A', false)}
                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border-2 border-slate-700 hover:border-rose-500/50 active:scale-[0.98] text-slate-300 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-md"
              >
                <XCircle className="w-6 h-6 text-rose-400 stroke-[2.5]" />
                SALAH ({(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0})
              </button>
            </div>
          </div>

          {/* ==================== PANEL JURI: TIM B ==================== */}
          <div
            className={`bg-slate-900/90 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-2xl ${
              state.match.activeAnsweringTeam === 'B'
                ? 'border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/30'
                : 'border-rose-500/30'
            }`}
          >
            <div>
              {/* Team B Badge & Score */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/40 rounded-full font-black text-xs uppercase tracking-wider">
                  BAGIAN TIM B
                </span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                    SKOR SAAT INI
                  </span>
                  <span className="text-4xl font-black text-rose-400">
                    {state.match.teamBScore}
                  </span>
                </div>
              </div>

              {/* Team B Identity */}
              <div className="mb-5">
                <h2 className="text-2xl font-black text-white">
                  {teamB?.name || 'Tim B'}
                </h2>
                <p className="text-xs text-rose-200/80 font-medium">
                  {teamB?.school || 'Sekolah Belum Terpilih'}
                </p>
              </div>

              {/* Quick Timer Trigger for Team B */}
              <button
                onClick={() => handleStartTimerFor('B')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mb-4 border transition-all ${
                  state.match.activeAnsweringTeam === 'B' && state.match.timerRunning
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                    : 'bg-slate-950 text-rose-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                {state.match.activeAnsweringTeam === 'B' && state.match.timerRunning
                  ? 'Timer Berjalan...'
                  : 'Mulai Timer Menjawab Tim B'}
              </button>
            </div>

            {/* ACTION BUTTONS TIM B */}
            <div className="space-y-3 mt-4">
              {/* TOMBOL BENAR */}
              <button
                onClick={() => handleJudgement('B', true)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-[0_6px_25px_rgba(16,185,129,0.35)] transition-all"
              >
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                BENAR (+{state.match.correctPoints ?? 10})
              </button>

              {/* TOMBOL SALAH */}
              <button
                onClick={() => handleJudgement('B', false)}
                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border-2 border-slate-700 hover:border-rose-500/50 active:scale-[0.98] text-slate-300 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-md"
              >
                <XCircle className="w-6 h-6 text-rose-400 stroke-[2.5]" />
                SALAH ({(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0})
              </button>
            </div>
          </div>
        </div>

        {/* Recent Actions Feed for Jury Verification */}
        <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Riwayat Penjurian Terakhir:
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {state.scoreLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
              >
                <span className="text-slate-400">{log.timestamp}</span>
                <span className="font-bold text-white">{log.teamName}</span>
                <span
                  className={`font-black ${
                    log.pointsDelta > 0 ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
