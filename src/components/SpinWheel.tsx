'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Team, SpinData } from '@/types/cca';
import { sounds } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { Trophy, Shuffle, CheckCircle, Sparkles } from 'lucide-react';

interface SpinWheelProps {
  teams: Team[];
  targetSlot?: 'A' | 'B';
  spinData?: SpinData | null;
  onSpinTrigger?: (slot: 'A' | 'B') => void;
  onSpinComplete?: (team: Team, slot: 'A' | 'B') => void;
  size?: number;
  readOnly?: boolean; // For LCD view where operator triggers it from admin
  showWinnerModal?: boolean;
}

const SLICE_COLORS = [
  '#2563EB', // Blue
  '#DC2626', // Red
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#0891B2', // Cyan
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#4F46E5', // Indigo
  '#0D9488', // Teal
];

export const SpinWheel: React.FC<SpinWheelProps> = ({
  teams,
  targetSlot = 'A',
  spinData = null,
  onSpinTrigger,
  onSpinComplete,
  size = 500,
  readOnly = false,
  showWinnerModal = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(() => spinData?.targetAngle ?? 0);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<Team | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Initialize with spinData.startTime to prevent re-spinning on mount/reload
  const lastProcessedStartTime = useRef<number | null>(spinData?.startTime ?? null);

  // Filter only teams that are NOT eliminated from wheel
  const availableTeams = teams.filter((t) => !t.isEliminatedFromWheel);

  const drawWheel = useCallback(
    (currentAngle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const numSlices = availableTeams.length;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 20;

      ctx.clearRect(0, 0, size, size);

      if (numSlices === 0) {
        // Draw empty state
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Semua Tim Sudah Ter-spin', centerX, centerY);
        return;
      }

      const arc = (Math.PI * 2) / numSlices;

      // Draw outer rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24'; // Gold rim
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Draw slices
      for (let i = 0; i < numSlices; i++) {
        const team = availableTeams[i];
        const angle = currentAngle + i * arc;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arc);
        ctx.lineTo(centerX, centerY);

        const color = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, Math.min(16, Math.floor(320 / numSlices)))}px Inter, sans-serif`;

        // Truncate name if too long
        const displayName = team.name.length > 18 ? team.name.substring(0, 16) + '...' : team.name;
        ctx.fillText(displayName, radius - 24, 5);

        ctx.restore();
      }

      // Draw outer bulbs / pegs
      for (let i = 0; i < numSlices * 2; i++) {
        const pegAngle = currentAngle + (i * Math.PI) / numSlices;
        const pegX = centerX + Math.cos(pegAngle) * (radius + 2);
        const pegY = centerY + Math.sin(pegAngle) * (radius + 2);

        ctx.beginPath();
        ctx.arc(pegX, pegY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a'; // Glowing yellow peg
        ctx.fill();
      }

      // Center Hub
      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    },
    [availableTeams, size]
  );

  // Redraw when angle or teams change
  useEffect(() => {
    drawWheel(rotationAngle);
  }, [rotationAngle, drawWheel]);

  // Synchronized Animation triggered by spinData (runs identically on Admin AND LCD)
  useEffect(() => {
    if (!spinData) return;

    // If this spin was already processed or is from a previous page load/refresh, do not re-spin!
    if (spinData.startTime === lastProcessedStartTime.current) {
      if (rotationAngle !== spinData.targetAngle) {
        setRotationAngle(spinData.targetAngle);
      }
      return;
    }

    // Check if the spin is too old (e.g. page reloaded after a spin occurred)
    const spinAge = Date.now() - spinData.startTime;
    const duration = spinData.duration || 6500;
    if (spinAge > duration + 1000) {
      // Stale spin: statically render at final targetAngle without spinning or dispatching
      lastProcessedStartTime.current = spinData.startTime;
      setRotationAngle(spinData.targetAngle);
      return;
    }

    lastProcessedStartTime.current = spinData.startTime;

    const winningTeam = teams.find((t) => t.id === spinData.targetTeamId);
    if (!winningTeam) return;

    setSpinning(true);
    setWinner(null);
    setShowModal(false);

    const startAngle = rotationAngle % (Math.PI * 2);
    const targetAngle = spinData.targetAngle;
    const totalRotation = targetAngle - startAngle;
    const startTime = performance.now();
    const numSlices = availableTeams.length;
    const arc = (Math.PI * 2) / (numSlices || 1);
    const pointerAngle = (3 * Math.PI) / 2;
    let lastTickSlice = -1;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth Ease-Out Quintic deceleration: 1 - (1 - t)^5
      const ease = 1 - Math.pow(1 - progress, 5);
      const current = startAngle + totalRotation * ease;

      setRotationAngle(current);

      // Sound ticking logic as slices pass pointer
      const currentSlice = Math.floor(
        ((pointerAngle - (current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / arc
      );
      if (currentSlice !== lastTickSlice && progress < 0.98) {
        sounds.playWheelTick();
        lastTickSlice = currentSlice;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setWinner(winningTeam);
        if (showWinnerModal) {
          setShowModal(true);
        }

        // Play victory sound & celebratory confetti
        sounds.playFanfare();
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'],
        });

        if (onSpinComplete) {
          onSpinComplete(winningTeam, spinData.slot);
        }
      }
    };

    requestAnimationFrame(animate);
  }, [spinData, teams, availableTeams.length, rotationAngle, onSpinComplete, showWinnerModal]);

  const handleManualSpinTrigger = () => {
    if (spinning || availableTeams.length === 0) return;
    if (onSpinTrigger) {
      onSpinTrigger(targetSlot);
    }
  };

  return (
    <div className="flex flex-col items-center select-none relative">
      {/* Top Pointer Needle */}
      <div className="relative z-20 flex flex-col items-center -mb-5">
        <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)] filter animate-pulse" />
      </div>

      {/* Canvas Spin Wheel */}
      <div className="relative rounded-full shadow-[0_0_50px_rgba(0,0,0,0.6)] border-4 border-slate-800 bg-slate-950 p-2">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="transition-transform duration-75 ease-out"
        />
      </div>

      {/* Control Buttons (Only if not readOnly) */}
      {!readOnly && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            Tersisa {availableTeams.length} dari {teams.length} Tim Semifinalis
          </div>

          <button
            onClick={handleManualSpinTrigger}
            disabled={spinning || availableTeams.length === 0}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${
              spinning || availableTeams.length === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105'
            }`}
          >
            <Shuffle className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
            {spinning
              ? 'Memutar Roda di Admin & LCD...'
              : `Putar Roda untuk Tim ${targetSlot}`}
          </button>
        </div>
      )}

      {/* Winner Pop-up Notification / Modal */}
      {showWinnerModal && showModal && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.4)] relative">
            <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-3xl flex items-center justify-center text-amber-400 border border-amber-400/40 mb-4 animate-bounce-soft shadow-lg shadow-amber-500/20">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/20 text-amber-300 text-xs sm:text-sm font-extrabold rounded-full border border-amber-500/40 mb-3 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Terpilih untuk Tim {spinData?.slot || targetSlot} (Semifinal)
            </span>

            <h3 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
              {winner.name}
            </h3>
            <p className="text-amber-200 text-base sm:text-lg font-semibold mb-6">
              {winner.school}
            </p>

            <div className="bg-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-300 mb-6 flex items-center justify-center gap-2 border border-slate-700">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Otomatis disisihkan dari roda untuk pengundian berikutnya</span>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/30 transition-all hover:scale-[1.02]"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
