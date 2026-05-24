# 💰 Finance Tracker

Personal finance management application built with React, TypeScript, and Firebase.

## Overview

Finance Tracker adalah aplikasi web untuk mencatat dan mengelola keuangan pribadi. Fitur utama meliputi:

- ✅ **Pencatatan Transaksi** - Catat pemasukan dan pengeluaran dengan kategori
- ✅ **Ringkasan Keuangan** - Lihat saldo total, total pemasukan, dan pengeluaran
- ✅ **Manajemen Budget** - Atur budget bulanan dan monitor penggunaan
- ✅ **Breakdown Kategori** - Analisis pengeluaran berdasarkan kategori
- ✅ **Navigasi Bulanan** - Lihat data historis bulan-bulan sebelumnya
- ✅ **Pencarian & Filter** - Cari transaksi berdasarkan deskripsi, tipe, atau kategori
- ✅ **Mode Guest** - Gunakan tanpa login (data tersimpan di browser)
- ✅ **Cloud Sync** - Login dengan Google untuk sinkronisasi data ke cloud

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **UI Components**: Lucide React Icons, Sonner Toasts
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 16+
- Firebase project with Authentication and Firestore enabled

### Installation

```bash
# Install dependencies
npm install

# Create .env file with your Firebase credentials
cp .env.example .env

# Start development server
npm run dev
```
- Deploy: Proyek bisa dideploy ke Vercel atau host statis; set environment variables Firebase pada platform deploy.

---

Jika Anda ingin, saya bisa memasukkan contoh aturan Firestore, contoh migrasi data dari guest ke user saat login, atau menambahkan diagram alur pada README. Beri tahu ingin saya simpan perubahan ini ke file README sekarang.

