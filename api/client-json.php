<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
ob_start();

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

function client_json_response(int $status, array $payload): never
{
    if (ob_get_level() > 0) {
        ob_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

set_exception_handler(static function (Throwable $error): void {
    error_log('Client API error: ' . $error->getMessage());
    if(PHP_SAPI==='cli')exit(1);
    if ($error instanceof InvalidArgumentException) {
        client_json_response(400, ['success'=>false,'message'=>$error->getMessage()]);
    }
    client_json_response(500, [
        'success' => false,
        'message' => 'The request could not be completed. Please try again.'
    ]);
});
