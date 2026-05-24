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

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Features

### 📊 Dashboard
- Real-time balance, income, and expense overview
- Monthly stats and trends
- Budget progress indicator

### 💳 Transaction Management
- Add, edit, delete transactions
- Support for multiple categories
- Income and expense tracking
- Transaction search and filtering

### 📅 Monthly Navigation
- Navigate between months to view historical data
- All stats automatically update for selected month
- Category breakdown reflects selected month

### 💰 Budget Management
- Set monthly budget limit
- Track spending against budget
- Visual progress indicator
- Warning when budget is exceeded

### 🔐 Authentication
- Google Sign-In integration
- Guest mode with local storage
- Secure cloud data sync with Firestore

## Usage

1. **Start the App**: Open the application and choose to login with Google or use as Guest
2. **Add Transaction**: Click the "Add" button to record new transactions
3. **View Dashboard**: See your balance, income, and expenses overview
4. **Navigate Months**: Use the month navigation to view previous months
5. **Set Budget**: Click "Edit" on the Monthly Budget card to set your monthly limit
6. **Search & Filter**: Use the search bar and filters to find specific transactions

## Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks (useMonthNavigation)
├── App.tsx             # Main application component
├── firebase.ts         # Firebase configuration and helpers
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## License

This project is open source and available under the MIT License.

