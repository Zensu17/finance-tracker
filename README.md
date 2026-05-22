# finance-tracker

## Cara Kerja Aplikasi

Finance Tracker adalah aplikasi pencatatan keuangan pribadi untuk mencatat pemasukan, pengeluaran, dan anggaran bulanan. Alur kerjanya seperti ini:

1. Saat aplikasi dibuka, `App` mengecek status autentikasi pengguna melalui Firebase Auth.
2. Jika pengguna sudah login, aplikasi memuat data transaksi dan budget dari Firestore.
3. Jika pengguna belum login, aplikasi menampilkan layar login.
4. Setelah data dimuat, halaman utama menampilkan ringkasan saldo, total pemasukan, total pengeluaran, budget bulanan, dan rincian pengeluaran per kategori.
5. Pengguna dapat menambah transaksi lewat modal, lalu transaksi tersebut langsung masuk ke daftar dan ikut menghitung statistik.
6. Pengguna dapat menghapus transaksi, memfilter berdasarkan tipe/kategori, dan mencari transaksi berdasarkan kata kunci.
7. Pengguna dapat mengubah budget bulanan untuk melihat progres pemakaian anggaran.
8. Saat pengguna keluar, sesi Firebase ditutup dan aplikasi kembali ke layar login.

## Penyimpanan Data

- Mode login Google menyimpan data ke Firestore di bawah data pengguna masing-masing.
- Saat mode tamu dipakai, data disimpan di `localStorage` pada browser.

## Ringkasan Komponen

- `src/main.tsx`: titik masuk aplikasi React.
- `src/App.tsx`: kontrol utama alur login, pemuatan data, statistik, transaksi, dan budget.
- `src/components/LoginScreen.tsx`: tampilan login Google dan mode tamu.
- `src/firebase.ts`: konfigurasi Firebase dan fungsi baca/tulis data.

## Catatan

Pada implementasi saat ini, alur utama yang aktif adalah login Google. Tombol mode tamu sudah ada di UI, tetapi belum benar-benar mengubah status pengguna di komponen utama.

