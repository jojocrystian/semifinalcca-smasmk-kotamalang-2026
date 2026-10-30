'use client';

import React, { useEffect } from 'react';
import { Team } from '@/types/cca';
import { sounds } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Award, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { exportTeamsToCSV, exportLogsToCSV } from '@/lib/sheets';
import { ScoreLogItem } from '@/types/cca';

interface LeaderboardPodiumProps {
  teams: Team[];
  logs?: ScoreLogItem[];
  fullscreen?: boolean;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  teams,
  logs = [],
  fullscreen = false,
}) => {
  // Sort teams by total score descending
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  const firstPlace = sortedTeams[0];
  const secondPlace = sortedTeams[1];
  const thirdPlace = sortedTeams[2];
  const otherTeams = sortedTeams.slice(3);

  // Trigger celebration effects on mount
  useEffect(() => {
    sounds.playFanfare();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fbbf24', '#e2e8f0', '#b45309', '#3b82f6'],
    });
  }, []);

  return (
    <div className={`w-full flex flex-col items-center ${fullscreen ? 'max-w-7xl' : 'max-w-5xl'} mx-auto`}>
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Hasil Akhir Babak Semifinal
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
          3 BESAR SEMIFINAL CCA 2026
        </h2>
        <p className="text-slate-400 text-sm sm:text-base mt-2">
          Cerdas Cermat Alkitab SMA & SMK Kota Malang
        </p>
      </div>

      {/* 3D Visual Podium */}
      <div className="w-full grid grid-cols-3 gap-3 sm:gap-6 items-end mb-10 sm:mb-12 px-2 max-w-4xl pt-4 sm:pt-6">
        {/* 2nd Place (Silver) */}
        {secondPlace && (
          <div className="flex flex-col items-center order-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/80 border-2 border-slate-300 flex items-center justify-center text-slate-200 shadow-[0_0_25px_rgba(203,213,225,0.4)] mb-3 relative">
              <Medal className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center border-2 border-slate-950">
                2
              </span>
            </div>
            <div className="text-center mb-2 px-1">
              <span className="inline-block px-2.5 py-0.5 bg-slate-700/40 border border-slate-600/50 text-slate-300 font-bold text-[10px] sm:text-xs rounded-full mb-1">
                JUARA 2
              </span>
              <h3 className="font-extrabold text-white text-sm sm:text-lg line-clamp-2 max-w-[140px] sm:max-w-[220px] leading-tight">
                {secondPlace.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 max-w-[140px] sm:max-w-[220px] mt-0.5">
                {secondPlace.school}
              </p>
              <div className="mt-1 font-black text-slate-200 text-lg sm:text-2xl flex items-baseline justify-center gap-1">
                {secondPlace.totalScore} <span className="text-xs font-semibold text-slate-400">Poin</span>
              </div>
            </div>
            {/* Podium Pillar */}
            <div className="w-full h-32 sm:h-40 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700/80 border-t-4 border-slate-300 rounded-t-3xl flex items-center justify-center shadow-lg">
              <span className="text-4xl sm:text-6xl font-black text-slate-400/30">2</span>
            </div>
          </div>
        )}

        {/* 1st Place (Gold) - Elevated Naturally by Taller Pillar */}
        {firstPlace && (
          <div className="flex flex-col items-center order-2">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.5)] mb-3 relative animate-bounce-soft">
              <Trophy className="w-10 h-10 sm:w-14 sm:h-14 text-amber-400" />
              <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-md border-2 border-slate-950">
                1
              </span>
            </div>
            <div className="text-center mb-2 px-1">
              <span className="inline-block px-3 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold text-[10px] sm:text-xs rounded-full mb-1">
                JUARA 1 SEMIFINAL
              </span>
              <h3 className="font-black text-amber-300 text-base sm:text-2xl line-clamp-2 max-w-[160px] sm:max-w-[260px] leading-tight">
                {firstPlace.name}
              </h3>
              <p className="text-xs sm:text-sm text-amber-200/80 font-medium line-clamp-2 max-w-[160px] sm:max-w-[260px] mt-0.5">
                {firstPlace.school}
              </p>
              <div className="mt-1 font-black text-amber-400 text-2xl sm:text-4xl flex items-baseline justify-center gap-1">
                {firstPlace.totalScore} <span className="text-xs font-semibold text-amber-300">Poin</span>
              </div>
            </div>
            {/* Podium Pillar */}
            <div className="w-full h-44 sm:h-56 bg-gradient-to-t from-slate-900 via-amber-950/60 to-amber-600/60 border-t-4 border-amber-400 rounded-t-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-pulse" />
              <span className="text-5xl sm:text-8xl font-black text-amber-400/40">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {thirdPlace && (
          <div className="flex flex-col items-center order-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-900/30 border-2 border-amber-700/80 flex items-center justify-center text-amber-500 shadow-[0_0_25px_rgba(180,83,9,0.4)] mb-3 relative">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-slate-950">
                3
              </span>
            </div>
            <div className="text-center mb-2 px-1">
              <span className="inline-block px-2.5 py-0.5 bg-amber-900/30 border border-amber-700/50 text-amber-400 font-bold text-[10px] sm:text-xs rounded-full mb-1">
                JUARA 3
              </span>
              <h3 className="font-extrabold text-white text-sm sm:text-lg line-clamp-2 max-w-[140px] sm:max-w-[220px] leading-tight">
                {thirdPlace.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-200/70 line-clamp-2 max-w-[140px] sm:max-w-[220px] mt-0.5">
                {thirdPlace.school}
              </p>
              <div className="mt-1 font-black text-amber-500 text-lg sm:text-2xl flex items-baseline justify-center gap-1">
                {thirdPlace.totalScore} <span className="text-xs font-semibold text-slate-400">Poin</span>
              </div>
            </div>
            {/* Podium Pillar */}
            <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-900 via-slate-800 to-amber-900/40 border-t-4 border-amber-700 rounded-t-3xl flex items-center justify-center shadow-lg">
              <span className="text-4xl sm:text-6xl font-black text-amber-700/30">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Complete Rankings Table */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h4 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Klasemen Lengkap Semifinal
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTeamsToCSV(teams)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Unduh CSV Skor
            </button>
            {logs.length > 0 && (
              <button
                onClick={() => exportLogsToCSV(logs)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" /> Log Penjurian
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Nama Tim</th>
                <th className="py-2.5 px-3">Asal Sekolah</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3 text-right">Total Skor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedTeams.map((team, idx) => (
                <tr
                  key={team.id}
                  className={`transition-colors ${
                    idx < 3
                      ? 'bg-amber-500/5 hover:bg-amber-500/10'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-3 font-bold">
                    {idx === 0 ? (
                      <span className="text-amber-400">🥇 1</span>
                    ) : idx === 1 ? (
                      <span className="text-slate-300">🥈 2</span>
                    ) : idx === 2 ? (
                      <span className="text-amber-600">🥉 3</span>
                    ) : (
                      <span className="text-slate-500 font-semibold">{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-white">{team.name}</td>
                  <td className="py-3 px-3 text-slate-300">{team.school}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      {team.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-amber-400 text-base">
                    {team.totalScore}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {idx < 3 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Lolos Final
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Semifinalis</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
