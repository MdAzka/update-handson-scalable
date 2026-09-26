# Status Frontend — submit_puisi/ & daftar_puisi/

## Yang sudah dikerjakan (Azka)
Bagian ini **independen**, tidak bergantung pada isi `index.html`:

- `submit_puisi/submit_puisi.html` + `submit_puisi.js` — form submit puisi lengkap: judul, kategori, keyword, isi, **bait puisi** (baru), **pilihan template gambar** (baru), dan **preview gambar live** (baru) yang manggil Lambda lewat CloudFront.
- `daftar_puisi/daftar_puisi.html` + `daftar_puisi.js` — diubah dari tabel teks jadi **galeri gambar** (grid card), dengan data dummy sementara (karena backend belum siap) supaya tampilan tetap bisa dites.
- `style.css` — ditambahkan class baru di **paling akhir file**: `.puisi-grid`, `.puisi-card`, `.puisi-image`, `.puisi-info`, `.puisi-kategori`. **Tidak ada kode lama yang dihapus/diubah.**

## Yang perlu kamu perhatikan sebelum push bareng
1. **Jangan pindahkan lokasi** `index.html` atau `style.css` dari root folder — file-file kami pakai path relatif (`../index.html`, `../style.css`) yang mengasumsikan struktur folder tetap sama.
2. **Kalau kamu juga sedang edit `style.css`**, koordinasikan dulu siapa push duluan — supaya perubahan kita berdua tidak saling menimpa. Idealnya: gabungkan manual dulu sebelum push ke branch utama.
3. Bagian kami **belum tersambung ke backend asli** (server.php belum di-update untuk generate/simpan gambar) — jadi jangan kaget kalau `daftar_puisi` masih nampilin 3 data contoh (dummy), itu memang disengaja sampai backend selesai.

## Siap dipakai kapan saja
Bagian frontend ini tidak perlu menunggu `index.html` "final" — cukup pastikan dua poin struktur di atas aman.
