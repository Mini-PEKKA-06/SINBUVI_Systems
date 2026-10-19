<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__).'/config/app.php';
date_default_timezone_set('Asia/Manila');

try {
    $pdo = sinbuvi_pdo();
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'code' => 'database_unavailable',
        'message' => 'Database connection failed.'
    ]);
    exit;
}
