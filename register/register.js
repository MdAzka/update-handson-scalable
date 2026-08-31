document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL = "../server.php";

        const registerForm =
            document.getElementById("registerForm");

        const registerMessage =
            document.getElementById("registerMessage");

        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const username =
                    document
                        .getElementById("username")
                        .value
                        .trim();


                const nama =
                    document
                        .getElementById("nama")
                        .value
                        .trim();


                const password =
                    document
                        .getElementById("password")
                        .value;

                if (
                    username === "" ||
                    nama === "" ||
                    password === ""
                ) {

                    registerMessage.textContent =
                        "Semua field wajib diisi.";

                    registerMessage.className =
                        "message error";

                    return;

                }

                try {

                    const response =
                        await fetch(
                            API_URL + "?aksi=register",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({

                                    username: username,

                                    nama: nama,

                                    password: password

                                })

                            }
                        );

                    const data =
                        await response.json();


                    if (
                        response.ok &&
                        data.status === "success"
                    ) {

                        registerMessage.textContent =
                            data.message;

                        registerMessage.className =
                            "message success";

                        registerForm.reset();

                        setTimeout(
                            function () {

                                window.location.href =
                                    "../login/login.html";

                            },
                            1200
                        );


                    } else {

                        registerMessage.textContent =
                            data.message ||
                            "Registrasi gagal.";

                        registerMessage.className =
                            "message error";

                    }


                } catch (error) {

                    console.error(
                        "Register Error:",
                        error
                    );


                    registerMessage.textContent =
                        "Tidak dapat terhubung ke server.";

                    registerMessage.className =
                        "message error";

                }

            }
        );

    }
);