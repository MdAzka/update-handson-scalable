document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL = "../server.php";

        const loginForm =
            document.getElementById("loginForm");

        const loginMessage =
            document.getElementById("loginMessage");

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const username =
                    document
                        .getElementById("username")
                        .value
                        .trim();


                const password =
                    document
                        .getElementById("password")
                        .value;

                if (
                    username === "" ||
                    password === ""
                ) {

                    loginMessage.textContent =
                        "Username dan password wajib diisi.";

                    loginMessage.className =
                        "message error";

                    return;

                }


                try {

                    const response =
                        await fetch(
                            API_URL + "?aksi=login",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({
                                    username: username,
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


                        loginMessage.textContent =
                            "Login berhasil. Mengarahkan...";

                        loginMessage.className =
                            "message success";

                        sessionStorage.setItem(
                            "user",
                            JSON.stringify(data.user)
                        );

                        setTimeout(
                            function () {

                                window.location.href =
                                    "../index.html";

                            },
                            700
                        );


                    } else {


                        loginMessage.textContent =
                            data.message ||
                            "Login gagal.";

                        loginMessage.className =
                            "message error";

                    }


                } catch (error) {


                    console.error(
                        "Login Error:",
                        error
                    );


                    loginMessage.textContent =
                        "Tidak dapat terhubung ke server.";

                    loginMessage.className =
                        "message error";

                }

            }
        );

    }
);