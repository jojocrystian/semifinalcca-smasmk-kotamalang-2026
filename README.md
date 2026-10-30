# Aplikasi Semifinal Cerdas Cermat Alkitab (CCA) SMA & SMK Kota Malang 2026

Platform sistem pertandingan interaktif berbasis web untuk babak Semifinal Cerdas Cermat Alkitab (CCA) tingkat SMA & SMK se-Kota Malang. Didesain dengan gaya **Minimalis, Elegan, dan Youth Profesional**, beroperasi **secara realtime tanpa lag**, dilengkapi efek suara standar cerdas cermat, pengundian spinwheel otomatis, serta integrasi pencadangan Google Spreadsheet.

---

## 🌟 Fitur Utama & Alur Pelaksanaan

1. **Roda Pengundian Berputar (Interactive Spinwheel)**:
   - Mengundi 2 tim peserta untuk bertanding pada setiap sesi semifinal (Tim A vs Tim B).
   - Tim yang telah terspin akan **secara otomatis dieliminasi dari roda** agar tidak terundi kembali pada sesi berikutnya.
   - Efek suara putaran roda realistis dan fanfare perayaan pemenang spin.

2. **3 Portal Khusus Terintegrasi**:
   - **Portal Master Admin (`/admin`)**: Mengendalikan roda putar, menentukan tim yang tanding, mengontrol countdown timer panggung, mengelola tim peserta, serta ekspor spreadsheet.
   - **Portal Dewan Juri (`/juri`)**: Antarmuka responsif dan ramah sentuhan (HP/Tablet/Laptop) dengan tombol besar **Benar (+10)** dan **Salah / Tidak Menjawab (0)** untuk masing-masing tim, dilengkapi efek suara instan.
   - **Layar LCD Proyektor (`/lcd`)**: Tampilan fullscreen untuk panggung penonton yang menampilkan nama tim/sekolah, papan skor berukuran besar, countdown timer melingkar dengan indikator visual dinamis, serta podium 3 besar.

3. **Efek Suara Cerdas Cermat (Web Audio API)**:
   - Jawaban Benar (+10): Akor lonceng kemenangan cerah (*major chord chime*).
   - Jawaban Salah (0): *Game show buzzer* khas berfrekuensi ganda.
   - Timer Berjalan: Detak ritmis jam (*woodblock tick*).
   - 5 Detik Terakhir: Detak darurat berfrekuensi tinggi (*urgent beep*).
   - Waktu Habis: Alarm sirene elektrik (*timeout buzzer*).
   - Spinwheel & Juara: Efek mekanis putaran dan fanfare kemenangan (*brass celebration*).

4. **Sinkronisasi Realtime Multi-Layer (Bebas Lag)**:
   - **Layer 1 (Lokal)**: `BroadcastChannel` & `localStorage` sinkron 0ms (cocok untuk 1 laptop dengan 2 layar/HDMI proyektor).
   - **Layer 2 (Cloud P2P)**: WebRTC DataChannel via `peerjs` dengan Room Code (menghubungkan HP juri, laptop admin, dan proyektor seketika).
   - **Layer 3 (Serverless Fallback)**: API route `/api/sync` untuk fallback otomatis di jaringan ketat.

5. **Pencadangan Spreadsheet (Google Sheets & CSV)**:
   - Unduh langsung data skor & log penjurian dalam format CSV.
   - Dilengkapi template Google Apps Script untuk sinkronisasi otomatis via webhook ke Google Spreadsheet panitia.

---

## 🚀 Panduan Menjalankan di Lokal (Development)

1. Pastikan Node.js (v18+) telah terpasang.
2. Buka terminal di folder project:
   ```bash
   npm install
   npm run dev
   ```
3. Buka browser pada alamat:
   - **Hub Utama**: [http://localhost:3000](http://localhost:3000)
   - **Portal Admin**: [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Portal Juri**: [http://localhost:3000/juri](http://localhost:3000/juri)
   - **Layar LCD**: [http://localhost:3000/lcd](http://localhost:3000/lcd)

---

## ☁️ Panduan Deploy ke Vercel

Aplikasi ini 100% kompatibel dan siap di-deploy langsung ke Vercel:

1. Push folder project ke repositori GitHub / GitLab Anda.
2. Masuk ke [https://vercel.com](https://vercel.com) dan klik **Add New > Project**.
3. Pilih repositori CCA Anda dan klik **Deploy** (Framework preset otomatis terdeteksi sebagai **Next.js** tanpa konfigurasi tambahan).
4. Bagikan link domain Vercel kepada operator, juri, dan laptop yang tersambung ke proyektor LCD!

---

## 📊 Pengaturan Database Cadangan (Google Spreadsheet)

1. Buat spreadsheet baru di [Google Sheets](https://sheets.new).
2. Klik menu **Extensions (Ekstensi)** > **Apps Script**.
3. Salin kode skrip yang telah disediakan pada menu **Portal Admin > Tab 4 (Backup Spreadsheet & Log)**.
4. Klik tombol **Deploy (Terapkan)** > **New deployment (Penerapan baru)**.
5. Pilih tipe **Web app**, atur akses ke **Anyone (Siapa saja)**, lalu salin URL Web App yang dihasilkan.
6. Tempelkan URL tersebut ke kolom Webhook di Portal Admin CCA dan klik **Simpan**. Setiap sesi dan penilaian akan otomatis tercatat ke Google Spreadsheet Anda.
