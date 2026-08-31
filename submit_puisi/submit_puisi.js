document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL = "../server.php";

        const puisiForm =
            document.getElementById("puisiForm");

        const puisiMessage =
            document.getElementById("puisiMessage");

        puisiForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const judul =
                    document
                        .getElementById("judul")
                        .value
                        .trim();


                const kategori =
                    document
                        .getElementById("kategori")
                        .value
                        .trim();


                const keyword =
                    document
                        .getElementById("keyword")
                        .value
                        .trim();


                const isi =
                    document
                        .getElementById("isi")
                        .value
                        .trim();

                if (
                    judul === "" ||
                    kategori === "" ||
                    keyword === "" ||
                    isi === ""
                ) {

                    puisiMessage.textContent =
                        "Semua field puisi wajib diisi.";

                    puisiMessage.className =
                        "message error";

                    return;

                }

                try {

                    const response =
                        await fetch(
                            API_URL + "?aksi=submit_puisi",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({

                                    judul: judul,

                                    isi: isi,

                                    kategori: kategori,

                                    keyword: keyword

                                })

                            }
                        );

                    const data =
                        await response.json();


                    if (
                        response.ok &&
                        data.status === "success"
                    ) {

                        puisiMessage.textContent =
                            data.message;

                        puisiMessage.className =
                            "message success";


                        puisiForm.reset();


                    } else {


                        puisiMessage.textContent =
                            data.message ||
                            "Gagal menyimpan puisi.";

                        puisiMessage.className =
                            "message error";

                        if (response.status === 401) {

                            setTimeout(
                                function () {

                                    window.location.href =
                                        "../login/login.html";

                                },
                                1200
                            );

                        }

                    }


                } catch (error) {

                    console.error(
                        "Submit Puisi Error:",
                        error
                    );


                    puisiMessage.textContent =
                        "Tidak dapat terhubung ke server.";

                    puisiMessage.className =
                        "message error";

                }

            }
        );

    }
);