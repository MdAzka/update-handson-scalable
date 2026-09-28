document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "../server.php";
  const CLOUDFRONT_URL = "https://d1mwmyki7vvl0b.cloudfront.net/fungsi";

  const puisiForm = document.getElementById("puisiForm");
  const puisiMessage = document.getElementById("puisiMessage");
  const previewImage = document.getElementById("previewImage");

  let namaPenulis = "Anonim";

  // 1. Ambil nama penulis dari session
  async function loadUser() {
    try {
      const res = await fetch(API_URL + "?aksi=get_user", {
        method: "GET",
        credentials: "include",
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

  // 2. Update preview gambar
  function updatePreview() {
    const judul =
      document.getElementById("judul").value.trim() || "Tanpa Judul";
    const bait = document.getElementById("bait").value.trim() || "...";
    const template = document.querySelector(
      'input[name="template"]:checked',
    ).value;

    const url = `${CLOUDFRONT_URL}?judul=${encodeURIComponent(judul)}&penulis=${encodeURIComponent(namaPenulis)}&bait=${encodeURIComponent(bait)}&template=${template}&t=${Date.now()}`;

    previewImage.src = url;
  }

  // Pasang listener ke input yang mempengaruhi preview
  document.getElementById("judul").addEventListener("input", updatePreview);
  document.getElementById("bait").addEventListener("input", updatePreview);
  document.querySelectorAll('input[name="template"]').forEach(function (radio) {
    radio.addEventListener("change", updatePreview);
  });

  // 3. Submit puisi
  puisiForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const judul = document.getElementById("judul").value.trim();
    const kategori = document.getElementById("kategori").value.trim();
    const keyword = document.getElementById("keyword").value.trim();
    const isi = document.getElementById("isi").value.trim();
    const bait = document.getElementById("bait").value.trim();
    const template = document.querySelector(
      'input[name="template"]:checked',
    ).value;

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
        body: JSON.stringify({
          judul: judul,
          isi: isi,
          kategori: kategori,
          keyword: keyword,
          bait: bait,
          template: template,
        }),
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

  // Jalankan saat halaman dimuat
  loadUser().then(updatePreview);
});
