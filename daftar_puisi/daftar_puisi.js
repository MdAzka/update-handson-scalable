document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "../server.php";
  const S3_BASE_URL = "https://d1mwmyki7vvl0b.cloudfront.net";

  const puisiGrid = document.getElementById("puisiGrid");
  const loadingMessage = document.getElementById("loadingMessage");
  const puisiMessage = document.getElementById("puisiMessage");

  // Data dummy — dipakai hanya kalau server tidak bisa dihubungi
  const DUMMY_DATA = [
    {
      tgl_submit: "2026-09-26",
      judul: "Rindu Senja",
      kategori: "Romantis",
      gambar_puisi: "latar1.jpeg",
      isi: "Senja turun pelan,\nmembawa rindu yang tak bertuan.",
    },
    {
      tgl_submit: "2026-09-25",
      judul: "Langit Setelah Hujan",
      kategori: "Kehidupan",
      gambar_puisi: "latar2.jpeg",
      isi: "Setelah hujan reda,\nlangit belajar tersenyum lagi.",
    },
    {
      tgl_submit: "2026-09-24",
      judul: "Langkah Kecil",
      kategori: "Motivasi",
      gambar_puisi: "latar3.jpeg",
      isi: "Satu langkah kecil hari ini\nlebih berarti dari seribu rencana.",
    },
  ];

  // ---------- Popup detail puisi ----------
  const style = document.createElement("style");
  style.textContent = `
    .puisi-card { cursor: pointer; }
    .puisi-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .puisi-modal.open { display: flex; }
    .puisi-modal-box {
      position: relative;
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }
    .puisi-modal-close {
      position: absolute;
      top: 10px;
      right: 14px;
      border: none;
      background: none;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      color: #555;
    }
    .puisi-modal-image {
      width: 100%;
      border-radius: 12px;
      display: block;
      margin-top: 18px;
    }
    .puisi-modal-title { margin: 16px 0 4px; font-size: 1.4rem; }
    .puisi-modal-meta { margin: 0 0 14px; color: #777; font-size: 0.9rem; }
    .puisi-modal-isi { white-space: pre-wrap; line-height: 1.7; margin: 0; }
  `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.className = "puisi-modal";

  const modalBox = document.createElement("div");
  modalBox.className = "puisi-modal-box";

  const modalClose = document.createElement("button");
  modalClose.className = "puisi-modal-close";
  modalClose.type = "button";
  modalClose.setAttribute("aria-label", "Tutup");
  modalClose.textContent = "\u00d7";

  const modalImage = document.createElement("img");
  modalImage.className = "puisi-modal-image";

  const modalTitle = document.createElement("h3");
  modalTitle.className = "puisi-modal-title";

  const modalMeta = document.createElement("p");
  modalMeta.className = "puisi-modal-meta";

  const modalIsi = document.createElement("p");
  modalIsi.className = "puisi-modal-isi";

  modalBox.appendChild(modalClose);
  modalBox.appendChild(modalImage);
  modalBox.appendChild(modalTitle);
  modalBox.appendChild(modalMeta);
  modalBox.appendChild(modalIsi);
  modal.appendChild(modalBox);
  document.body.appendChild(modal);

  function bukaModal(puisi) {
    modalImage.src = urlGambar(puisi);
    modalImage.alt = puisi.judul || "Puisi";
    modalTitle.textContent = puisi.judul || "Tanpa Judul";
    modalMeta.textContent =
      formatTanggal(puisi.tgl_submit) + " \u2022 " + (puisi.kategori || "-");
    modalIsi.textContent = puisi.isi || "(Isi puisi tidak tersedia.)";
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function tutupModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  modalClose.addEventListener("click", tutupModal);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) tutupModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") tutupModal();
  });

  // ---------- Daftar puisi ----------
  function urlGambar(puisi) {
    // gambar_puisi berisi nama file di S3, contoh: "puisi_12_1727340000.jpg"
    return puisi.gambar_puisi
      ? `${S3_BASE_URL}/${puisi.gambar_puisi}`
      : `${S3_BASE_URL}/latar1.jpeg`;
  }

  function renderPuisi(daftar) {
    puisiGrid.innerHTML = "";

    if (!daftar || daftar.length === 0) {
      puisiGrid.innerHTML = `<p class="empty-state">Belum ada puisi yang tersimpan.</p>`;
      return;
    }

    daftar.forEach(function (puisi) {
      const card = document.createElement("div");
      card.className = "puisi-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");

      const img = document.createElement("img");
      img.src = urlGambar(puisi);
      img.alt = puisi.judul || "Puisi";
      img.className = "puisi-image";

      const info = document.createElement("div");
      info.className = "puisi-info";

      const tanggal = document.createElement("span");
      tanggal.className = "puisi-tanggal";
      tanggal.textContent = formatTanggal(puisi.tgl_submit);

      const kategori = document.createElement("span");
      kategori.className = "puisi-kategori";
      kategori.textContent = puisi.kategori || "-";

      info.appendChild(tanggal);
      info.appendChild(kategori);

      card.appendChild(img);
      card.appendChild(info);

      card.addEventListener("click", function () {
        bukaModal(puisi);
      });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          bukaModal(puisi);
        }
      });

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
