'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Tv,
  Settings,
  Sparkles,
  Trophy,
  CheckCircle2,
  Share2,
  Clock,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Header */}
      <header className="max-w-6xl mx-auto w-full px-6 pt-12 pb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold uppercase tracking-wider mb-5">
          <Sparkles className="w-4 h-4 text-amber-400" /> Cerdas Cermat Alkitab (CCA) SMA & SMK Kota Malang
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-4">
          SISTEM SEMIFINAL CCA 2026
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg leading-relaxed">
          Platform interaktif realtime untuk babak semifinal CCA: Roda Putar Otomatis, Layar LCD Panggung, Portal Dewan Juri, Countdown Timer, dan Pengumuman 3 Besar.
        </p>
      </header>

      {/* 3 Main Portals Navigation Cards */}
      <main className="max-w-6xl mx-auto w-full px-6 py-6 flex-1 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. PORTAL ADMIN */}
          <Link
            href="/admin"
            className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(245,158,11,0.2)]"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7" />
              </div>

              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                BAGIAN 1
              </span>
              <h2 className="text-2xl font-black text-white mb-2">Portal Master Admin</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Pusat kendali operator: putar roda spinwheel, tentukan sesi tanding, atur timer panggung, kelola tim peserta, dan ekspor database ke spreadsheet.
              </p>
            </div>

            <div className="flex items-center text-amber-400 font-bold text-sm gap-2 pt-4 border-t border-slate-800/80">
              Buka Portal Admin <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. PORTAL JURI */}
          <Link
            href="/juri"
            className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(16,185,129,0.2)]"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>

              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                BAGIAN 2
              </span>
              <h2 className="text-2xl font-black text-white mb-2">Portal Dewan Juri</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Layar khusus juri (kompatibel HP, Tablet, Laptop) untuk menekan tombol Benar (+10 poin) dan Salah/Tidak Menjawab (0 poin) dengan respons instan tanpa lag.
              </p>
            </div>

            <div className="flex items-center text-emerald-400 font-bold text-sm gap-2 pt-4 border-t border-slate-800/80">
              Buka Portal Juri <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. LCD FULLSCREEN DISPLAY */}
          <Link
            href="/lcd"
            target="_blank"
            className="group bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(59,130,246,0.2)]"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Tv className="w-7 h-7" />
              </div>

              <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 block mb-1">
                BAGIAN 3
              </span>
              <h2 className="text-2xl font-black text-white mb-2">Layar LCD Panggung</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Tampilan fullscreen untuk LCD/Proyektor panggung penonton: Roda Spin Interaktif, Scoreboard 1 vs 1, Countdown Timer bercahaya, dan Podium 3 Besar.
              </p>
            </div>

            <div className="flex items-center text-blue-400 font-bold text-sm gap-2 pt-4 border-t border-slate-800/80">
              Buka Layar LCD Fullscreen <ExternalLink className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Workflow Guide Section */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Alur Pelaksanaan Semifinal CCA Kota Malang
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Spin Tim Semifinal</strong>
                <p className="text-slate-400 text-xs">
                  Operator memutar roda untuk memilih 2 tim yang akan bertanding per sesi. Tim yang terpilih otomatis disisihkan dari roda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Tim Naik ke Panggung</strong>
                <p className="text-slate-400 text-xs">
                  Kedua tim menempati posisi panggung. LCD menampilkan identitas Tim A dan Tim B beserta papan skor.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Pertanyaan MC / Moderator</strong>
                <p className="text-slate-400 text-xs">
                  MC membacakan soal Alkitab kepada para peserta babak semifinal.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Timer Countdown Menjawab</strong>
                <p className="text-slate-400 text-xs">
                  Timer aktif di LCD dengan efek suara detak dan alarm batas waktu menjawab.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                5
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Penjurian: Benar / Salah</strong>
                <p className="text-slate-400 text-xs">
                  Juri menekan tombol: Benar (+10 poin) atau Salah/Tidak Menjawab (0 poin). Skor langsung ter-update di LCD seketika.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                6
              </span>
              <div>
                <strong className="text-white block font-bold mb-1">Pengumuman 3 Besar</strong>
                <p className="text-slate-400 text-xs">
                  Setelah seluruh sesi semifinal selesai, LCD menampilkan podium 3 besar dengan animasi confetti dan perolehan skor tertinggi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>
          Panitia Cerdas Cermat Alkitab (CCA) SMA & SMK Kota Malang © 2026. Ready for Vercel Deployment.
        </p>
      </footer>
    </div>
  );
}
