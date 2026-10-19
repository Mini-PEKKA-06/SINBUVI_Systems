<?php
require_once dirname(__DIR__).'/config/app.php';
function portfolio_directory(): string {
    // Bundled storage is denied by Apache; an external private directory is optional.
    $path=sinbuvi_config()['upload_dir'];
    if(!is_dir($path)&&!mkdir($path,0755,true)&&!is_dir($path))throw new RuntimeException('Image storage unavailable.');
    return rtrim($path,'/\\');
}
