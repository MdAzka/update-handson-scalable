<?php
session_start();
header('Content-Type: application/json');

$host = "localhost";
$db_user = "root";
$db_pass = "";
$db_name = "puisi_stateful";

$conn = new mysqli($host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "message" => "Koneksi database gagal."
    ]);

    exit();
}

$conn->set_charset("utf8mb4");

$aksi = $_GET['aksi'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];


$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}


switch ($aksi) {

    case 'register':

        if ($method !== 'POST') {

            http_response_code(405);

            echo json_encode([
                "status" => "error",
                "message" => "Method harus POST."
            ]);

            exit();
        }

        $username = trim($input['username'] ?? '');
        $nama     = trim($input['nama'] ?? '');
        $password = $input['password'] ?? '';

        if (
            empty($username) ||
            empty($nama) ||
            empty($password)
        ) {

            http_response_code(400);

            echo json_encode([
                "status" => "error",
                "message" => "Username, nama, dan password wajib diisi."
            ]);

            exit();
        }
        $stmt = $conn->prepare(
            "SELECT id FROM users WHERE username = ?"
        );

        $stmt->bind_param("s", $username);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows > 0) {

            http_response_code(409);

            echo json_encode([
                "status" => "error",
                "message" => "Username sudah digunakan."
            ]);

            $stmt->close();
            exit();
        }

        $stmt->close();

        $no_id = 'USR-' . strtoupper(
            bin2hex(random_bytes(4))
        );

        $hashed_password = password_hash(
            $password,
            PASSWORD_DEFAULT
        );

        $stmt = $conn->prepare(
            "INSERT INTO users
            (username, password, nama, no_id)
            VALUES (?, ?, ?, ?)"
        );

        $stmt->bind_param(
            "ssss",
            $username,
            $hashed_password,
            $nama,
            $no_id
        );


        if ($stmt->execute()) {

            echo json_encode([
                "status" => "success",
                "message" => "Registrasi berhasil. Silakan login."
            ]);

        } else {

            http_response_code(500);

            echo json_encode([
                "status" => "error",
                "message" => "Registrasi gagal."
            ]);
        }

        $stmt->close();

        break;

    case 'login':

        if ($method !== 'POST') {

            http_response_code(405);

            echo json_encode([
                "status" => "error",
                "message" => "Method harus POST."
            ]);

            exit();
        }


        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';


        if (
            empty($username) ||
            empty($password)
        ) {

            http_response_code(400);

            echo json_encode([
                "status" => "error",
                "message" => "Username dan password wajib diisi."
            ]);

            exit();
        }

        $stmt = $conn->prepare(
            "SELECT id, username, password, nama
             FROM users
             WHERE username = ?"
        );

        $stmt->bind_param("s", $username);
        $stmt->execute();

        $result = $stmt->get_result();

        $user = $result->fetch_assoc();

        $stmt->close();

        if (!$user) {

            http_response_code(401);

            echo json_encode([
                "status" => "error",
                "message" => "Username atau password salah."
            ]);

            exit();
        }

        if (!password_verify($password, $user['password'])) {

            http_response_code(401);

            echo json_encode([
                "status" => "error",
                "message" => "Username atau password salah."
            ]);

            exit();
        }

        session_regenerate_id(true);


        $_SESSION['user_id']  = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['nama']     = $user['nama'];


        echo json_encode([
            "status" => "success",
            "message" => "Login berhasil.",
            "user" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "nama" => $user['nama']
            ]
        ]);

        break;

    case 'submit_puisi':

        if ($method !== 'POST') {

            http_response_code(405);

            echo json_encode([
                "status" => "error",
                "message" => "Method harus POST."
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


        $user_id  = $_SESSION['user_id'];
        $judul    = trim($input['judul'] ?? '');
        $isi      = trim($input['isi'] ?? '');
        $kategori = trim($input['kategori'] ?? '');
        $keyword  = trim($input['keyword'] ?? '');

        if (
            empty($judul) ||
            empty($isi) ||
            empty($kategori) ||
            empty($keyword)
        ) {

            http_response_code(400);

            echo json_encode([
                "status" => "error",
                "message" => "Semua field puisi wajib diisi."
            ]);

            exit();
        }

        $tgl_submit = date('Y-m-d');

        $stmt = $conn->prepare(
            "INSERT INTO puisi
            (user_id, judul, tgl_submit, isi, kategori, keyword)
            VALUES (?, ?, ?, ?, ?, ?)"
        );

        $stmt->bind_param(
            "isssss",
            $user_id,
            $judul,
            $tgl_submit,
            $isi,
            $kategori,
            $keyword
        );


        if ($stmt->execute()) {

            echo json_encode([
                "status" => "success",
                "message" => "Puisi berhasil disimpan."
            ]);

        } else {

            http_response_code(500);

            echo json_encode([
                "status" => "error",
                "message" => "Gagal menyimpan puisi."
            ]);
        }

        $stmt->close();

        break;

    case 'daftar_puisi':

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

        $query = "
            SELECT
                tgl_submit,
                judul,
                kategori
            FROM puisi
            ORDER BY tgl_submit DESC
        ";


        $result = $conn->query($query);

        $daftar_puisi = [];


        while ($row = $result->fetch_assoc()) {

            $daftar_puisi[] = $row;
        }


        echo json_encode([
            "status" => "success",
            "data" => $daftar_puisi
        ]);

        break;

case 'logout':

    if ($method !== 'POST') {

        http_response_code(405);

        echo json_encode([
            "status" => "error",
            "message" => "Method harus POST."
        ]);

        exit();
    }

    $_SESSION = [];

    if (ini_get("session.use_cookies")) {

        $params = session_get_cookie_params();

        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();


    echo json_encode([
        "status" => "success",
        "message" => "Logout berhasil."
    ]);

    break;
    default:

        http_response_code(400);

        echo json_encode([
            "status" => "error",
           "message" =>
    "Aksi tidak valid. Gunakan login, register, submit_puisi, daftar_puisi, atau logout."
        ]);

        break;
}

$conn->close();

?>