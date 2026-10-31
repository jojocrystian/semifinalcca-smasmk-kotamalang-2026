'use client';

import React, { useState, useEffect } from 'react';
import { realtime } from '@/lib/realtime';
import { sounds } from '@/lib/audio';
import { AppState, ScreenMode, Team } from '@/types/cca';
import { INITIAL_APP_STATE } from '@/lib/initialData';
import { SpinWheel } from '@/components/SpinWheel';
import { CountdownTimer } from '@/components/CountdownTimer';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';
import { exportTeamsToCSV, exportLogsToCSV, GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/sheets';
import {
  Trophy,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Users,
  Settings,
  Tv,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Radio,
  Flame,
  Clock,
  ShieldCheck,
  Award,
  Edit3,
  Sliders,
  Check,
  Target,
} from 'lucide-react';

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [connection, setConnection] = useState({
    isPeerConnected: false,
    activeClientsCount: 0,
    lastSyncSource: 'Local',
  });
  const [activeTab, setActiveTabState] = useState<'match' | 'spin' | 'teams' | 'sheets'>('match');

  const setActiveTab = (tab: 'match' | 'spin' | 'teams' | 'sheets') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cca_admin_tab', tab);
      } catch {}
    }
  };

  const [soundMuted, setSoundMuted] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Custom Session Modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionInputNumber, setSessionInputNumber] = useState<number>(1);
  const [sessionInputTitle, setSessionInputTitle] = useState<string>('Babak Semifinal');

  // Custom Timer Modal state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [customTimerInput, setCustomTimerInput] = useState<number>(15);
  const [customTimerUnit, setCustomTimerUnit] = useState<'detik' | 'menit'>('detik');

  const formatDurationDisplay = (totalSec: number) => {
    if (totalSec < 60) return `${totalSec}s`;
    const m = Math.floor(totalSec / 60);
    const r = totalSec % 60;
    return r === 0 ? `${m} Menit` : `${m}m ${r}s`;
  };

  // Custom Points Rules Modal state
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [correctPointsInput, setCorrectPointsInput] = useState<number>(10);
  const [wrongPointsInput, setWrongPointsInput] = useState<number>(0);

  // Direct Score Editing Modal state
  const [directScoreTarget, setDirectScoreTarget] = useState<'A' | 'B' | null>(null);
  const [directScoreInput, setDirectScoreInput] = useState<number>(0);

  // New team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSchool, setNewTeamSchool] = useState('');
  const [newTeamCategory, setNewTeamCategory] = useState<'SMA' | 'SMK'>('SMA');

  // Sheet webhook input state
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const savedTab = sessionStorage.getItem('cca_admin_tab') as 'match' | 'spin' | 'teams' | 'sheets' | null;
        if (savedTab && ['match', 'spin', 'teams', 'sheets'].includes(savedTab)) {
          setActiveTabState(savedTab);
        }
      } catch {}
    }
    // Initialize WebRTC as Admin Host
    realtime.initPeer('admin');
    setState(realtime.getState());

    const unsubState = realtime.subscribe((newState) => {
      setState(newState);
      setWebhookUrlInput(newState.settings.googleSheetsWebhookUrl || '');
      setSessionInputNumber(newState.match.sessionNumber);
      setSessionInputTitle(newState.match.sessionTitle || 'Babak Semifinal');
      setCustomTimerInput(newState.match.timerTotal || 15);
      setCorrectPointsInput(newState.match.correctPoints ?? 10);
      setWrongPointsInput(newState.match.wrongPoints ?? 0);
    });

    const unsubConn = realtime.subscribeConnection((conn) => {
      setConnection(conn);
    });

    return () => {
      unsubState();
      unsubConn();
    };
  }, []);

  const handleSaveSession = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    realtime.dispatch({
      type: 'SET_SESSION',
      payload: {
        sessionNumber: Number(sessionInputNumber) || 1,
        sessionTitle: sessionInputTitle.trim() || 'Babak Semifinal',
      },
    });
    setShowSessionModal(false);
  };

  const handleQuickSessionDelta = (delta: number) => {
    const nextSession = Math.max(1, state.match.sessionNumber + delta);
    realtime.dispatch({
      type: 'SET_SESSION',
      payload: {
        sessionNumber: nextSession,
        sessionTitle: state.match.sessionTitle,
      },
    });
  };

  const handleSetCustomTimer = (sec: number, setAsDefault: boolean = true) => {
    realtime.dispatch({
      type: 'SET_CUSTOM_TIMER',
      payload: { seconds: sec, setAsDefault },
    });
    setShowTimerModal(false);
  };

  const handleAdjustTimerRemaining = (delta: number) => {
    realtime.dispatch({
      type: 'ADJUST_TIMER_REMAINING',
      payload: { deltaSeconds: delta },
    });
  };

  const handleSavePointsRules = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    realtime.dispatch({
      type: 'SET_POINT_RULES',
      payload: {
        correctPoints: Number(correctPointsInput) || 0,
        wrongPoints: Number(wrongPointsInput) || 0,
      },
    });
    setShowPointsModal(false);
  };

  const handleApplyPointsPreset = (correct: number, wrong: number) => {
    setCorrectPointsInput(correct);
    setWrongPointsInput(wrong);
    realtime.dispatch({
      type: 'SET_POINT_RULES',
      payload: {
        correctPoints: correct,
        wrongPoints: wrong,
      },
    });
    setShowPointsModal(false);
  };

  const handleOpenDirectScore = (team: 'A' | 'B') => {
    setDirectScoreTarget(team);
    setDirectScoreInput(team === 'A' ? state.match.teamAScore : state.match.teamBScore);
  };

  const handleSaveDirectScore = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!directScoreTarget) return;
    realtime.dispatch({
      type: 'SET_EXACT_SCORE',
      payload: {
        team: directScoreTarget,
        score: Math.max(0, Number(directScoreInput) || 0),
      },
    });
    setDirectScoreTarget(null);
  };

  // Audio and sound toggling

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const copyUrlToClipboard = (type: 'juri' | 'lcd') => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/${type}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const setScreenMode = (mode: ScreenMode) => {
    realtime.dispatch({ type: 'SET_SCREEN_MODE', payload: mode });
  };

  const handleSpinComplete = (team: Team, slot: 'A' | 'B') => {
    realtime.dispatch({
      type: 'SPIN_RESULT',
      payload: { teamId: team.id, slot },
    });
  };

  const handleSpinTrigger = (slot: 'A' | 'B') => {
    const availableTeams = state.teams.filter((t) => !t.isEliminatedFromWheel);
    if (availableTeams.length === 0) {
      alert('Semua tim sudah ter-spin! Silakan klik "Reset Roda" jika ingin mengulang.');
      return;
    }

    // Pick random winner from available teams
    const numSlices = availableTeams.length;
    const winningIndex = Math.floor(Math.random() * numSlices);
    const winningTeam = availableTeams[winningIndex];

    const arc = (Math.PI * 2) / numSlices;
    const targetSliceAngle = winningIndex * arc + arc / 2;
    const pointerAngle = (3 * Math.PI) / 2;
    const extraRotations = 7 + Math.floor(Math.random() * 3);
    const targetAngle = extraRotations * (Math.PI * 2) + (pointerAngle - targetSliceAngle);
    const duration = 6500;
    const startTime = Date.now();

    // Broadcast SPIN_START so BOTH Admin and LCD spin simultaneously
    realtime.dispatch({
      type: 'SPIN_START',
      payload: {
        targetTeamId: winningTeam.id,
        slot,
        targetAngle,
        duration,
        startTime,
      },
    });
  };

  const startMatchWithSpunTeams = () => {
    if (!state.match.teamAId || !state.match.teamBId) {
      alert('Silakan spin atau pilih Tim A dan Tim B terlebih dahulu!');
      return;
    }
    realtime.dispatch({
      type: 'SELECT_TEAMS_FOR_MATCH',
      payload: {
        teamAId: state.match.teamAId,
        teamBId: state.match.teamBId,
      },
    });
    setActiveTab('match');
  };

  const handleScore = (team: 'A' | 'B', isCorrect: boolean) => {
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
    realtime.dispatch({
      type: 'RECORD_SCORE',
      payload: { team, isCorrect },
    });
  };

  const handleAdjustScore = (team: 'A' | 'B', delta: number) => {
    realtime.dispatch({
      type: 'ADJUST_SCORE',
      payload: { team, delta },
    });
  };

  const handleStartTimerForTeam = (team: 'A' | 'B') => {
    const sec = state.match.timerSeconds > 0 ? state.match.timerSeconds : (state.match.timerTotal || state.settings.defaultTimerSeconds);
    realtime.dispatch({
      type: 'START_TIMER',
      payload: { team, seconds: sec },
    });
  };

  const handlePauseTimer = () => {
    realtime.dispatch({ type: 'PAUSE_TIMER' });
  };

  const handleResetTimer = (seconds?: number) => {
    realtime.dispatch({
      type: 'RESET_TIMER',
      payload: { seconds: seconds || state.match.timerTotal || state.settings.defaultTimerSeconds },
    });
  };

  const handleFinishMatch = () => {
    if (confirm('Apakah yakin ingin menyelesaikan sesi pertandingan ini dan mengarahkan layar LCD ke mode standby?')) {
      realtime.dispatch({ type: 'FINISH_MATCH_SESSION' });
    }
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamSchool.trim()) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      school: newTeamSchool.trim(),
      category: newTeamCategory,
      color: '#3B82F6',
      totalScore: 0,
      hasPlayed: false,
      isEliminatedFromWheel: false,
    };

    realtime.dispatch({
      type: 'UPDATE_TEAMS',
      payload: [...state.teams, newTeam],
    });

    setNewTeamName('');
    setNewTeamSchool('');
  };

  const handleDeleteTeam = (id: string) => {
    if (confirm('Hapus tim ini dari daftar?')) {
      realtime.dispatch({
        type: 'UPDATE_TEAMS',
        payload: state.teams.filter((t) => t.id !== id),
      });
    }
  };

  const handleResetWheel = () => {
    if (confirm('Reset status putaran roda? Semua tim akan kembali tersedia di roda.')) {
      realtime.dispatch({
        type: 'UPDATE_TEAMS',
        payload: state.teams.map((t) => ({ ...t, isEliminatedFromWheel: false })),
      });
    }
  };

  const handleSaveWebhook = () => {
    realtime.dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { googleSheetsWebhookUrl: webhookUrlInput },
    });
    alert('URL Google Sheets Webhook berhasil disimpan!');
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
            Memuat Portal Master Admin CCA 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              CCA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  PORTAL MASTER ADMIN
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SEMIFINAL 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cerdas Cermat Alkitab SMA & SMK Kota Malang
              </p>
            </div>
          </div>

          {/* Quick Links, Sync Status & Audio */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Custom Session Button */}
            <button
              onClick={() => {
                setSessionInputNumber(state.match.sessionNumber);
                setSessionInputTitle(state.match.sessionTitle || 'Babak Semifinal');
                setShowSessionModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Atur nomor sesi dan nama/judul babak"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Sesi {state.match.sessionNumber}</span>
              <span className="opacity-80 hidden md:inline">• {state.match.sessionTitle || 'Semifinal'}</span>
            </button>

            {/* Custom Timer Button */}
            <button
              onClick={() => {
                setCustomTimerInput(state.match.timerTotal || 15);
                setShowTimerModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Atur durasi timer kustom"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{formatDurationDisplay(state.match.timerTotal)}</span>
            </button>

            {/* Custom Points Button */}
            <button
              onClick={() => {
                setCorrectPointsInput(state.match.correctPoints ?? 10);
                setWrongPointsInput(state.match.wrongPoints ?? 0);
                setShowPointsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Atur aturan poin benar dan salah"
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Poin: +{state.match.correctPoints ?? 10} / {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0}</span>
            </button>

            {/* Realtime Status Indicator */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connection.isPeerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300 hidden sm:inline">Room:</span>
              <strong className="text-amber-300">{state.settings.roomCode}</strong>
            </div>

            {/* Quick Link Juri */}
            <button
              onClick={() => copyUrlToClipboard('juri')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition-all"
              title="Salin link Portal Juri untuk dibagikan ke HP / Tablet juri"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copiedLink === 'juri' ? 'Tersalin!' : 'Link Juri'}
            </button>

            {/* Quick Open LCD */}
            <a
              href="/lcd"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition-all"
              title="Buka tampilan LCD Proyektor di tab / monitor baru"
            >
              <Tv className="w-3.5 h-3.5" />
              Buka LCD
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={soundMuted ? 'Suara Senyap' : 'Suara Aktif'}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* LCD Screen Mode Control Quick Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Tampilan Layar LCD Panggung:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'welcome', label: 'Standby / Sambutan', icon: Tv },
                { id: 'spin', label: 'Roda Spin Tim', icon: Sparkles },
                { id: 'match', label: 'Tanding 1 vs 1', icon: Flame },
                { id: 'leaderboard', label: '3 Besar & Podium', icon: Trophy },
              ] as const
            ).map((mode) => {
              const Icon = mode.icon;
              const isActive = state.match.screenMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setScreenMode(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex gap-2 sm:gap-6 overflow-x-auto py-2">
          {[
            { id: 'spin', label: '1. Roda Putar (Spinwheel)', icon: Sparkles },
            { id: 'match', label: '2. Sesi Tanding & Skor', icon: Flame },
            { id: 'teams', label: '3. Manajemen Tim', icon: Users },
            { id: 'sheets', label: '4. Backup Spreadsheet & Log', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {/* TAB 1: SPIN WHEEL */}
        {activeTab === 'spin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Wheel Canvas Section */}
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-xl">
              <div className="w-full flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Roda Pengundian Semifinal
                  </h2>
                  <p className="text-xs text-slate-400">
                    Putar roda untuk menentukan 2 tim yang akan bertanding di Sesi {state.match.sessionNumber}
                  </p>
                </div>
                <button
                  onClick={handleResetWheel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
                  title="Kembalikan semua tim yang sudah terspin ke roda"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Roda
                </button>
              </div>

              {/* SpinWheel Component */}
              <SpinWheel
                teams={state.teams}
                targetSlot={!state.match.teamAId ? 'A' : 'B'}
                spinData={state.match.spinData}
                onSpinTrigger={handleSpinTrigger}
                onSpinComplete={handleSpinComplete}
                size={420}
              />
            </div>

            {/* Duel Staging Box (Tim A vs Tim B for Upcoming Match) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" /> Tim Yang Akan Tanding
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                    Sesi {state.match.sessionNumber}
                  </span>
                </div>

                {/* Slot Tim A */}
                <div className="bg-slate-950/80 border-2 border-blue-500/40 rounded-2xl p-4 mb-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                      SLOT TIM A
                    </span>
                    {teamA ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Siap
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Menunggu Spin...</span>
                    )}
                  </div>
                  {teamA ? (
                    <div className="mt-2">
                      <h4 className="text-lg font-black text-white">{teamA.name}</h4>
                      <p className="text-xs text-blue-200/80">{teamA.school}</p>
                    </div>
                  ) : (
                    <div className="mt-2 text-slate-500 text-sm italic">
                      Putar roda pertama untuk menentukan Tim A
                    </div>
                  )}
                </div>

                {/* VS Divider */}
                <div className="flex items-center justify-center -my-1">
                  <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-black text-xs flex items-center justify-center shadow-lg">
                    VS
                  </span>
                </div>

                {/* Slot Tim B */}
                <div className="bg-slate-950/80 border-2 border-rose-500/40 rounded-2xl p-4 mt-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-rose-400 tracking-wider">
                      SLOT TIM B
                    </span>
                    {teamB ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Siap
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Menunggu Spin...</span>
                    )}
                  </div>
                  {teamB ? (
                    <div className="mt-2">
                      <h4 className="text-lg font-black text-white">{teamB.name}</h4>
                      <p className="text-xs text-rose-200/80">{teamB.school}</p>
                    </div>
                  ) : (
                    <div className="mt-2 text-slate-500 text-sm italic">
                      Putar roda kedua untuk menentukan Tim B
                    </div>
                  )}
                </div>

                {/* Launch Button to Stage */}
                <button
                  onClick={startMatchWithSpunTeams}
                  disabled={!state.match.teamAId || !state.match.teamBId}
                  className={`w-full mt-6 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                    state.match.teamAId && state.match.teamBId
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 hover:scale-[1.02]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Pertandingan di LCD Panggung
                </button>
              </div>

              {/* Status List of Wheel Candidates */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 text-xs">
                <h4 className="font-bold text-slate-300 mb-2">Status Tim Semifinalis:</h4>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {state.teams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80"
                    >
                      <div>
                        <span className="font-bold text-white mr-2">{t.name}</span>
                        <span className="text-slate-400 text-[11px]">{t.school}</span>
                      </div>
                      {t.isEliminatedFromWheel ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Sudah Di-spin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Siap di Roda
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MATCH CONTROLLER */}
        {activeTab === 'match' && (
          <div className="flex flex-col gap-8">
            {/* Session Indicator Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                    PERTANDINGAN BERLANGSUNG
                  </span>
                  <button
                    onClick={() => {
                      setSessionInputNumber(state.match.sessionNumber);
                      setSessionInputTitle(state.match.sessionTitle || 'Babak Semifinal');
                      setShowSessionModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Atur Sesi & Judul
                  </button>
                  <button
                    onClick={() => {
                      setCorrectPointsInput(state.match.correctPoints ?? 10);
                      setWrongPointsInput(state.match.wrongPoints ?? 0);
                      setShowPointsModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all shadow-sm"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-400" /> Aturan Poin: Benar +{state.match.correctPoints ?? 10} | Salah {(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0}
                  </button>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Sesi {state.match.sessionNumber}: {state.match.sessionTitle || 'Babak Semifinal'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Skor di bawah tersinkronisasi langsung dengan Layar LCD Panggung & Portal Juri
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleFinishMatch}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
                  title="Selesaikan sesi pertandingan dan arahkan layar LCD panggung ke mode standby"
                >
                  <CheckCircle2 className="w-5 h-5" /> Selesaikan Sesi (Layar Standby)
                </button>
              </div>
            </div>

            {/* Duel Arena Score & Timer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* TIM A CARD */}
              <div
                className={`lg:col-span-4 rounded-3xl p-6 border-2 transition-all ${
                  state.match.activeAnsweringTeam === 'A'
                    ? 'bg-blue-950/50 border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-900/80 border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 font-extrabold text-xs rounded-full border border-blue-500/30">
                    TIM A
                  </span>
                  <span className="text-xs text-slate-400">
                    Total: <strong className="text-white">{teamA?.totalScore || 0} pts</strong>
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white truncate">
                  {teamA?.name || 'Belum Dipilih'}
                </h3>
                <p className="text-xs text-blue-200/80 truncate mb-6">
                  {teamA?.school || 'Pilih tim pada tab Spin'}
                </p>

                {/* Score Number Display */}
                <div className="bg-slate-950 rounded-2xl p-6 text-center border border-blue-500/20 mb-6">
                  <span className="text-7xl font-black text-blue-400 tracking-tight">
                    {state.match.teamAScore}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-2">
                    POIN SESI INI
                  </p>
                  <button
                    onClick={() => handleOpenDirectScore('A')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-all"
                    title="Ubah nilai skor langsung secara manual"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Skor Langsung
                  </button>
                </div>

                {/* Answering Floor & Quick Score Button */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartTimerForTeam('A')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                  >
                    <Clock className="w-4 h-4" /> Tim A Menjawab (Mulai Timer)
                  </button>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => handleScore('A', true)}
                      className="py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Benar (+{state.match.correctPoints ?? 10})
                    </button>
                    <button
                      onClick={() => handleScore('A', false)}
                      className="py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" /> Salah ({(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0})
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                    <span>Koreksi Manual:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAdjustScore('A', 10)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Tambah 10 poin"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleAdjustScore('A', -10)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Kurang 10 poin"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => handleAdjustScore('A', 5)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Tambah 5 poin"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleAdjustScore('A', -5)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Kurang 5 poin"
                      >
                        -5
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER TIMER CONSOLE */}
              <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center shadow-xl">
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    TIMER MENJAWAB LCD
                  </span>
                  <button
                    onClick={() => {
                      setCustomTimerInput(state.match.timerTotal || 15);
                      setShowTimerModal(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-500/40 transition-all shadow-sm"
                    title="Atur durasi timer kustom"
                  >
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>Durasi: {formatDurationDisplay(state.match.timerTotal)}</span>
                  </button>
                </div>

                <CountdownTimer
                  seconds={state.match.timerSeconds}
                  totalSeconds={state.match.timerTotal}
                  isRunning={state.match.timerRunning}
                  expiresAt={state.match.timerExpiresAt}
                  activeTeam={state.match.activeAnsweringTeam}
                  teamAName={teamA?.name}
                  teamBName={teamB?.name}
                  size="normal"
                  showControls={true}
                  onStart={() =>
                    realtime.dispatch({
                      type: 'START_TIMER',
                      payload: { seconds: state.match.timerSeconds },
                    })
                  }
                  onPause={handlePauseTimer}
                  onReset={handleResetTimer}
                  onAdjustRemaining={handleAdjustTimerRemaining}
                  onSetCustomTotal={(sec) => handleSetCustomTimer(sec, true)}
                />

              </div>

              {/* TIM B CARD */}
              <div
                className={`lg:col-span-4 rounded-3xl p-6 border-2 transition-all ${
                  state.match.activeAnsweringTeam === 'B'
                    ? 'bg-rose-950/50 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
                    : 'bg-slate-900/80 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 bg-rose-600/20 text-rose-300 font-extrabold text-xs rounded-full border border-rose-500/30">
                    TIM B
                  </span>
                  <span className="text-xs text-slate-400">
                    Total: <strong className="text-white">{teamB?.totalScore || 0} pts</strong>
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white truncate">
                  {teamB?.name || 'Belum Dipilih'}
                </h3>
                <p className="text-xs text-rose-200/80 truncate mb-6">
                  {teamB?.school || 'Pilih tim pada tab Spin'}
                </p>

                {/* Score Number Display */}
                <div className="bg-slate-950 rounded-2xl p-6 text-center border border-rose-500/20 mb-6">
                  <span className="text-7xl font-black text-rose-400 tracking-tight">
                    {state.match.teamBScore}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-2">
                    POIN SESI INI
                  </p>
                  <button
                    onClick={() => handleOpenDirectScore('B')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all"
                    title="Ubah nilai skor langsung secara manual"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Skor Langsung
                  </button>
                </div>

                {/* Answering Floor & Quick Score Button */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartTimerForTeam('B')}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
                  >
                    <Clock className="w-4 h-4" /> Tim B Menjawab (Mulai Timer)
                  </button>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => handleScore('B', true)}
                      className="py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Benar (+{state.match.correctPoints ?? 10})
                    </button>
                    <button
                      onClick={() => handleScore('B', false)}
                      className="py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" /> Salah ({(state.match.wrongPoints ?? 0) > 0 ? '+' : ''}{state.match.wrongPoints ?? 0})
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                    <span>Koreksi Manual:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAdjustScore('B', 10)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Tambah 10 poin"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleAdjustScore('B', -10)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Kurang 10 poin"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => handleAdjustScore('B', 5)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Tambah 5 poin"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleAdjustScore('B', -5)}
                        className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-bold"
                        title="Kurang 5 poin"
                      >
                        -5
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Scoring History Log */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
              <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Log Penjurian Sesi Ini
              </h4>
              {state.scoreLogs.length === 0 ? (
                <p className="text-slate-500 text-xs italic">Belum ada penilaian yang tercatat.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {state.scoreLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{log.timestamp}</span>
                        <strong className="text-white">{log.teamName}</strong>
                        <span className="text-slate-400">({log.school})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            log.pointsDelta > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-slate-400">Skor: {log.scoreAfter}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEAM MANAGEMENT */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add Team Form */}
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="font-extrabold text-white text-lg mb-1 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" /> Tambah Tim Semifinalis
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Daftarkan tim SMA / SMK yang lolos ke babak semifinal
              </p>

              <form onSubmit={handleAddTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Nama Tim
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Contoh: Tim Santo Paulus"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Asal Sekolah
                  </label>
                  <input
                    type="text"
                    value={newTeamSchool}
                    onChange={(e) => setNewTeamSchool(e.target.value)}
                    placeholder="Contoh: SMA Katolik Cor Jesu Malang"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Kategori Sekolah
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTeamCategory('SMA')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        newTeamCategory === 'SMA'
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      SMA
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTeamCategory('SMK')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        newTeamCategory === 'SMK'
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      SMK
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/25 transition-all mt-2"
                >
                  Tambah Tim ke Daftar
                </button>
              </form>
            </div>

            {/* Team List Table */}
            <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-white text-lg">
                    Daftar Tim Semifinalis ({state.teams.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kelola nama, sekolah, dan akumulasi poin peserta
                  </p>
                </div>

                <button
                  onClick={() => exportTeamsToCSV(state.teams)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Ekspor CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Tim</th>
                      <th className="py-2.5 px-3">Asal Sekolah</th>
                      <th className="py-2.5 px-3 text-center">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Total Skor</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {state.teams.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{t.name}</td>
                        <td className="py-2.5 px-3 text-slate-300">{t.school}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">
                          {t.totalScore}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteTeam(t.id)}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                            title="Hapus Tim"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP SPREADSHEET & PODIUM */}
        {activeTab === 'sheets' && (
          <div className="space-y-8">
            {/* Google Sheets Integration Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">
                    Integrasi Database Cadangan: Google Spreadsheet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sinkronisasi otomatis hasil skor pertandingan ke Google Sheets panitia
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="Tempel URL Google Apps Script Web App di sini (https://script.google.com/macros/s/.../exec)"
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Simpan URL Webhook
                </button>
              </div>

              {/* Instructions and Apps Script Code Snippet */}
              <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Kode Google Apps Script untuk Spreadsheet:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
                  >
                    {copiedScript ? 'Tersalin ke Clipboard!' : 'Salin Kode Script'}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto p-3 bg-slate-900 rounded-xl max-h-48">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>

              {/* Instant CSV Downloads */}
              <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-slate-800">
                <button
                  onClick={() => exportTeamsToCSV(state.teams)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Unduh CSV Skor Lengkap
                </button>
                <button
                  onClick={() => exportLogsToCSV(state.scoreLogs)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition-all"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  Unduh CSV Log Penjurian
                </button>
              </div>
            </div>

            {/* Preview of Top 3 Leaderboard */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <LeaderboardPodium teams={state.teams} logs={state.scoreLogs} />
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL ATUR SESI & JUDUL ================= */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" /> Atur Sesi Pertandingan
              </h3>
              <button
                onClick={() => setShowSessionModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Ubah nomor sesi dan nama babak yang tampil di LCD Panggung dan Portal Juri.
            </p>

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Nomor Sesi
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionInputNumber(Math.max(1, sessionInputNumber - 1))}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={sessionInputNumber}
                    onChange={(e) => setSessionInputNumber(parseInt(e.target.value, 10) || 1)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-white font-black text-lg focus:outline-none focus:border-amber-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setSessionInputNumber(sessionInputNumber + 1)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    +1
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Nama / Judul Babak Sesi
                </label>
                <input
                  type="text"
                  value={sessionInputTitle}
                  onChange={(e) => setSessionInputTitle(e.target.value)}
                  placeholder="Contoh: Babak Rebutan / Soal Wajib"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Quick Preset Badges */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Preset Cepat Judul Babak:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Babak Semifinal',
                    'Babak Wajib',
                    'Babak Rebutan',
                    'Babak Lemparan',
                    'Babak Cepat',
                    'Babak Tie-Breaker',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSessionInputTitle(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        sessionInputTitle === preset
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ATUR TIMER KUSTOM ================= */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" /> Atur Waktu / Timer Kustom
              </h3>
              <button
                onClick={() => setShowTimerModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Tentukan durasi timer countdown yang akan tampil di Layar LCD dan Portal Juri.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const totalSeconds = customTimerUnit === 'menit' ? customTimerInput * 60 : customTimerInput;
                handleSetCustomTimer(totalSeconds, true);
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    Durasi Timer Countdown
                  </label>
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (customTimerUnit !== 'menit') {
                          setCustomTimerUnit('menit');
                          setCustomTimerInput(Math.max(1, Math.round(customTimerInput / 60)));
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        customTimerUnit === 'menit'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Menit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customTimerUnit !== 'detik') {
                          setCustomTimerUnit('detik');
                          setCustomTimerInput(customTimerInput * 60 || 60);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        customTimerUnit === 'detik'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Detik
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={customTimerUnit === 'menit' ? 30 : 1800}
                    value={customTimerInput}
                    onChange={(e) => setCustomTimerInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-white font-black text-2xl focus:outline-none focus:border-amber-400"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase">
                    {customTimerUnit}
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Pilihan Cepat Standar:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '15 Detik', sec: 15, isMin: false, val: 15 },
                    { label: '30 Detik', sec: 30, isMin: false, val: 30 },
                    { label: '45 Detik', sec: 45, isMin: false, val: 45 },
                    { label: '1 Menit', sec: 60, isMin: true, val: 1 },
                    { label: '2 Menit', sec: 120, isMin: true, val: 2 },
                    { label: '3 Menit', sec: 180, isMin: true, val: 3 },
                    { label: '5 Menit', sec: 300, isMin: true, val: 5 },
                  ].map((preset) => {
                    const isSelected =
                      (customTimerUnit === 'menit' ? customTimerInput * 60 : customTimerInput) === preset.sec;
                    return (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => {
                          setCustomTimerUnit(preset.isMin ? 'menit' : 'detik');
                          setCustomTimerInput(preset.val);
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTimerModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20"
                >
                  Terapkan Waktu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ATUR NILAI POIN KUSTOM ================= */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" /> Atur Nilai Poin Kustom
              </h3>
              <button
                onClick={() => setShowPointsModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Aturan poin ini berlaku seketika (realtime) untuk tombol Dewan Juri, Admin, dan tampilan Layar LCD Panggung.
            </p>

            <form onSubmit={handleSavePointsRules} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Poin Benar */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/30">
                  <label className="block text-xs font-black uppercase text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Poin Jika Benar
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={correctPointsInput}
                    onChange={(e) => setCorrectPointsInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-center text-emerald-300 font-black text-2xl focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <span className="block text-[11px] text-slate-400 text-center mt-1">
                    Ditambahkan ke tim saat benar
                  </span>
                </div>

                {/* Poin Salah */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-rose-500/30">
                  <label className="block text-xs font-black uppercase text-rose-400 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> Poin Jika Salah
                  </label>
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={wrongPointsInput}
                    onChange={(e) => setWrongPointsInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-center text-rose-300 font-black text-2xl focus:outline-none focus:border-rose-400"
                    required
                  />
                  <span className="block text-[11px] text-slate-400 text-center mt-1">
                    Gunakan 0 (tetap) atau minus (misal -5 / -10)
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Preset Aturan Poin Populer:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Standar', desc: 'Benar +10 / Salah 0', c: 10, w: 0 },
                    { label: 'Rebutan Ringan', desc: 'Benar +10 / Salah -5', c: 10, w: -5 },
                    { label: 'Rebutan Ketat', desc: 'Benar +20 / Salah -10', c: 20, w: -10 },
                    { label: 'Poin Cepat', desc: 'Benar +5 / Salah 0', c: 5, w: 0 },
                    { label: 'Soal Lemparan', desc: 'Benar +10 / Salah 0', c: 10, w: 0 },
                    { label: 'Babak Penentu', desc: 'Benar +50 / Salah -25', c: 50, w: -25 },
                  ].map((preset) => {
                    const isSelected =
                      correctPointsInput === preset.c && wrongPointsInput === preset.w;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleApplyPointsPreset(preset.c, preset.w)}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{preset.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPointsModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/25"
                >
                  Simpan & Terapkan Poin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT SKOR LANGSUNG SECARA MANUAL ================= */}
      {directScoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" /> Edit Skor Langsung
              </h3>
              <button
                onClick={() => setDirectScoreTarget(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Ubah angka total skor untuk{' '}
              <strong className="text-white">
                {directScoreTarget === 'A' ? teamA?.name || 'Tim A' : teamB?.name || 'Tim B'}
              </strong>{' '}
              secara langsung. Perubahan akan segera tampil di Layar LCD dan Juri.
            </p>

            <form onSubmit={handleSaveDirectScore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Skor Baru (Angka Pasti)
                </label>
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={directScoreInput}
                  onChange={(e) => setDirectScoreInput(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-white font-black text-3xl focus:outline-none focus:border-blue-400"
                  required
                />
              </div>

              {/* Quick Offset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Bantuan Cepat:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectScoreInput(Math.max(0, directScoreInput + 10))}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 rounded-xl border border-slate-700"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectScoreInput(Math.max(0, directScoreInput - 10))}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 rounded-xl border border-slate-700"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectScoreInput(Math.max(0, directScoreInput + 5))}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 rounded-xl border border-slate-700"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectScoreInput(0)}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 rounded-xl border border-slate-700"
                  >
                    Reset (0)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setDirectScoreTarget(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25"
                >
                  Simpan Skor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
