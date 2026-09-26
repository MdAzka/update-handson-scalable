document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "../server.php";
  const S3_BASE_URL =
    "https://kel-d-puisi-stateful-2026.s3-website-us-east-1.amazonaws.com";

  const puisiGrid = document.getElementById("puisiGrid");
  const loadingMessage = document.getElementById("loadingMessage");
  const puisiMessage = document.getElementById("puisiMessage");

  // Data dummy — dipakai sementara selama backend/database belum siap
  const DUMMY_DATA = [
    {
      tgl_submit: "2026-09-26",
      judul: "Rindu Senja",
      kategori: "Romantis",
      gambar_puisi: "latar1.jpeg",
    },
    {
      tgl_submit: "2026-09-25",
      judul: "Langit Setelah Hujan",
      kategori: "Kehidupan",
      gambar_puisi: "latar2.jpeg",
    },
    {
      tgl_submit: "2026-09-24",
      judul: "Langkah Kecil",
      kategori: "Motivasi",
      gambar_puisi: "latar3.jpeg",
    },
  ];

  function renderPuisi(daftar) {
    puisiGrid.innerHTML = "";

    if (!daftar || daftar.length === 0) {
      puisiGrid.innerHTML = `<p class="empty-state">Belum ada puisi yang tersimpan.</p>`;
      return;
    }

    daftar.forEach(function (puisi) {
      const card = document.createElement("div");
      card.className = "puisi-card";

      const img = document.createElement("img");
      // gambar_puisi berisi nama file yang tersimpan di S3, contoh: "puisi_12_1727340000.jpg"
      img.src = puisi.gambar_puisi
        ? `${S3_BASE_URL}/${puisi.gambar_puisi}`
        : `${S3_BASE_URL}/latar1.jpeg`;
      img.alt = puisi.judul || "Puisi";
      img.className = "puisi-image";

      const info = document.createElement("div");
      info.className = "puisi-info";
      info.innerHTML = `
                <span class="puisi-tanggal">${formatTanggal(puisi.tgl_submit)}</span>
                <span class="puisi-kategori">${puisi.kategori || "-"}</span>
            `;

      card.appendChild(img);
      card.appendChild(info);
      puisiGrid.appendChild(card);
    });
  }

  async function loadPuisi() {
    try {
      const response = await fetch(API_URL + "?aksi=daftar_puisi", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.status === 401) {
        loadingMessage.classList.add("hidden");
        puisiMessage.textContent =
          data.message || "Anda harus login terlebih dahulu.";
        puisiMessage.className = "message error";
        setTimeout(function () {
          window.location.href = "../login/login.html";
        }, 1200);
        return;
      }

      loadingMessage.classList.add("hidden");

      if (response.ok && data.status === "success") {
        renderPuisi(data.data);
      } else {
        puisiMessage.textContent =
          data.message || "Gagal mengambil daftar puisi.";
        puisiMessage.className = "message error";
      }
    } catch (error) {
      console.error("Daftar Puisi Error:", error);
      loadingMessage.classList.add("hidden");

      // Backend/database belum siap — tampilkan dummy data supaya UI tetap bisa dites
      puisiMessage.textContent =
        "Menampilkan data contoh (server belum tersedia).";
      puisiMessage.className = "message error";
      renderPuisi(DUMMY_DATA);
    }
  }

  function formatTanggal(tanggal) {
    if (!tanggal) return "-";
    const date = new Date(tanggal);
    if (isNaN(date.getTime())) return tanggal;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  loadPuisi();
});
