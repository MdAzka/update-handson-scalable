document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "server.php";

    const homeSection =
        document.getElementById("homeSection");

    const loginSection =
        document.getElementById("loginSection");

    const registerSection =
        document.getElementById("registerSection");

    const dashboardSection =
        document.getElementById("dashboardSection");

    const accessDeniedSection =
        document.getElementById("accessDeniedSection");

    const userInfo =
        document.getElementById("userInfo");

    const welcomeUser =
        document.getElementById("welcomeUser");

    const dashboardTitle =
        document.getElementById("dashboardTitle");

    const loginButton =
        document.getElementById("loginButton");

    const registerButton =
        document.getElementById("registerButton");

    const backFromLogin =
        document.getElementById("backFromLogin");

    const backFromRegister =
        document.getElementById("backFromRegister");

    const toRegister =
        document.getElementById("toRegister");

    const toLogin =
        document.getElementById("toLogin");

    const logoutButton =
        document.getElementById("logoutButton");

    const submitPuisiButton =
        document.getElementById("submitPuisiButton");

    const daftarPuisiButton =
        document.getElementById("daftarPuisiButton");

    const accessLoginButton =
        document.getElementById("accessLoginButton");

    const accessRegisterButton =
        document.getElementById("accessRegisterButton");

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");

    const loginMessage =
        document.getElementById("loginMessage");

    const registerMessage =
        document.getElementById("registerMessage");

    let isLoggedIn = false;

    function hideAllSections() {

        homeSection.classList.add("hidden");

        loginSection.classList.add("hidden");

        registerSection.classList.add("hidden");

        dashboardSection.classList.add("hidden");

        accessDeniedSection.classList.add("hidden");

    }

    function showHome() {

        hideAllSections();

        homeSection.classList.remove("hidden");

    }


    function showLogin() {

        hideAllSections();

        loginSection.classList.remove("hidden");

        loginMessage.textContent = "";

    }


    function showRegister() {

        hideAllSections();

        registerSection.classList.remove("hidden");

        registerMessage.textContent = "";

    }

    function showDashboard(user) {

        hideAllSections();

        dashboardSection.classList.remove("hidden");

        userInfo.classList.remove("hidden");


        welcomeUser.textContent =
            "Halo, " + user.nama;


        dashboardTitle.textContent =
            "Selamat datang, " + user.nama;


        isLoggedIn = true;

    }

    function showAccessDenied() {

        hideAllSections();

        accessDeniedSection.classList.remove("hidden");

    }

    loginButton.addEventListener(
        "click",
        function () {

            showLogin();

        }
    );

    registerButton.addEventListener(
        "click",
        function () {

            showRegister();

        }
    );

    backFromLogin.addEventListener(
        "click",
        function () {

            showHome();

        }
    );

    backFromRegister.addEventListener(
        "click",
        function () {

            showHome();

        }
    );

    toRegister.addEventListener(
        "click",
        function () {

            showRegister();

        }
    );

    toLogin.addEventListener(
        "click",
        function () {

            showLogin();

        }
    );

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document.getElementById(
                    "registerUsername"
                ).value.trim();


            const nama =
                document.getElementById(
                    "registerNama"
                ).value.trim();


            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


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


                    // Setelah berhasil register,
                    // pindah ke login
                    setTimeout(
                        function () {

                            showLogin();

                        },
                        1000
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

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document.getElementById(
                    "loginUsername"
                ).value.trim();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


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
                        data.message;

                    loginMessage.className =
                        "message success";


                    // Simpan informasi user
                    showDashboard(data.user);


                    loginForm.reset();


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

    submitPuisiButton.addEventListener(
        "click",
        function () {

            if (!isLoggedIn) {

                showAccessDenied();

                return;

            }


            window.location.href =
                "submit_puisi/submit_puisi.html";

        }
    );

    daftarPuisiButton.addEventListener(
        "click",
        function () {

            if (!isLoggedIn) {

                showAccessDenied();

                return;

            }


            window.location.href =
                "daftar_puisi/daftar_puisi.html";

        }
    );

    accessLoginButton.addEventListener(
        "click",
        function () {

            showLogin();

        }
    );

    accessRegisterButton.addEventListener(
        "click",
        function () {

            showRegister();

        }
    );

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                const response =
                    await fetch(
                        API_URL + "?aksi=logout",
                        {

                            method: "POST",

                            credentials: "include"

                        }
                    );


                const data =
                    await response.json();


                if (data.status === "success") {

                    isLoggedIn = false;

                    userInfo.classList.add("hidden");

                    showHome();

                } else {

                    alert(
                        data.message ||
                        "Logout gagal."
                    );

                }


            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

                alert(
                    "Tidak dapat terhubung ke server."
                );

            }

        }
    );

    userInfo.classList.add("hidden");

    showHome();

});