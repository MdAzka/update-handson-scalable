# Puisi Stateful — Frontend (Laptop 1)

Scope folder ini **murni tampilan (frontend), tanpa database/API sungguhan** —
sesuai pembagian tugas kelompok.

## Isi

- `index.html` — halaman utama: navbar, hero, fitur, section login/register
  (UI saja), dashboard, dan demo komponen.
- `style.css` — semua styling, termasuk komponen baru di bagian bawah file
  (cari komentar `KOMPONEN BARU`).
- `js/app.js` — navigasi antar section (SPA sederhana, show/hide) +
  logic demo pemilih template & preview puisi. Fungsi `fetch()` ke
  `server.php` sudah disiapkan sebagai kontrak API untuk bagian server,
  tapi belum akan berfungsi sampai `server.php` benar-benar ada.
- `assets/templates/` — 4 gambar template (`latar1.jpeg` s.d `latar4.jpeg`)
  dipakai untuk komponen preview.

## Komponen baru: Pilih Template & Preview Puisi

Sesuai requirement di "Tugas Proyek" (Hands-On 1, hal. 10), user harus bisa:
1. Memilih salah satu template gambar sebelum submit
2. Melihat preview judul + nama penulis + bait puisi di atas gambar,
   sebelum benar-benar submit

Komponen ini sudah dibuat dan bisa dicoba lewat tombol
**"Lihat demo komponen pilih template & preview puisi"** di halaman utama.
Ini murni simulasi di browser (client-side) — belum menyimpan apa-apa.

Bagian yang mengerjakan form `submit_puisi/` (Laptop 2) tinggal pakai ulang
komponen ini (HTML section `#componentDemoSection`, CSS `.template-picker`
dan `.poem-preview-*`, JS `updatePoemPreview()` / `selectTemplate()`) dan
menyambungkannya ke data asli (nama penulis dari user login, judul/bait dari
input form yang sesungguhnya).

## Cara buka

Tinggal buka `index.html` langsung di browser — tidak perlu server, karena
belum ada logic yang bergantung ke backend.
