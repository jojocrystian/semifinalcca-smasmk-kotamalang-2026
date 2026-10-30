# 🚀 Panduan Lengkap Deploy & Pembuatan Database Otomatis di Vercel
### Semifinal Cerdas Cermat Alkitab (CCA) SMA & SMK Kota Malang 2026

Panduan ini memandu Anda mengunggah aplikasi ke **Vercel** dan membuat **Database Cloud Realtime (Vercel KV / Upstash Redis)** secara otomatis tanpa perlu konfigurasi rumit.

---

## 📋 Ikhtisar Arsitektur Database
Kode aplikasi telah dilengkapi dengan **Auto-Detect Storage Engine** di `src/app/api/sync/route.ts`:
* **Di Cloud (Vercel)**: Otomatis membaca `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` dari Vercel Storage untuk menyimpan skor, sesi, dan log selama 7 hari.
* **Di Jaringan Lokal**: Jika database cloud belum aktif atau offline, sistem otomatis beralih ke **WebRTC DataChannel (0ms)** dan **BroadcastChannel** antar tab/perangkat.

---

## 🛠️ METODE 1: Deploy Otomatis via GitHub + Vercel (Sangat Direkomendasikan)

### Langkah 1: Push Proyek ke GitHub Anda
Folder proyek lokal ini sudah diinisialisasi dan di-commit git. Anda hanya perlu menghubungkannya ke akun GitHub Anda:

1. Buka [https://github.com/new](https://github.com/new) dan buat repository baru:
   * **Repository name**: `cca-malang-2026` (atau nama lain pilihan Anda).
   * Pilih **Public** atau **Private**.
   * Jangan centang *"Initialize with README"*, biarkan kosong.
   * Klik **"Create repository"**.

2. Jalankan perintah berikut di terminal / PowerShell folder proyek:
   ```bash
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/cca-malang-2026.git
   git push -u origin main
   ```
   *(Ganti `USERNAME-ANDA` dengan username GitHub Anda)*

---

### Langkah 2: Hubungkan & Deploy di Vercel (Otomatis)
1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Di halaman Dashboard Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Di daftar repository GitHub Anda, cari `cca-malang-2026` dan klik tombol **"Import"**.
4. Vercel akan otomatis mendeteksi:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `./`
   * **Build Command**: `next build`
   * **Output Directory**: `.next`
5. Langsung klik tombol biru **"Deploy"**.
6. Tunggu sekitar 1–2 menit hingga muncul konfirmasi *"Congratulations! You just deployed a new Next.js project to Vercel."*

---

### Langkah 3: Buat Database Real-Time di Vercel Secara Otomatis
Vercel menyediakan integrasi database resmi berbasis Redis (Upstash) yang otomatis mengisi credentials tanpa perlu ketik manual:

1. Masuk ke halaman project Anda di Vercel Dashboard.
2. Klik tab **"Storage"** di navigasi bagian atas (antara *Analytics* dan *Settings*).
3. Klik tombol **"Create Database"** (atau **"Connect Database"**).
4. Pilih **"Upstash Redis"** (atau **"KV"**).
5. Klik tombol **"Continue"**.
6. Pada formulir pembuatan:
   * **Database Name**: `cca-database` (default).
   * **Primary Region**: Pilih **Singapore (`ap-southeast-1`)** agar latency paling cepat ke Indonesia.
7. Klik tombol **"Create"**.
8. Setelah database selesai dibuat dalam beberapa detik, klik **"Connect to Project"**:
   * Pilih project `cca-malang-2026` Anda.
   * Checklist environments: **Production**, **Preview**, dan **Development**.
   * Klik **"Connect"**.
9. **Selesai Secara Otomatis!** Vercel akan otomatis menyuntikkan variabel lingkungan berikut ke project Anda:
   * `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL`
   * `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN`
10. Terakhir, buka tab **"Deployments"**, klik ikon titik tiga `...` pada deployment terbaru Anda, dan pilih **"Redeploy"** agar aplikasi membaca database baru tersebut.

Sekarang aplikasi Anda sudah memiliki database cloud realtime aktif 24 jam!

---

## ⚡ METODE 2: Deploy & Buat Database via Terminal (Vercel CLI)

Jika Anda lebih suka menggunakan terminal langsung dari laptop:

1. Buka PowerShell di folder proyek ini:
   ```bash
   npx vercel login
   ```
   *(Pilih metode login browser Anda)*

2. Jalankan perintah deploy otomatis:
   ```bash
   npx vercel
   ```
   * Ikuti konfirmasi di layar (tekan `Enter` untuk menyetujui pengaturan default Next.js).

3. Pasang database Upstash/KV via CLI:
   ```bash
   npx vercel integration add upstash
   ```
   Atau buka dashboard link yang ditampilkan terminal dan hubungkan di tab **Storage**.

4. Lakukan deploy production:
   ```bash
   npx vercel --prod
   ```

---

## 🌐 Tautan yang Siap Digunakan Saat Acara Berlangsung

Setelah dideploy, Anda akan mendapatkan domain HTTPS resmi dari Vercel (misal `https://cca-malang-2026.vercel.app`):

| Halaman | URL | Pengguna & Perangkat |
| :--- | :--- | :--- |
| **Pusat Navigasi** | `https://cca-malang-2026.vercel.app/` | Beranda portal utama |
| **Portal Master Admin** | `https://cca-malang-2026.vercel.app/admin` | Laptop Operator / Panitia Utama |
| **Portal Dewan Juri** | `https://cca-malang-2026.vercel.app/juri` | HP / Tablet / Laptop Dewan Juri |
| **Layar LCD Proyektor** | `https://cca-malang-2026.vercel.app/lcd` | Laptop Panggung HDMI ke Proyektor |

---

## 💡 Tips Penting untuk Hari H (Acara Lomba)
1. **Bagikan Link Juri via QR Code**:
   Di Portal Admin (`/admin`), ada tombol **"Salin Link Juri"** yang bisa di-generate menjadi QR Code di layar agar dewan juri cukup scan dengan kamera HP masing-masing.
2. **Koneksi Internet Lemah?**:
   Sistem CCA Malang 2026 memiliki **Multi-Layer Fallback**: jika internet venue melambat, sistem lokal (`BroadcastChannel` & `localStorage`) pada laptop yang terhubung ke proyektor tetap berjalan instan **0 milidetik** tanpa lag.
3. **Backup Cadangan Google Sheets**:
   Di tab **4. Backup Spreadsheet & Log** pada portal admin, Anda bisa mengunduh CSV kapan saja atau menghubungkan Webhook Google Apps Script.
