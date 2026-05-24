# finance-tracker

## Cara Kerja Aplikasi (Lengkap)

Finance Tracker adalah aplikasi pencatatan keuangan pribadi untuk mencatat pemasukan, pengeluaran, dan mengelola anggaran bulanan. Dokumen ini menjelaskan alur, struktur data, penanganan error, dan detail teknis lainnya.

### Ringkasan Singkat
- **Tujuan**: Mencatat pemasukan & pengeluaran, menampilkan ringkasan saldo, dan memonitor pemakaian budget bulanan.
- **Entry point**: `src/main.tsx` → `src/App.tsx`.
- **Mode penyimpanan**: Firestore (user-authenticated) atau `localStorage` (guest).

### Prinsip Desain
- **Single source of truth**: Saat user login, Firestore adalah sumber data; saat guest, `localStorage` berguna sebagai penyimpanan lokal.
- **Optimistic UI**: Perubahan langsung ditampilkan di UI dan kemudian disinkronkan ke penyimpanan.
- **Segregasi data per pengguna**: Data di Firestore ditempatkan di jalur yang mengikat ke `uid` pengguna.
- **Offline/guest support**: Mode tamu memungkinkan penggunaan tanpa akun; sinkronisasi ke cloud hanya pada mode login.

### Alur Aplikasi (Langkah-demi-langkah)
1. Inisialisasi:
	- Browser memuat `index.html` → `src/main.tsx` → render `App`.
2. Cek autentikasi di `App`:
	- Panggil Firebase Auth untuk mengetahui status sesi.
	- Jika ada user terautentikasi: ambil `uid` dan lanjut ke load data Firestore.
	- Jika tidak ada dan user memilih "Tamu": set mode guest dan baca `localStorage`.
3. Load data awal:
	- Mode Google: ambil data user dari Firestore (mis. `users/{uid}/transactions`, `users/{uid}/settings`).
	- Mode Tamu: baca dan parse JSON dari `localStorage` (gunakan key yang konsisten, mis. `finance-tracker:guest:data`).
4. Normalisasi & state lokal:
	- Konversi data ke struktur state React (mis. `transactions[]`, `settings`, `summary`).
	- Sediakan state via Context atau state management (useReducer / Zustand / Redux).
5. Render UI:
	- Tampilkan ringkasan (saldo, total income/expense), daftar transaksi, grafik kategori, kontrol tambah transaksi, dan pengaturan budget.
6. Menambah transaksi:
	- User isi form (tanggal, jumlah, tipe, kategori, note).
	- Validasi input; lakukan optimistic update ke state.
	- Mode Google: `addTransaction(uid, tx)` → tulis ke Firestore.
	- Mode Tamu: update `localStorage`.
	- Jika write Firestore gagal: rollback atau tampilkan error + opsi retry.
7. Mengubah / menghapus transaksi:
	- Update state lokal lalu kirim operasi update/delete ke penyimpanan yang sesuai.
	- Minta konfirmasi sebelum delete.
8. Filter & pencarian:
	- Semua filter/pencarian dilakukan client-side pada state yang dimuat (tipe, kategori, tanggal, keyword).
9. Pengelolaan budget:
	- Simpan budget bulanan ke Firestore atau `localStorage`.
	- Hitung progress: `progress = totalExpense / monthlyBudget` dan tampilkan progress bar + alert saat mendekati/melebihi.
10. Sign-out & cleanup:
	- Unsubscribe listener Firestore saat logout/komponen unmount.
	- Hapus sesi lokal dan kembali ke layar login.

### Komponen & Tanggung Jawab
- `src/App.tsx`: Koordinator utama; cek auth, inisialisasi data, sediakan context/state untuk anak komponen.
- `src/components/LoginScreen.tsx`: UI login Google & opsi mode tamu.
- `src/firebase.ts`: Inisialisasi Firebase dan helper CRUD:
  - `signInWithGoogle()`
  - `signOut()`
  - `getUserData(uid)` / `listenUserData(uid, onChange)`
  - `addTransaction(uid, tx)`, `updateTransaction(uid, id, tx)`, `deleteTransaction(uid, id)`
- State management: React Context + `useReducer` atau eksternal (Zustand/Redux) untuk kemudahan update global dan rollback.

### Struktur Data & Contoh Dokumen (Firestore)
- Collections path: `users/{uid}/transactions/{txId}`
- Contoh dokumen transaksi:
```json
{
  "amount": 150000,
  "type": "expense",
  "category": "Makanan",
  "note": "Makan siang",
  "date": "2026-05-20T12:00:00.000Z",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```
- Contoh dokumen settings (`users/{uid}/settings`):
```json
{
  "monthlyBudget": 3000000,
  "currency": "IDR",
  "categories": ["Makanan","Transport","Hiburan"]
}
```

### Penanganan Error & Edge Cases
- **Koneksi terputus**: Berikan mode offline/guest; queue perubahan lokal dan retry saat online.
- **Conflict multi-device**: Gunakan `updatedAt` timestamp; default: last-write-wins, atau tampilkan opsi merge manual untuk kasus kompleks.
- **Validasi input**: Pastikan `amount > 0`, `type` valid, `date` parseable.
- **Rollback pada kegagalan write**: Untuk optimistic updates, simpan snapshot sebelum update untuk rollback bila operasi server gagal.
- **Quota & batching**: Hindari menulis terlalu sering ke Firestore; batasi operasi beruntun atau gunakan batch writes jika perlu.
- **Keamanan**: Terapkan aturan Firestore yang membatasi akses hanya ke `users/{uid}` yang sesuai.

### Testing & Debugging
- Gunakan mock `localStorage` untuk pengujian mode guest.
- Untuk pengembangan, gunakan Firebase Emulator Suite agar tidak menulis ke produksi.
- Log error jaringan dan respon Firestore untuk diagnosa.

### Run Lokal & Deploy
- Install dependencies dan jalankan dev server:
```bash
npm install
npm run dev
```
- Deploy: Proyek bisa dideploy ke Vercel atau host statis; set environment variables Firebase pada platform deploy.

---

