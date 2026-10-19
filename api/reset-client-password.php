<?php
require __DIR__ . '/common.php';
$input = input_json();
$code = text_value($input,'code',6);
$password = $input['password'] ?? '';
if (!is_string($password) || strlen($password)>255) fail_request('Enter a valid password.');
$challenge = $_SESSION['client_password_reset'] ?? null;
if (!$challenge || time() > (int)$challenge['expires_at']) {
    unset($_SESSION['client_password_reset']);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'That verification code expired. Request a new code and try again.']);
    exit;
}
if ((int)$challenge['attempts'] >= 5) {
    unset($_SESSION['client_password_reset']);
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Too many incorrect code attempts. Request a new code.']);
    exit;
}
if (!preg_match('/^\d{6}$/', $code) || !password_verify($code, $challenge['code_hash'])) {
    $_SESSION['client_password_reset']['attempts'] = (int)$challenge['attempts'] + 1;
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'The verification code is incorrect. Check the code and try again.']);
    exit;
}
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Choose a password with at least 8 characters.']);
    exit;
}
atomic_change($pdo,function()use($pdo,$password,$challenge){
    $stmt=$pdo->prepare("UPDATE users SET password_hash=? WHERE user_id=? AND email=? AND role IN ('customer','staff','admin') AND status='active'");
    $stmt->execute([password_hash($password,PASSWORD_DEFAULT),$challenge['user_id'],$challenge['email']]);
    if($stmt->rowCount()!==1)throw new InvalidArgumentException('The account is inactive or its identity changed. Request a new code.');
    notify_users($pdo,[(int)$challenge['user_id']],'password-reset','Password updated','Your password was updated through simulated email verification.','Profile',(string)$challenge['user_id']);
});
unset($_SESSION['client_password_reset']);
echo json_encode(['success' => true, 'message' => 'Your password was updated. You can now sign in with your new password.']);
