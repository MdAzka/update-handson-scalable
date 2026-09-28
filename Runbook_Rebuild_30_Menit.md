# Runbook Rebuild Cepat (Target 30 Menit) — Puisi Stateful Kel. D

Dipakai setiap kali AWS Academy Learner Lab di-reset dan semua resource hilang.
Semua langkah di sini sudah pernah dijalankan dan berhasil (28 September 2026).

> **Jangan tulis password database di file ini atau di repo public.** Tulis `<PASSWORD_DB>` saja dan isi sendiri saat mengetik perintah.

---

## 0. Persiapan (sebelum lab direset, sekali saja)

Pastikan ini ada di laptop dan GitHub:

- [ ] `server.php` versi terbaru. Password DB sebaiknya berupa placeholder `GANTI_PASSWORD` di file yang di-push (lihat Bagian 5)
- [ ] Semua frontend: `index.html`, `style.css`, `js/`, `login/`, `register/`, `submit_puisi/`, `daftar_puisi/`
- [ ] 4 template gambar: `latar1.jpeg`, `latar2.jpeg`, `latar3.jpeg`, `latar5.jpeg` (ukuran asli 200 × 112, **tidak boleh diubah**, itu ketentuan tugas)
- [ ] Folder `lambda-canvas-cdn/` dengan `index.mjs`, `package.json`, dan `function.zip` (di laptop; `node_modules/` jangan di-push ke GitHub)
- [ ] `key.pem` EC2 (kalau pakai `scp`)
- [ ] Skema database (jalankan di EC2 sebelum reset, simpan hasilnya):
  ```bash
  sudo mysqldump --no-data puisi_stateful > ~/skema.sql
  ```

---

## 1. Nilai tetap (boleh dipakai ulang)

| Item | Nilai |
|---|---|
| Bucket S3 | `kel-d-puisi-stateful-2026` |
| Region | `us-east-1` |
| Fungsi Lambda | `image-overlay-processor` (Node.js 24.x, LabRole, 512 MB, timeout 10 detik) |
| Template valid | `latar1`, `latar2`, `latar3`, `latar5` |
| Database / user | `puisi_stateful` / `puisi_app` |
| Cache policy custom | `CacheWithQueryString` (Query strings: All) |

## 2. Nilai yang BERUBAH tiap rebuild (catat setelah dibuat)

| Item | Dari mana | Dipakai di |
|---|---|---|
| Function URL Lambda | Lambda → Configuration → Function URL | Origin CloudFront (tanpa `https://` dan tanpa `/`) dan `LAMBDA_URL` di `server.php` (lengkap dengan `/` di ujung) |
| Public IPv4 DNS EC2 | EC2 → instance → Details | Origin `ec2-origin` di CloudFront |
| Public IP EC2 | EC2 → instance → Details | `scp` dan tes langsung |
| Domain CloudFront | CloudFront → General → Distribution domain name | `CLOUDFRONT_URL` di `submit_puisi.js`, `S3_BASE_URL` di `daftar_puisi.js` |

Catat nilai baru di sini setiap rebuild:

```
Function URL  : 
EC2 DNS       : 
EC2 IP        : 
CloudFront    : 
```

---

## 3. Urutan kerja dan target waktu

Urutan penting karena ada ketergantungan: Lambda dulu (URL-nya dibutuhkan CloudFront dan `server.php`), lalu CloudFront. **Selama CloudFront deploying (5–10 menit), kerjakan EC2** supaya waktunya tidak terbuang.

| Menit | Kerjakan |
|---|---|
| 0–5 | S3 (Bagian 4A) |
| 5–10 | Lambda (Bagian 4B) |
| 10–13 | Buat EC2 (Bagian 5A) |
| 13–20 | CloudFront (Bagian 4C), lalu biarkan deploying |
| 13–25 | Sambil menunggu: setup server EC2 (Bagian 5B–5D) |
| 25–28 | Edit URL di file, upload frontend (Bagian 6) |
| 28–30 | Tes end-to-end (Bagian 7) |

---

## 4. AWS: S3, Lambda, CloudFront

### 4A. S3 (≈ 5 menit)

1. S3 → **Create bucket** → nama `kel-d-puisi-stateful-2026`, region **us-east-1**.
2. **Hapus centang** "Block all public access" dan centang kotak konfirmasinya.
3. Tab **Permissions → Bucket policy → Edit**, tempel:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::kel-d-puisi-stateful-2026/*"
       }
     ]
   }
   ```
4. Tab **Properties → Static website hosting → Edit**: Enable, index document `index.html`.
5. Upload dulu 4 template `latar*.jpeg` ke root bucket (Lambda butuh ini). Frontend diupload nanti (Bagian 6).

### 4B. Lambda (≈ 5 menit)

1. Lambda → **Create function** → Author from scratch → `image-overlay-processor`, Node.js 24.x, execution role **Use existing role → LabRole**.
2. **Code → Upload from → .zip file** → `function.zip`.
3. **Configuration → General configuration → Edit**: Memory **512 MB**, Timeout **10 sec**.
4. **Configuration → Function URL → Create**: Auth type **NONE**. **Catat URL-nya.**
5. Tes di browser:
   `<function-url>?judul=Rindu&penulis=Azka&bait=Malam ini sunyi&template=latar2`
   Harus muncul gambar JPEG.

Cara membuat ulang `function.zip` kalau `index.mjs` berubah (PowerShell, dari folder `lambda-canvas-cdn`):

```powershell
Remove-Item function.zip -ErrorAction SilentlyContinue
Compress-Archive -Path index.mjs, package.json, node_modules -DestinationPath function.zip -Force
```

Baris pertama `index.mjs` harus langsung `import Jimp from "jimp";`, tidak boleh ada label bahasa seperti `javascript`.

### 4C. CloudFront (≈ 7 menit kerja, lalu menunggu deploy)

Buat distribusi:

1. CloudFront → **Create distribution** → plan **Free**.
2. **Origin type: Other** (bukan Amazon S3, dan jangan pakai "Browse S3"). Origin domain diketik:
   `kel-d-puisi-stateful-2026.s3-website-us-east-1.amazonaws.com`
3. Origin settings: **Customize** → Protocol **HTTP only**, port **80**.
4. Cache settings: **Customize** → Viewer protocol **Redirect HTTP to HTTPS**, methods **GET, HEAD**, cache policy **CachingOptimized**.
5. Enable security: default. **Create distribution**.
6. **General → Settings → Edit → Default root object** = `index.html`.

Tambah origin (tab **Origins → Create origin**):

| Nama | Origin domain | Protocol | Catatan |
|---|---|---|---|
| `lambda-origin` | Function URL tanpa `https://` dan tanpa `/` | **HTTPS only**, port **443** | Origin access: None |
| `ec2-origin` | **Public IPv4 DNS** EC2 (bukan IP mentah, bukan Instance ID) | **HTTP only**, port **80** | |

> **Jebakan yang pernah terjadi:** kalau `lambda-origin` dibiarkan **HTTP only** (port 80), hasilnya **504 Gateway Timeout** di `/fungsi`. Lambda Function URL hanya melayani HTTPS. Ciri di form: kalau kolomnya masih "HTTP port 80", berarti belum benar.

Buat cache policy (Policies → Cache → Create): nama `CacheWithQueryString`, Query strings **All**, headers dan cookies **None**.

Tambah behavior (tab **Behaviors → Create behavior**):

| Path pattern | Origin | Viewer protocol | Methods | Cache policy | Origin request policy |
|---|---|---|---|---|---|
| `/fungsi*` | `lambda-origin` | Redirect HTTP to HTTPS | GET, HEAD | `CacheWithQueryString` | `Managed-AllViewerExceptHostHeader` |
| `/server.php*` | `ec2-origin` | Redirect HTTP to HTTPS | **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** | **CachingDisabled** | `Managed-AllViewerExceptHostHeader` |
| Default (*) | S3 | Redirect HTTP to HTTPS | GET, HEAD | CachingOptimized | – |

Catatan penting:
- `/fungsi*` **wajib** pakai origin request policy di atas, kalau tidak Lambda menjawab 403.
- `/server.php*` **wajib** mengizinkan POST (login, register, submit) dan **wajib CachingDisabled**, supaya respons login tidak di-cache. Origin request policy-nya meneruskan cookie session ke EC2.
- Tunggu status distribusi selesai *Deploying* (kolom Last modified berisi tanggal) sebelum mengetes.

Tes setelah selesai deploy (ganti `<cf>` dengan domain CloudFront):

- `https://<cf>/fungsi?judul=Rindu&penulis=Azka&bait=Malam&template=latar2` → gambar muncul
- `https://<cf>/server.php?aksi=daftar_puisi` → JSON `Akses ditolak. Silakan login terlebih dahulu.` (ini tanda jalur EC2 lewat HTTPS sudah benar)

---

## 5. EC2 (kerjakan sambil menunggu CloudFront deploy)

### 5A. Buat instance

- Nama `puisi-kel-d`, Amazon Linux 2023, `t2.micro`
- Key pair baru (`key.pem`)
- Security group: SSH (22) dan HTTP (80) terbuka
- IAM instance profile: **LabRole** (supaya PHP boleh menulis ke S3 tanpa access key di kode)
- Catat **Public IPv4 address** dan **Public IPv4 DNS**
- Masuk lewat **EC2 Instance Connect** (tombol Connect di console)

### 5B. Apache, PHP, MariaDB

```bash
sudo dnf update -y
sudo dnf install -y httpd php php-mysqlnd php-xml mariadb105-server git
sudo systemctl enable --now httpd php-fpm mariadb
sudo systemctl restart httpd
```

### 5C. Database

```bash
sudo mysql
```

Di prompt MariaDB:

```sql
CREATE DATABASE puisi_stateful;
CREATE USER 'puisi_app'@'localhost' IDENTIFIED BY '<PASSWORD_DB>';
GRANT ALL PRIVILEGES ON puisi_stateful.* TO 'puisi_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Buat tabel dari skema yang disimpan (Bagian 0):

```bash
sudo mysql puisi_stateful < skema.sql
```

Kalau `skema.sql` tidak ada, kolom yang dibutuhkan:

- `users`: `id`, `username` (unik), `nama`, `password` (hash), `no_id`
- `puisi`: `id`, `user_id` (foreign key ke `users`), `judul`, `tgl_submit`, `isi`, `kategori`, `keyword`, `gambar_puisi`

Cek: `sudo mysql puisi_stateful -e "SHOW TABLES;"` harus menampilkan `puisi` dan `users`.

### 5D. Composer dan AWS SDK for PHP

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
sudo mv composer.phar /usr/local/bin/composer
cd /var/www
sudo COMPOSER_ALLOW_SUPERUSER=1 composer require aws/aws-sdk-php
ls /var/www/vendor/autoload.php
```

Folder `vendor` sengaja di luar `/var/www/html`, jadi tidak bisa dibuka dari browser.

### 5E. Pasang `server.php`

Di laptop, **sebelum** `scp`, pastikan baris ini sudah benar (tanpa spasi sebelum tanda kutip penutup):

```php
const LAMBDA_URL = 'https://<function-url-baru>.lambda-url.us-east-1.on.aws/';
```

> **Jebakan yang pernah terjadi:** ada spasi sebelum `';` di `LAMBDA_URL`, sehingga submit puisi gagal dengan "Gagal membuat gambar puisi." (502) padahal Lambda sehat.

Kirim dari PowerShell laptop (folder yang berisi `server.php` dan `key.pem`):

```powershell
scp -i key.pem server.php ec2-user@<IP-EC2>:~/server.php
```

Lalu di EC2:

```bash
sudo cp ~/server.php /var/www/html/server.php
grep LAMBDA_URL /var/www/html/server.php
```

Kalau password di file yang di-push berupa placeholder, isi passwordnya langsung di server (tidak lewat GitHub):

```bash
sudo sed -i 's/GANTI_PASSWORD/<PASSWORD_DB>/' /var/www/html/server.php
```

Cek: buka `http://<IP-EC2>/server.php?aksi=daftar_puisi`. Hasil yang benar adalah JSON "Akses ditolak..." (artinya file terpasang dan koneksi DB berhasil).

- "File not found." → `server.php` belum ada di `/var/www/html/`
- "Koneksi database gagal." → user atau password DB salah

### Masalah `scp` di Windows: "Permissions for key.pem are too open"

Penyebabnya izin file `key.pem` terlalu longgar. Perbaiki di PowerShell:

```powershell
icacls key.pem /inheritance:r
icacls key.pem /remove "NT AUTHORITY\Authenticated Users"
icacls key.pem /remove "BUILTIN\Users"
icacls key.pem /grant:r "$($env:USERNAME):(R)"
icacls key.pem
```

Yang tersisa hanya akun sendiri, `Administrators`, dan `SYSTEM`. `/inheritance:r` saja **tidak cukup**, entri yang menempel langsung di file harus dihapus dengan `/remove`.

---

## 6. Edit URL di frontend lalu upload

Edit di laptop dengan nilai baru dari Bagian 2:

| File | Baris | Isi |
|---|---|---|
| `submit_puisi/submit_puisi.js` | `CLOUDFRONT_URL` | `"https://<cf>/fungsi"` |
| `daftar_puisi/daftar_puisi.js` | `S3_BASE_URL` | `"https://<cf>"` |
| `server.php` | `LAMBDA_URL` | Function URL lengkap (Bagian 5E) |

`API_URL = "../server.php"` di `login.js`, `register.js`, `submit_puisi.js`, dan `daftar_puisi.js` **jangan diubah**. Dari halaman di CloudFront, path itu otomatis menjadi `https://<cf>/server.php`, yang diteruskan ke EC2. Ini juga menghindari mixed content (halaman HTTPS memanggil HTTP) dan masalah cookie session lintas domain.

> **Tips agar rebuild berikutnya lebih cepat (opsional, ubah kode setelah disetujui):** karena semuanya sudah satu domain CloudFront, `CLOUDFRONT_URL` bisa `"/fungsi"` dan `S3_BASE_URL` bisa `""`. Dengan begitu dua file JS ini tidak perlu diedit lagi setiap ganti domain.

Upload ke bucket S3 (S3 → bucket → Upload):

- `index.html`, `style.css`
- folder `js`, `login`, `register`, `submit_puisi`, `daftar_puisi`

**Jangan** upload `server.php` dan folder `lambda-canvas-cdn`.

---

## 7. Tes end-to-end (lewat domain CloudFront, bukan file di laptop)

1. Buka `https://<cf>/`
2. Register → login
3. Form submit puisi: isi semua field, ganti template satu per satu, preview harus berubah
4. Submit → pesan "Puisi berhasil disimpan."
5. Daftar puisi: gambar puisi baru muncul di paling atas

Kalau ada yang gagal, buka F12 → tab **Network** dan lihat request yang merah.

## 8. Bersih-bersih

```bash
sudo rm -f /var/www/html/tes.php
```

---

## 9. Tabel diagnosa cepat

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| `/fungsi` → **504 Gateway Timeout** | `lambda-origin` masih HTTP only (port 80) | Edit origin → **HTTPS only**, port 443 |
| `/fungsi` → **403** | Origin request policy belum dipasang di behavior `/fungsi*` | Pasang `Managed-AllViewerExceptHostHeader` |
| `/fungsi` → gambar lama masih muncul | Cache CloudFront (24 jam untuk URL identik) | Tambah `&v=2` di URL, atau buat invalidation |
| `server.php` → **File not found.** | File belum ada di `/var/www/html/` | `scp` lalu `sudo cp` |
| `server.php` → "Koneksi database gagal." | User atau password DB di `server.php` salah | Cek `db_user` dan `db_pass`, cocokkan dengan user MariaDB |
| Submit → "Gagal membuat gambar puisi." | `LAMBDA_URL` salah (spasi, atau masih `ISI_NANTI`) | `grep LAMBDA_URL /var/www/html/server.php` |
| Submit → "Gagal menyimpan gambar ke S3." | EC2 tidak memakai LabRole, atau nama bucket tidak cocok | Cek IAM instance profile dan `S3_BUCKET` |
| Login berhasil tapi halaman langsung minta login lagi | Cookie session tidak diteruskan ke EC2 | Cek origin request policy behavior `/server.php*` dan pastikan cache policy `CachingDisabled` |
| Halaman HTTPS, gambar/API tidak muncul | Mixed content (URL `http://` dipanggil dari halaman HTTPS) | Pakai domain CloudFront (HTTPS) di semua URL |
| `scp` → "key.pem too open" | Izin file `key.pem` | Lihat Bagian 5E (`icacls`) |
| `/fungsi` → teks bertumpuk di gambar | Template kecil (200 × 112), `index.mjs` versi lama | Pakai `index.mjs` versi terbaru (gambar diperbesar ke lebar 800 px sebelum teks dicetak) |
| IP EC2 berubah | Instance di-stop lalu di-start | Update `scp`, tes langsung; origin CloudFront memakai DNS, perbarui juga kalau DNS berubah |

---

## 10. Catatan penting

- Semua resource AWS Academy hilang saat lab direset. **Kode di laptop dan GitHub adalah penyelamatnya.** Simpan semuanya di sana.
- Restart lab dan rebuild **beberapa jam sebelum presentasi minggu ke-7**, jangan H-1 malam.
- Gambar puisi yang sudah tersimpan di S3 tidak ikut berubah kalau `index.mjs` diperbarui. Submit ulang puisi untuk melihat hasil baru.
- Jangan push password database ke repo public.


