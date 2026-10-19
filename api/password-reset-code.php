<?php
require __DIR__ . '/common.php';
$input = input_json();
$email = strtolower(text_value($input,'email',150));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Enter a valid email address.']);
    exit;
}
$stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND role IN ('customer','staff','admin') AND status = 'active' LIMIT 1");
$stmt->execute([$email]);
$account = $stmt->fetch();
unset($_SESSION['client_password_reset']);
unset($_SESSION['client_password_reset']);
if (!$account) {
    echo json_encode(['success' => true, 'message' => 'If an active account exists for this email, a verification code has been sent.']);
    exit;
}
$code = (string)random_int(100000, 999999);
$_SESSION['client_password_reset'] = [
    'user_id' => (int)$account['user_id'],
    'email' => $email,
    'code_hash' => password_hash($code, PASSWORD_DEFAULT),
    'expires_at' => time() + 600,
    'attempts' => 0
];
// Demo only: the UI displays this as a simulated email because SMTP is not configured.
echo json_encode(['success' => true, 'message' => 'Simulated verification email prepared.', 'demoCode' => $code, 'expiresInMinutes' => 10]);
