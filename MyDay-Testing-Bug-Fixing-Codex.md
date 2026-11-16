# MyDay — Functional Testing & Bug Fixing (Codex Instructions)

## Tujuan
Lakukan pengujian menyeluruh pada aplikasi MyDay setelah fitur dan UI polish selesai. Temukan bug, reproduksi, perbaiki dengan perubahan sekecil dan seaman mungkin, lalu verifikasi ulang. Fokus pada fungsi, integritas data SQLite, navigasi, dan stabilitas aplikasi Android.

## Konteks project
- React Native + Expo + Expo Router + TypeScript.
- Target Android; aplikasi dirancang offline dengan SQLite lokal.
- Fitur: Home/Dashboard, Tasks, Calendar, Notes, Habit Tracker, Pomodoro Timer, Settings.
- Tab utama: Home, Tasks, Calendar, Notes, More.
- UI polish sudah dilakukan; pertahankan design system dan tampilan yang ada.
- APK/EAS Build belum menjadi bagian tahap ini.

## Aturan kerja
1. Audit project dan baca implementasi aktual sebelum pengujian.
2. Periksa scripts yang tersedia di package.json; gunakan perintah yang memang ada.
3. Jangan mengarang hasil test. Bedakan test yang benar-benar dijalankan, test manual yang memerlukan perangkat, dan test yang belum dapat dilakukan.
4. Jangan menghapus, mereset, atau mengganti database pengguna.
5. Jangan melakukan refactor besar atau menambahkan fitur baru.
6. Perbaiki bug dengan perubahan minimal. Jangan mengubah perilaku yang sudah benar.
7. Jika perubahan database diperlukan, buat migrasi aman dan kompatibel dengan data lama.
8. Jangan membuat APK atau menjalankan EAS Build pada tahap ini.

## 1. Pemeriksaan statis dan struktur
- Periksa package.json untuk mengetahui scripts yang tersedia.
- Jalankan TypeScript check, lint, dan test suite jika tersedia.
- Periksa import yang tidak valid, tipe yang bermasalah, dependency yang tidak digunakan, serta error konfigurasi.
- Periksa Expo Router routes dan navigasi.
- Periksa inisialisasi SQLite, query, operasi async, dan penanganan error.
- Jangan menambahkan script atau tool baru tanpa kebutuhan jelas.

## 2. Pengujian database dan persistensi
Pastikan:
- Database diinisialisasi dengan benar pada instalasi baru.
- Data lama tetap tersedia setelah aplikasi ditutup dan dibuka kembali.
- Operasi create, read, update, delete berjalan untuk setiap fitur.
- Tidak ada tabel/kolom yang hilang atau migrasi yang merusak data.
- Kegagalan query ditangani dengan aman dan tidak membuat aplikasi crash.
- Operasi berulang tidak membuat data duplikat yang tidak diinginkan.

Jangan menguji dengan menghapus database utama pengguna. Jika perlu data uji, gunakan database/test fixture terpisah atau data dummy yang aman.

## 3. Test case per fitur

### Home / Dashboard
- Dashboard terbuka tanpa error.
- Ringkasan tugas, habit, dan sesi fokus sesuai dengan data yang tersimpan.
- Empty state tampil saat belum ada data.
- Setelah data berubah, ringkasan ikut diperbarui.
- Tidak ada angka atau statistik yang salah akibat data lama atau data kosong.

### Tasks
- Tambah tugas dengan data valid.
- Validasi input kosong atau tidak valid.
- Edit judul, deskripsi, tanggal, prioritas, atau field lain yang memang didukung.
- Tandai tugas selesai dan aktifkan kembali jika didukung.
- Hapus tugas dengan konfirmasi jika tersedia.
- Periksa daftar kosong, daftar panjang, dan tugas yang sudah selesai.
- Pastikan semua perubahan bertahan setelah aplikasi dibuka ulang.

### Calendar
- Navigasi bulan sebelumnya dan berikutnya.
- Pilih tanggal dan tampilkan agenda yang sesuai.
- Periksa tanggal yang memiliki dan tidak memiliki agenda.
- Pastikan awal minggu mengikuti preferensi Settings.
- Periksa pergantian bulan/tahun dan tanggal di batas bulan.
- Pastikan tanggal lokal tidak bergeser karena parsing timezone.

### Notes
- Buat, buka, edit, dan hapus catatan.
- Periksa penyimpanan isi catatan dan formatting yang didukung.
- Periksa judul kosong atau isi kosong sesuai aturan aplikasi.
- Uji keyboard, toolbar formatting, Undo/Redo jika tersedia, dan tombol Done/Back.
- Pastikan keyboard tidak menutupi area editor.
- Pastikan catatan tersimpan setelah keluar dari editor dan aplikasi dibuka ulang.

### Habit Tracker
- Buat, edit, dan hapus habit.
- Uji jadwal habit dan check-in harian.
- Pastikan check-in tidak terhitung ganda pada tanggal yang sama kecuali memang didesain demikian.
- Periksa streak dan progres pada pergantian hari.
- Pastikan riwayat check-in tetap tersimpan setelah aplikasi dibuka ulang.
- Periksa habit tanpa jadwal atau tanpa check-in.

### Pomodoro Timer
- Start, Pause, Resume, Reset, dan Skip.
- Periksa transisi Focus → Short Break → Focus dan Long Break sesuai aturan yang diterapkan.
- Pastikan long break muncul setelah jumlah sesi fokus yang dikonfigurasi.
- Pastikan Reset dan Skip tidak dihitung sebagai sesi selesai jika memang aturan aplikasinya demikian.
- Periksa akurasi waktu setelah aplikasi masuk background lalu dibuka kembali.
- Pastikan tidak ada interval/timer ganda.
- Pastikan statistik dan riwayat sesi sesuai dengan sesi yang benar-benar selesai.
- Periksa persistensi preferensi durasi Pomodoro.

### Settings
- Ubah tema Light, Dark, dan System.
- Pastikan pilihan tema bertahan setelah aplikasi dibuka ulang.
- Pastikan tema diterapkan pada semua halaman, modal, input, dan tab bar.
- Ubah awal minggu dan periksa hasilnya di Calendar.
- Periksa preferensi notifikasi dan perilaku saat izin ditolak/tidak tersedia.
- Periksa backup/restore hanya jika benar-benar diimplementasikan.
- Pastikan nilai default instalasi baru masuk akal.

### Navigasi
- Pindah antar semua tab.
- Buka halaman detail dan kembali.
- Periksa tombol Back Android dan tombol back di UI.
- Pastikan state halaman tidak hilang secara tidak sengaja saat berpindah tab.
- Periksa modal/dialog saat dibuka, ditutup, dan saat tombol Android Back ditekan.

## 4. Pengujian kondisi tepi
Periksa:
- Data kosong.
- Teks sangat panjang.
- Banyak item dalam daftar.
- Input dengan spasi atau karakter khusus.
- Pengguna menekan tombol berkali-kali dengan cepat.
- Aplikasi ditutup saat operasi penyimpanan berlangsung.
- Izin notifikasi ditolak.
- Aplikasi masuk background dan kembali aktif.
- Tanggal berganti hari/bulan/tahun.
- Perangkat menggunakan Light/Dark/System.
- Layar Android kecil dan besar jika perangkat/emulator tersedia.

## 5. Penanganan bug
Untuk setiap bug:
1. Catat halaman dan langkah reproduksi.
2. Catat hasil yang diharapkan dan hasil aktual.
3. Cari penyebab di implementasi terkait.
4. Perbaiki dengan perubahan sekecil mungkin.
5. Jalankan kembali test yang relevan.
6. Periksa fitur lain yang mungkin terdampak.

Jangan menyembunyikan error dengan menghapus validasi atau menelan exception tanpa penanganan. Tampilkan feedback yang sesuai kepada pengguna.

## 6. Verifikasi akhir
Setelah perbaikan:
- Jalankan kembali semua pemeriksaan otomatis yang tersedia.
- Jalankan ulang test case yang terdampak.
- Periksa tidak ada error baru di TypeScript, lint, bundling, atau runtime.
- Pastikan data dan fitur yang sudah selesai tetap aman.
- Jika pengujian manual membutuhkan perangkat Android dan tidak tersedia, tuliskan dengan jelas bahwa pengujian tersebut belum dilakukan.

## Format laporan wajib
Berikan laporan dengan format:

### A. Ringkasan
- Status umum aplikasi: siap / perlu perbaikan lanjutan.
- Jumlah bug ditemukan, diperbaiki, dan masih terbuka.

### B. Hasil pengujian
Tabel berisi: fitur, test yang dijalankan, hasil (Pass/Fail/Blocked), dan catatan.

### C. Bug yang diperbaiki
Untuk setiap bug: gejala, penyebab, file yang diubah, dan solusi.

### D. Pemeriksaan teknis
- TypeScript:
- Lint:
- Test suite:
- Expo bundling/runtime:
- Pengujian Android manual:

Tuliskan "tidak tersedia" atau "belum dijalankan" jika memang demikian.

### E. Risiko dan pekerjaan tersisa
Daftar masalah yang belum selesai, keterbatasan lingkungan, dan langkah yang harus dilakukan berikutnya.

## Batasan akhir
- Jangan membuat APK atau menjalankan EAS Build.
- Jangan menyatakan aplikasi 100% bebas bug.
- Jangan menyatakan test lulus jika belum benar-benar dijalankan.
- Jangan menghapus atau mereset data pengguna.

Lakukan pengujian dan perbaikan langsung pada project MyDay yang ada, bukan hanya memberikan rekomendasi.
