document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL = "../server.php";

        const tableBody =
            document.getElementById("puisiTableBody");

        const loadingMessage =
            document.getElementById("loadingMessage");

        const puisiMessage =
            document.getElementById("puisiMessage");

        async function loadPuisi() {

            try {


                const response =
                    await fetch(
                        API_URL + "?aksi=daftar_puisi",
                        {

                            method: "GET",

                            credentials: "include"

                        }
                    );

                const data =
                    await response.json();
                if (response.status === 401) {

                    loadingMessage.classList.add(
                        "hidden"
                    );

                    puisiMessage.textContent =
                        data.message ||
                        "Anda harus login terlebih dahulu.";

                    puisiMessage.className =
                        "message error";


                    setTimeout(
                        function () {

                            window.location.href =
                                "../login/login.html";

                        },
                        1200
                    );


                    return;

                }

                if (
                    response.ok &&
                    data.status === "success"
                ) {

                    loadingMessage.classList.add(
                        "hidden"
                    );

                    tableBody.innerHTML = "";

                    if (
                        !data.data ||
                        data.data.length === 0
                    ) {

                        tableBody.innerHTML = `
                            <tr>
                                <td
                                    colspan="3"
                                    class="empty-state">
                                    Belum ada puisi yang tersimpan.
                                </td>
                            </tr>
                        `;

                        return;

                    }

                    data.data.forEach(
                        function (puisi) {


                            const row =
                                document.createElement("tr");


                            const tanggalCell =
                                document.createElement("td");


                            const judulCell =
                                document.createElement("td");


                            const kategoriCell =
                                document.createElement("td");


                            tanggalCell.textContent =
                                formatTanggal(
                                    puisi.tgl_submit
                                );


                            judulCell.textContent =
                                puisi.judul;


                            kategoriCell.textContent =
                                puisi.kategori;


                            row.appendChild(
                                tanggalCell
                            );

                            row.appendChild(
                                judulCell
                            );

                            row.appendChild(
                                kategoriCell
                            );


                            tableBody.appendChild(row);

                        }
                    );


                } else {


                    loadingMessage.classList.add(
                        "hidden"
                    );


                    puisiMessage.textContent =
                        data.message ||
                        "Gagal mengambil daftar puisi.";

                    puisiMessage.className =
                        "message error";

                }


            } catch (error) {


                console.error(
                    "Daftar Puisi Error:",
                    error
                );


                loadingMessage.classList.add(
                    "hidden"
                );


                puisiMessage.textContent =
                    "Tidak dapat terhubung ke server.";

                puisiMessage.className =
                    "message error";

            }

        }


        // =================================================
        // FORMAT TANGGAL
        // =================================================

        function formatTanggal(tanggal) {

            if (!tanggal) {
                return "-";
            }


            const date =
                new Date(tanggal);


            if (isNaN(date.getTime())) {
                return tanggal;
            }


            return date.toLocaleDateString(
                "id-ID",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

        }

        loadPuisi();

    }
);