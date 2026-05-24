# 💰 Finance Tracker

**Aplikasi Manajemen Keuangan Pribadi untuk Membantu Anda Mengelola Uang dengan Lebih Baik**

## 📝 Penjelasan Aplikasi

Finance Tracker adalah aplikasi web modern yang dirancang untuk membantu Anda **mencatat, melacak, dan mengelola keuangan pribadi** dengan mudah dan efisien. Aplikasi ini memungkinkan Anda untuk:

✨ **Mencatat setiap transaksi keuangan** (pemasukan dan pengeluaran) dengan kategori yang spesifik  
✨ **Melihat ringkasan keuangan secara real-time** (saldo, total pemasukan, total pengeluaran)  
✨ **Mengatur budget bulanan** dan memantau seberapa banyak Anda telah membelanjakan uang  
✨ **Menganalisis pengeluaran** berdasarkan kategori untuk memahami pola belanja Anda  
✨ **Melihat data historis** dari bulan-bulan sebelumnya untuk analisis jangka panjang  
✨ **Menduplikasi transaksi berulang** (seperti gaji bulanan atau sewa rumah) hanya dengan satu klik  
✨ **Mencari dan menyaring transaksi** dengan cepat berdasarkan deskripsi, jenis, atau kategori  
✨ **Menyimpan data di cloud** dengan aman melalui akun Google Anda  

## 🎯 Fitur Utama

- ✅ **Pencatatan Transaksi** - Catat pemasukan dan pengeluaran dengan kategori
- ✅ **Ringkasan Keuangan** - Lihat saldo total, total pemasukan, dan pengeluaran
- ✅ **Manajemen Budget** - Atur budget bulanan dan monitor penggunaan
- ✅ **Breakdown Kategori** - Analisis pengeluaran berdasarkan kategori
- ✅ **Navigasi Bulanan** - Lihat data historis bulan-bulan sebelumnya
- ✅ **Duplikasi Transaksi** - Salin transaksi berulang dalam satu klik
- ✅ **Pencarian & Filter** - Cari transaksi berdasarkan deskripsi, tipe, atau kategori
- ✅ **Mode Guest** - Gunakan tanpa login (data tersimpan di browser)
- ✅ **Cloud Sync** - Login dengan Google untuk sinkronisasi data ke cloud

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **UI Components**: Lucide React Icons, Sonner Toasts
- **Build Tool**: Vite

## 🚀 Cara Memulai

### Persyaratan
- Node.js 16+
- Akun Firebase dengan Authentication dan Firestore diaktifkan

### Instalasi

```bash
# Install dependencies
npm install

# Buat file .env dengan Firebase credentials Anda
cp .env.example .env

# Jalankan development server
npm run dev

# Build untuk production
npm run build
```

### Konfigurasi Environment Variables

Buat file `.env` di root directory:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📋 Fitur Lengkap

### 📊 Dashboard
- Tampilan real-time: saldo, pemasukan, dan pengeluaran
- Statistik bulanan dan tren keuangan
- Indikator progress budget

### 💳 Manajemen Transaksi
- Tambah, edit, dan hapus transaksi
- Dukung multiple kategori
- Lacak pemasukan dan pengeluaran
- Cari dan filter transaksi

### 📅 Navigasi Bulanan
- Navigasi antara bulan untuk melihat data historis
- Semua statistik otomatis ter-update untuk bulan yang dipilih
- Breakdown kategori mencerminkan data bulan terpilih

### ⚡ Duplikasi Transaksi (NEW!)
- Klik tombol **Duplikasi** pada transaksi untuk membuat transaksi baru dengan data yang sama
- Tanggal otomatis diatur ke hari ini (dapat diubah)
- Sempurna untuk transaksi berulang seperti gaji bulanan, sewa rumah, atau biaya langganan
- Hemat waktu hingga 90% untuk menambah transaksi berulang!

### 💰 Manajemen Budget
- Atur limit budget bulanan
- Lacak pengeluaran terhadap budget
- Indikator progress visual
- Peringatan ketika budget terlampaui

### 🔐 Autentikasi & Keamanan
- Integrasi Google Sign-In
- Mode Guest dengan local storage
- Sinkronisasi data cloud yang aman dengan Firestore

## 📖 Cara Menggunakan

1. **Buka Aplikasi**: Buka aplikasi dan pilih login dengan Google atau gunakan sebagai Guest
2. **Tambah Transaksi**: Klik tombol "Add" untuk mencatat transaksi baru
3. **Lihat Dashboard**: Lihat ringkasan saldo, pemasukan, dan pengeluaran
4. **Navigasi Bulan**: Gunakan fitur navigasi bulan untuk melihat data bulan sebelumnya
5. **Atur Budget**: Klik "Edit" pada kartu Monthly Budget untuk menetapkan limit bulanan
6. **Cari & Filter**: Gunakan search bar untuk menemukan transaksi spesifik
7. **Duplikasi Transaksi**: Hover ke transaksi, klik tombol Duplikasi (ikon hijau) untuk membuat transaksi serupa

## 📂 Struktur Proyek

```
src/
├── components/          # Komponen UI yang dapat digunakan kembali
├── hooks/              # Custom React hooks (useMonthNavigation)
├── App.tsx             # Komponen aplikasi utama
├── firebase.ts         # Konfigurasi Firebase dan helper functions
├── main.tsx            # Entry point aplikasi
└── index.css           # Gaya global
```

## 📄 Lisensi

Proyek ini adalah open source dan tersedia di bawah MIT License.