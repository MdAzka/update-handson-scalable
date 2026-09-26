# Runbook Hands-On: Aplikasi Puisi Stateful Scalable
### (S3 + CloudFront + Lambda + EC2) — Kelompok D

> Dokumen ini ditulis super detail supaya siapa pun — teman satu kelompok, dosen, AI lain, bahkan orang yang baru belajar AWS — bisa mengikuti persis apa yang sudah dikerjakan dan apa yang masih perlu dikerjakan, tanpa perlu bertanya ulang dari nol.

---

## 1. Konteks & Tujuan Tugas

### 1.1 Latar belakang
Mata kuliah **Pengembangan Perangkat Lunak Scalable** (Dosen: I Gede Mujiyatna) memberikan dua modul berurutan:

1. **Tugas sebelumnya (individual)**: setiap mahasiswa deploy aplikasi web "Puisi Stateful" (PHP native + MariaDB/MySQL, session-based login) ke **satu EC2 instance** masing-masing.
2. **Tugas sekarang (kelompok, Hands-On ini)**: menggabungkan arsitektur jadi **scalable** dengan menambahkan:
   - **Amazon S3** — hosting file statis (html, css, js, gambar template) sebagai *public static web server*
   - **Amazon CloudFront** — CDN di depan S3 (dan nantinya juga di depan Lambda) untuk caching + HTTPS
   - **AWS Lambda** — microservice *stateless* yang men-generate gambar puisi (judul + penulis + bait dicetak di atas gambar template) menggunakan library **Jimp**
   - **EC2 (tetap dipakai)** — menjalankan `server.php` (logic backend) dan database (MariaDB/MySQL)

### 1.2 Pembagian role kelompok (dari brief awal)
| Anggota | Bagian | Tugas utama |
|---|---|---|
| Orang 1 | EC2 + PHP + Database | Menjaga `server.php`, MariaDB, session, integrasi nama file gambar |
| Orang 2 | Amazon S3 | Bucket, static hosting, upload html/css/js, template gambar |
| Orang 3 | Node.js + Lambda | Microservice generate gambar puisi, ambil template dari S3, deploy Lambda |
| Orang 4 | CloudFront/CDN | Distribution, origin S3+Lambda, behavior `/fungsi*`, cache policy |
| Orang 5 | Testing + Integrasi + Dokumentasi | Uji sistem, cache Hit/Miss, susun laporan |

**Azka (penulis chat ini)** mengambil peran yang mencakup Node.js+Lambda (role Orang 3), sekaligus ikut membangun CloudFront dan integrasi frontend↔backend karena role lain di kelompok belum jalan.

### 1.3 "Tugas Proyek" — requirement final yang harus dipenuhi
Dikutip dari diktat (Bagian akhir modul Hands-On):

> Tambahkan fitur menambahkan gambar pada setiap puisi yang di-upload oleh user. User boleh memilih gambar template sebelum submit, dan melihat preview hasil setiap ganti gambar. Yang dimuat di gambar adalah: **Judul puisi, penulis, dan penggalan bait**.
>
> Proses submit puisi:
> 1. User yang sudah login akses form submit puisi
> 2. User mengisikan judul puisi
> 3. User mengisikan isi puisi
> 4. User mengisikan bait puisi yang ditampilkan di gambar
> 5. User memilih template gambar
> 6. User melihat preview kutipan puisi di gambar
> 7. User submit puisi (judul, isi, tgl submit, kategori, keyword, file gambar puisi)
> 8. File gambar puisi disimpan di bucket S3, nama file disimpan di database
>
> Fitur "Daftar Puisi" tidak lagi menampilkan teks, melainkan **daftar image puisi**.
>
> Arsitektur akhir: User → CloudFront → (S3: html/js/css/img) + (Lambda: Image Generator) + (EC2: Action — login, register, submit, list)

Dipresentasikan minggu ke-7.

### 1.4 ⚠️ Catatan penting soal AWS Academy Learner Lab
Kita memakai **AWS Academy Learner Lab**, BUKAN akun AWS pribadi. Konsekuensinya:
- Sesi lab punya **batas waktu** (terlihat sebagai timer, mis. "02:41") dan **budget kredit** (mis. "$1.3 dari $40")
- Kalau sesi lab berakhir / direset (baik manual "End Lab" atau otomatis karena idle/lewat beberapa hari), **SEMUA resource yang dibuat di sesi itu HILANG PERMANEN**: bucket S3, distribusi CloudFront, fungsi Lambda, instance EC2 — semuanya hangus dan harus dibuat ulang dari nol.
- **Ini sudah pernah terjadi** di kelompok kami: Selasa selesai setup lengkap, Sabtu semua sudah hilang (0 distribusi CloudFront, S3 bucket gone, Lambda gone).
- **Mitigasi**:
  1. Simpan semua **kode** di komputer lokal (bukan hanya di AWS) — ini yang menyelamatkan kami, karena `index.mjs`, `function.zip`, file html/css/js semua masih ada.
  2. Simpan dokumen **runbook** ini (yang sedang kamu baca) — berisi semua nilai konfigurasi persis (nama bucket, JSON policy, dsb) supaya rebuild jauh lebih cepat.
  3. Sebelum sesi presentasi/deadline penting, **restart lab beberapa jam sebelumnya** dan rebuild ulang semua resource mengikuti runbook ini, jangan menunggu H-1 malam lalu dibiarkan idle semalaman.

---

## 2. Struktur Proyek Lokal (di Komputer)

```
Tugas/Kel D/
├── puisi-stateful/                  ← source code utama (dari GitHub Raffa, base app)
│   ├── index.html                   ← dashboard utama (statis → S3)
│   ├── style.css                    ← styling (statis → S3)
│   ├── server.php                   ← backend PHP (TETAP DI EC2, jangan upload ke S3)
│   ├── js/                          ← js umum (statis → S3)
│   ├── login/
│   │   ├── login.html
│   │   └── login.js
│   ├── register/
│   │   ├── register.html
│   │   └── register.js
│   ├── submit_puisi/
│   │   ├── submit_puisi.html
│   │   └── submit_puisi.js
│   └── daftar_puisi/
│       ├── daftar_puisi.html
│       └── daftar_puisi.js
│
├── latar1.jpeg, latar2.jpeg,        ← template gambar puisi (statis → S3, root bucket)
│   latar3.jpeg, latar5.jpeg
│
└── lambda-canvas-cdn/                ← proyek Node.js terpisah, khusus untuk Lambda
    ├── index.mjs                     ← kode handler Lambda (lihat Bagian 5)
    ├── package.json                  ← { "type": "module" }
    ├── node_modules/                 ← hasil `npm install`
    └── function.zip                  ← hasil kompres, di-upload manual ke Lambda Console
```

**Aturan pemisahan penting**:
- **Yang di-upload ke S3** (folder `puisi-stateful`, KECUALI `server.php`): `index.html`, `style.css`, folder `js/`, `login/`, `register/`, `submit_puisi/`, `daftar_puisi/`, dan 4 file template gambar.
- **Yang TETAP di EC2**: `server.php` saja — karena S3 tidak bisa mengeksekusi PHP, S3 cuma bisa serve file statis.
- **Yang di-upload ke Lambda** (folder `lambda-canvas-cdn` terpisah): HANYA lewat AWS Lambda Console (Upload .zip), TIDAK PERNAH ikut ke S3.

---

## 3. Bagian 1 — S3 Static Website Hosting (SELESAI ✅)

### 3.1 Membuat bucket S3
1. Buka **S3 Console** → **Create bucket**
2. Nama bucket: **`kel-d-puisi-stateful-2026`**
3. Region: **US East (N. Virginia) us-east-1** (wajib sesuai ketentuan tugas)
4. **Object Ownership**: biarkan default (**ACLs disabled / Bucket owner enforced**)
5. **Block Public Access settings**: **hapus centang** "Block all public access", lalu centang kotak konfirmasi **"I acknowledge that the current settings might result in this bucket and the objects within becoming public."**
6. **Bucket Versioning**: Disable (default)
7. **Object Lock**: Disable (default) — jangan diaktifkan (memaksa Versioning nyala, tidak dibutuhkan)
8. **Default encryption**: biarkan default (**SSE-S3**, Bucket Key: Enabled)
9. Klik **Create bucket**

### 3.2 Bucket Policy (akses baca publik)
Bucket → tab **Permissions** → **Bucket policy** → **Edit** → tempel:

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

Klik **Save changes**.

### 3.3 Aktifkan Static Website Hosting
Tab **Properties** → scroll paling bawah → panel **Static website hosting** → **Edit**:
- **Enable**
- Hosting type: **Host a static website**
- **Index document**: `index.html`
- **Error document** (opsional): `error.html`
- **Save changes**

Endpoint yang dihasilkan (format untuk region us-east-1):
```
http://kel-d-puisi-stateful-2026.s3-website-us-east-1.amazonaws.com
```

### 3.4 Upload file statis
Tab **Objects** → **Upload** → tambahkan:
- `index.html`, `style.css`
- folder `js/`, `login/`, `register/`, `submit_puisi/`, `daftar_puisi/`
- `latar1.jpeg`, `latar2.jpeg`, `latar3.jpeg`, `latar5.jpeg` (root bucket)

**JANGAN upload**: `server.php`, folder `lambda-canvas-cdn/` (termasuk `function.zip`, `node_modules/`).

### 3.5 Catatan error yang pernah muncul (bukan masalah nyata)
- **"You don't have permission to get Object Lock details"** dengan pesan *explicit deny* → normal, karena role IAM AWS Academy Lab (`voclabs`) sengaja dibatasi. Abaikan, tidak berpengaruh ke fungsi bucket.
- **"Access denied to route53:ListHostedZonesByName"** saat setup CloudFront → sama, role lab dibatasi akses Route 53. Abaikan, cukup skip opsi domain custom.

---

## 4. Bagian 1 — CloudFront Distribution (SELESAI ✅)

### 4.1 Membuat distribusi
1. **CloudFront Console** → **Create distribution**
2. **Choose a plan**: pilih **Free** ($0/mo) — cukup untuk kebutuhan tugas
3. **Get started**:
   - Distribution name: `kel-d-puisi-stateful`
   - Distribution type: **Single website configuration**
   - Route 53 managed domain: **skip/kosongkan** (lihat catatan error di atas)
4. **Specify origin**:
   - **Origin domain**: PENTING — jangan pilih dari dropdown biasa (itu REST endpoint, salah). Klik tombol **"Use website endpoint"** yang muncul di kotak kuning peringatan, supaya otomatis terisi dengan **S3 Website Endpoint** yang benar:
     ```
     kel-d-puisi-stateful-2026.s3-website-us-east-1.amazonaws.com
     ```
   - **Origin settings**: pilih **Customize origin settings** → Protocol: **HTTP only**, HTTP port: **80**
   - **Cache settings**: pilih **Customize cache settings** → Viewer protocol policy: **Redirect HTTP to HTTPS**, Allowed HTTP methods: **GET, HEAD**, Cache policy: **CachingOptimized**
5. **Enable security**: biarkan default (WAF gratis otomatis included di plan Free, "Use monitor mode" tidak dicentang)
6. **Review and create** → cek origin domain sudah benar → **Create distribution**
7. Setelah dibuat, **WAJIB isi Default root object**: Settings → Edit → **Default root object**: `index.html` → Save (tanpa ini, akses ke `/` tidak akan otomatis serve `index.html`)

### 4.2 Hasil (contoh domain yang pernah didapat — akan BEDA tiap kali rebuild)
```
https://d16t0mhw7tte9u.cloudfront.net
```
> ⚠️ Domain CloudFront akan selalu beda setiap kali distribusi dibuat ulang (setelah lab reset). Selalu cek domain terbaru di CloudFront Console, JANGAN hardcode domain lama di kode.

---

## 5. Bagian 2, Tahap 1-2 — Lambda Image Generator (SELESAI ✅)

### 5.1 Setup proyek lokal
```powershell
mkdir lambda-canvas-cdn
cd lambda-canvas-cdn
npm init -y
npm pkg set type="module"
npm install @aws-sdk/client-s3 jimp@0.22.12
```
> Gunakan **Jimp v0.22.12** persis — versi ini punya font bitmap bawaan, stabil tanpa dependensi font sistem operasi. JANGAN jalankan `npm audit fix --force` — tidak diperlukan dan berisiko meng-upgrade Jimp ke versi tidak stabil.

### 5.2 Kode `index.mjs` (versi final — support judul, penulis, bait, template)

```javascript
import Jimp from "jimp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = "kel-d-puisi-stateful-2026";

const VALID_TEMPLATES = ["latar1", "latar2", "latar3", "latar5"];

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const judul = params.judul || "Tanpa Judul";
    const penulis = params.penulis || "Anonim";
    const bait = params.bait || "...";

    let template = params.template || "latar1";
    if (!VALID_TEMPLATES.includes(template)) {
      template = "latar1";
    }
    const IMAGE_KEY = `${template}.jpeg`;

    const s3Res = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: IMAGE_KEY,
      })
    );
    const buffer = await streamToBuffer(s3Res.Body);
    const image = await Jimp.read(buffer);

    const fontJudul = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    const fontPenulis = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    const fontBait = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    image.print(
      fontJudul, 0, height * 0.15,
      { text: judul, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
      width, height * 0.2
    );

    image.print(
      fontPenulis, 0, height * 0.35,
      { text: `by ${penulis}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
      width, height * 0.1
    );

    image.print(
      fontBait, 0, height * 0.5,
      { text: bait, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE },
      width, height * 0.4
    );

    const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    return {
      statusCode: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400",
      },
      body: outputBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Processing error:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "Error: " + err.message,
    };
  }
};
```

> ⚠️ **Jebakan yang pernah kejadian**: kalau kamu copy kode dari dokumen/PDF yang menandai blok kode dengan label bahasa (mis. "```javascript"), PASTIKAN label itu **tidak ikut ter-paste** sebagai baris kode asli. Dulu sempat ada baris `JavaScript;` nyangkut di baris pertama file, menyebabkan error:
> ```
> ReferenceError: JavaScript is not defined
> at file:///var/task/index.mjs:1:1
> ```
> Solusi: hapus baris itu, baris pertama file harus langsung `import Jimp from "jimp";`.

### 5.3 Packaging & Deploy
```powershell
Remove-Item function.zip -ErrorAction SilentlyContinue
Compress-Archive -Path index.mjs, package.json, node_modules -DestinationPath function.zip -Force
```

Di **Lambda Console**:
1. **Create function** → **Author from scratch**
2. Function name: **`image-overlay-processor`**
3. Runtime: **Node.js 24.x**
4. Execution role: **Use an existing role** → **LabRole**
5. **Create function**
6. Tab **Code** → **Upload from** → **.zip file** → pilih `function.zip` (aman upload langsung sampai ~50MB, tidak perlu lewat S3 meski muncul saran "consider uploading using Amazon S3" untuk file >10MB — itu cuma saran opsional)
7. Tab **Configuration** → **General configuration** → **Edit**: **Memory: 512 MB**, **Timeout: 10 sec** → Save

### 5.4 Aktifkan Function URL
Configuration → **Function URL** → **Create function URL** → **Auth type: NONE** → Save

Contoh hasil (akan selalu beda tiap rebuild):
```
https://yvkhuabt32nxgyweidx3o3ywre0vditr.lambda-url.us-east-1.on.aws/
```

### 5.5 Test langsung
```
https://<function-url>/?judul=Rindu&penulis=Azka&bait=Malam ini sunyi sekali&template=latar2
```
Harus muncul gambar JPEG dengan 3 baris teks tersusun di atas template yang dipilih.

---

## 6. Bagian 2, Tahap 3 — Integrasi CloudFront ↔ Lambda / Multi-Origin (SELESAI ✅)

Tujuan: satu domain CloudFront melayani DUA origin sekaligus — path biasa (`/index.html`, dst) ke S3, path `/fungsi*` ke Lambda.

### 6.1 Tambah Origin Lambda
Distribusi CloudFront → tab **Origins** → **Create origin**:
- **Origin domain**: domain Function URL Lambda, **tanpa** `https://` dan **tanpa** `/` di akhir, contoh:
  ```
  yvkhuabt32nxgyweidx3o3ywre0vditr.lambda-url.us-east-1.on.aws
  ```
- **Protocol**: **HTTPS only**
- **HTTPS port**: 443 (default)
- **Minimum Origin SSL protocol**: TLSv1.2 (default)
- **Name**: bebas, misal `lambda-origin`
- **Origin access control**: **None** (fitur ini khusus untuk origin S3, tidak berlaku untuk Lambda)
- Sisanya biarkan default → **Create origin**

### 6.2 Buat Cache Policy khusus Query String
CloudFront sidebar → **Policies** → tab **Cache** → **Create cache policy**:
- Name: **`CacheWithQueryString`**
- **Query strings**: pilih **All** (WAJIB — supaya parameter `?judul=...&penulis=...&bait=...&template=...` tidak dipotong oleh cache)
- Headers: None, Cookies: None (default)
- TTL settings: biarkan default
- **Create**

### 6.3 Buat Behavior untuk path `/fungsi*`
Distribusi → tab **Behaviors** → **Create behavior**:
- **Path pattern**: `/fungsi*`
- **Origin**: pilih origin Lambda (`lambda-origin`)
- **Viewer protocol policy**: **Redirect HTTP to HTTPS**
- **Allowed HTTP methods**: **GET, HEAD**
- **Cache key and origin requests**: **Cache policy and origin request policy (recommended)**
  - **Cache policy**: `CacheWithQueryString`
  - **Origin request policy**: **`Managed-AllViewerExceptHostHeader`** ⚠️ **WAJIB** — kalau ini terlewat, Lambda akan menolak request dengan **HTTP 403 Forbidden** karena header `Host` asli CloudFront ikut diteruskan ke Lambda, yang tidak dikenali Lambda Function URL.
- **Function associations**: None
- **Create behavior**

Hasil akhir tab Behaviors (contoh):
| Precedence | Path pattern | Origin | Cache policy | Origin request policy |
|---|---|---|---|---|
| 0 | `/fungsi*` | lambda-origin | CacheWithQueryString | Managed-AllViewerExceptHostHeader |
| 1 | Default (*) | S3 origin | CachingOptimized | - |

### 6.4 Verifikasi akhir (Tahap 4 diktat)
```
https://<domain-cloudfront>/fungsi?judul=Rindu&penulis=Azka&bait=Malam ini sunyi&template=latar2
```
→ gambar muncul lewat CloudFront (bukan langsung Lambda URL)

```
https://<domain-cloudfront>/index.html
```
→ file statis S3 tetap normal, tidak terganggu oleh behavior `/fungsi`

Cek cache Hit/Miss (kalau ada akses CMD/terminal):
```bash
curl -I "https://<domain-cloudfront>/fungsi?text=Testing"
```
Jalankan 2x dengan URL SAMA PERSIS — pertama harus `X-Cache: Miss from cloudfront`, kedua `X-Cache: Hit from cloudfront`.

---

## 7. Isu Terpisah — Perbaikan Integrasi Frontend ↔ Backend EC2 (DITEMUKAN, BELUM SEMUA DIPERBAIKI)

### 7.1 Akar masalah
Saat aplikasi lama (single-EC2) dipisah — frontend pindah ke S3, backend `server.php` tetap di EC2 — file JavaScript yang tadinya memanggil path **relatif** (karena dulu satu server yang sama) menjadi salah arah.

Contoh ditemukan di `register/register.js`:
```javascript
const API_URL = "../server.php";  // ❌ path relatif — akan dicari di S3, bukan EC2!
```

Ketika halaman dibuka dari S3/CloudFront, `fetch(API_URL + ...)` akan mencoba mencari `server.php` di **S3** — yang tidak ada di sana (S3 tidak bisa jalankan PHP) — sehingga muncul pesan **"Tidak dapat terhubung ke server."**

### 7.2 Solusi (belum dieksekusi — menunggu EC2 aktif)
Ganti setiap `API_URL` di semua file JS (`login.js`, `register.js`, `submit_puisi.js`, `daftar_puisi.js`) dari path relatif menjadi **URL absolut** menunjuk ke EC2:
```javascript
const API_URL = "http://<PUBLIC_IP_EC2_KELOMPOK>/server.php";
```

> ⚠️ Status: **EC2 kelompok D belum aktif/di-launch** pada saat dokumen ini ditulis. Perbaikan `API_URL` ini baru bisa dieksekusi dan ditest begitu EC2 sudah jalan dengan `server.php` + database ter-deploy.

---

## 8. Progress "Tugas Proyek" (gambar puisi) — SEDANG BERLANGSUNG 🔄

### 8.1 Breakdown pekerjaan
| # | Komponen | Status |
|---|---|---|
| 1 | Lambda terima judul/penulis/bait/template | ✅ Selesai (lihat Bagian 5.2) |
| 2 | `server.php` — endpoint `get_user` baru (ambil nama penulis dari session) | ✅ Selesai (lihat 8.2) |
| 3 | `submit_puisi.html` — field bait + pilihan template + area preview | ✅ Selesai (lihat 8.3) |
| 4 | `submit_puisi.js` — live preview + kirim bait/template saat submit | ✅ Selesai (lihat 8.3) |
| 5 | `server.php` — `case 'submit_puisi'` generate gambar via Lambda & simpan ke S3 | 🔲 Belum — sedang didiskusikan pendekatan teknisnya |
| 6 | Tabel `puisi` — tambah kolom nama file gambar | 🔲 Belum |
| 7 | `daftar_puisi.html/js` — tampilkan gambar, bukan teks | 🔲 Belum |
| 8 | EC2 kelompok — launch instance, install PHP+MariaDB+Apache | 🔲 Belum |
| 9 | Fix `API_URL` di semua file JS | 🔲 Belum (butuh poin 8 selesai dulu) |

### 8.2 Perubahan `server.php` — endpoint `get_user` (SELESAI)

Ditambahkan **satu case baru** (setelah `case 'login'`, sebelum `case 'submit_puisi'`), method GET, mengembalikan nama & username dari session aktif:

```php
case 'get_user':

    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode([
            "status" => "error",
            "message" => "Method harus GET."
        ]);
        exit();
    }

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "Akses ditolak. Silakan login terlebih dahulu."
        ]);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "user" => [
            "id" => $_SESSION['user_id'],
            "username" => $_SESSION['username'],
            "nama" => $_SESSION['nama']
        ]
    ]);

    break;
```

Juga di-update pesan `default:` agar menyebut aksi baru ini:
```php
"message" => "Aksi tidak valid. Gunakan login, register, get_user, submit_puisi, daftar_puisi, atau logout."
```

**Alasan pendekatan ini**: nama penulis TIDAK diminta manual dari user via input form — melainkan diambil otomatis dari sesi login yang sudah aktif (sesuai alur Tugas Proyek: "User yang sudah login akses form submit puisi"). Ini konsisten dengan pola server-side session yang sudah dipakai di seluruh aplikasi.

### 8.3 Perubahan `submit_puisi.html` & `submit_puisi.js` (SELESAI)

**Tambahan di HTML** (di dalam `<form id="puisiForm">`, sebelum tombol submit):
```html
<div class="form-group">
  <label for="bait">Bait Puisi (untuk gambar)</label>
  <textarea id="bait" name="bait" rows="3"
    placeholder="Potongan bait yang akan tampil di gambar" required></textarea>
</div>

<div class="form-group">
  <label>Pilih Template Gambar</label>
  <div class="template-choices">
    <label><input type="radio" name="template" value="latar1" checked> Template 1</label>
    <label><input type="radio" name="template" value="latar2"> Template 2</label>
    <label><input type="radio" name="template" value="latar3"> Template 3</label>
    <label><input type="radio" name="template" value="latar5"> Template 4</label>
  </div>
</div>

<div class="form-group">
  <label>Preview Gambar Puisi</label>
  <img id="previewImage" src="" alt="Preview" style="max-width:100%; border:1px solid #ccc;">
</div>
```

**Logic JS baru** (`submit_puisi.js` — versi lengkap):
```javascript
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "../server.php";
  const CLOUDFRONT_URL = "https://d16t0mhw7tte9u.cloudfront.net/fungsi"; // ⚠️ update sesuai domain CloudFront TERBARU

  const puisiForm = document.getElementById("puisiForm");
  const puisiMessage = document.getElementById("puisiMessage");
  const previewImage = document.getElementById("previewImage");

  let namaPenulis = "Anonim";

  async function loadUser() {
    try {
      const res = await fetch(API_URL + "?aksi=get_user", {
        method: "GET",
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        namaPenulis = data.user.nama;
      } else {
        window.location.href = "../login/login.html";
      }
    } catch (error) {
      console.error("Get user error:", error);
    }
  }

  function updatePreview() {
    const judul = document.getElementById("judul").value.trim() || "Tanpa Judul";
    const bait = document.getElementById("bait").value.trim() || "...";
    const template = document.querySelector('input[name="template"]:checked').value;
    const url = `${CLOUDFRONT_URL}?judul=${encodeURIComponent(judul)}&penulis=${encodeURIComponent(namaPenulis)}&bait=${encodeURIComponent(bait)}&template=${template}&t=${Date.now()}`;
    previewImage.src = url;
  }

  document.getElementById("judul").addEventListener("input", updatePreview);
  document.getElementById("bait").addEventListener("input", updatePreview);
  document.querySelectorAll('input[name="template"]').forEach(function (radio) {
    radio.addEventListener("change", updatePreview);
  });

  puisiForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const judul = document.getElementById("judul").value.trim();
    const kategori = document.getElementById("kategori").value.trim();
    const keyword = document.getElementById("keyword").value.trim();
    const isi = document.getElementById("isi").value.trim();
    const bait = document.getElementById("bait").value.trim();
    const template = document.querySelector('input[name="template"]:checked').value;

    if (!judul || !kategori || !keyword || !isi || !bait) {
      puisiMessage.textContent = "Semua field puisi wajib diisi.";
      puisiMessage.className = "message error";
      return;
    }

    try {
      const response = await fetch(API_URL + "?aksi=submit_puisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ judul, isi, kategori, keyword, bait, template })
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        puisiMessage.textContent = data.message;
        puisiMessage.className = "message success";
        puisiForm.reset();
        previewImage.src = "";
      } else {
        puisiMessage.textContent = data.message || "Gagal menyimpan puisi.";
        puisiMessage.className = "message error";
        if (response.status === 401) {
          setTimeout(function () {
            window.location.href = "../login/login.html";
          }, 1200);
        }
      }
    } catch (error) {
      console.error("Submit Puisi Error:", error);
      puisiMessage.textContent = "Tidak dapat terhubung ke server.";
      puisiMessage.className = "message error";
    }
  });

  loadUser().then(updatePreview);
});
```

> ⚠️ **Catatan penting**: kode ini SUDAH mengirim `bait` dan `template` ke `server.php`, tapi backend **BELUM** bisa memprosesnya (lihat 8.4) — jadi kalau dites sekarang, data itu akan diabaikan begitu saja tanpa error, tapi juga tidak tersimpan.

### 8.4 Rencana `server.php` — generate & simpan gambar (SEDANG DIDISKUSIKAN, BELUM DIEKSEKUSI)

**Masalah teknis**: `server.php` (PHP native, tanpa framework) di EC2 perlu:
1. Meminta Lambda men-generate gambar (fetch dari CloudFront `/fungsi?...`)
2. Meng-upload hasil gambar (binary) itu ke bucket S3

PHP native TIDAK punya AWS SDK ter-install secara default — beda dari proyek Node.js Lambda yang sudah pakai `@aws-sdk/client-s3`.

**Tiga pendekatan yang dipertimbangkan:**

| Pendekatan | Deskripsi | Kelebihan | Kekurangan |
|---|---|---|---|
| **A. Manual REST API S3 + signature v4** | PHP fetch gambar dari Lambda, lalu PUT ke S3 pakai HTTP request manual dengan tanda tangan HMAC-SHA256 buatan sendiri | Tidak perlu install apa pun | Sangat kompleks, rawan bug di signature, sulit di-debug |
| **B. AWS SDK for PHP (via Composer)** ⭐ direkomendasikan | Install `aws/aws-sdk-php` lewat Composer, panggil `$s3Client->putObject(...)` | Simpel, robust, standar industri | Perlu Composer + koneksi internet di EC2 |
| **C. Bucket public-write** | Bucket S3 dibuat bisa ditulis publik | Paling simpel | ❌ Sangat tidak aman, TIDAK disarankan |

**Keputusan sementara**: condong ke **Pendekatan B**, menunggu konfirmasi:
- Apakah EC2 kelompok (belum di-launch) nanti punya akses internet keluar untuk `composer require aws/aws-sdk-php`
- Belum ada keputusan final — diskusi terakhir terhenti di sini sebelum diminta membuat dokumen ini.

**Rencana alur (draft, belum final):**
1. `case 'submit_puisi'` menerima tambahan field `bait` dan `template` dari `$input`
2. PHP membangun URL: `https://<cloudfront-domain>/fungsi?judul=...&penulis=...&bait=...&template=...`
3. PHP fetch URL itu (`file_get_contents()` atau `curl`), dapat data gambar JPEG (binary)
4. PHP upload data gambar itu ke S3 dengan nama file unik (mis. `puisi_<user_id>_<timestamp>.jpg`) memakai AWS SDK for PHP
5. Nama file itu disimpan ke kolom baru di tabel `puisi` (mis. `gambar_puisi VARCHAR(255)`)
6. Response sukses dikembalikan ke frontend seperti biasa

---

## 9. Yang Masih Harus Dikerjakan (Checklist Lanjutan)

- [ ] Putuskan & eksekusi pendekatan upload gambar dari PHP ke S3 (Bagian 8.4)
- [ ] Tambah kolom `gambar_puisi` (dan cek apakah perlu kolom lain) di tabel `puisi` melalui `ALTER TABLE`
- [ ] Update `case 'submit_puisi'` di `server.php` sesuai pendekatan yang dipilih
- [ ] Update `case 'daftar_puisi'` di `server.php` agar ikut mengembalikan nama file gambar
- [ ] Update `daftar_puisi.html` & `daftar_puisi.js` agar menampilkan `<img>` (bukan teks) berdasarkan nama file dari S3
- [ ] Launch EC2 instance kelompok (Amazon Linux 2023, t2.micro, security group buka port 22 & 80, key pair baru)
- [ ] Install Apache, PHP, PHP-FPM, MariaDB di EC2 (ikuti pola dari laporan Raffa sebagai referensi)
- [ ] Deploy `server.php` (versi terbaru dengan semua endpoint) + database ke EC2 tersebut
- [ ] Perbaiki `API_URL` di SEMUA file JS (`login.js`, `register.js`, `submit_puisi.js`, `daftar_puisi.js`) dari path relatif ke URL absolut EC2
- [ ] Test end-to-end: register → login → submit puisi dengan gambar → lihat di daftar puisi
- [ ] Siapkan runbook rebuild cepat (dokumen ini) untuk dipakai ulang jika lab AWS Academy reset lagi sebelum presentasi minggu ke-7

---

## 10. Referensi Nilai-Nilai Penting (untuk rebuild cepat)

> ⚠️ Nilai di bawah ini akan BERUBAH setiap kali lab di-reset dan resource dibuat ulang — kecuali yang ditandai "tetap sama".

| Item | Nilai (tetap sama, boleh dipakai ulang) |
|---|---|
| Nama bucket S3 | `kel-d-puisi-stateful-2026` |
| Region | `us-east-1` |
| Nama fungsi Lambda | `image-overlay-processor` |
| Runtime Lambda | Node.js 24.x |
| Execution role Lambda | LabRole |
| Memory / Timeout Lambda | 512 MB / 10 detik |
| Template gambar valid | `latar1`, `latar2`, `latar3`, `latar5` |
| Cache policy custom | `CacheWithQueryString` (Query strings: All) |
| Origin request policy (wajib) | `Managed-AllViewerExceptHostHeader` |
| Path pattern behavior Lambda | `/fungsi*` |

| Item | Nilai (SELALU BEDA tiap rebuild — cek ulang di console) |
|---|---|
| S3 website endpoint | `http://kel-d-puisi-stateful-2026.s3-website-us-east-1.amazonaws.com` (biasanya sama karena nama bucket sama) |
| Domain CloudFront | contoh terakhir: `d16t0mhw7tte9u.cloudfront.net` — **cek ulang tiap rebuild** |
| Function URL Lambda | contoh terakhir: `yvkhuabt32nxgyweidx3o3ywre0vditr.lambda-url.us-east-1.on.aws` — **cek ulang tiap rebuild** |
| Public IP EC2 | belum ada — akan didapat setelah instance di-launch |

---

*Dokumen ini disusun berdasarkan progres percakapan pengerjaan tugas kelompok D, mata kuliah Pengembangan Perangkat Lunak Scalable. Update dokumen ini setiap kali ada progres baru atau setelah rebuild akibat reset lab.*
