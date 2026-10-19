<?php
require_once __DIR__.'/common.php';
require_once __DIR__.'/portfolio-storage.php';
if($_SERVER['REQUEST_METHOD']!=='GET')fail_request('Use GET.',405);
$id=filter_var($_GET['id'] ?? null,FILTER_VALIDATE_INT);if(!$id)fail_request('Image not found.',404);
$q=$pdo->prepare("SELECT i.*,p.publication_status FROM public_portfolio_images i JOIN public_portfolio_projects p ON p.project_id=i.project_id WHERE i.image_id=?");$q->execute([$id]);$image=$q->fetch();if(!$image)fail_request('Image not found.',404);
if($image['publication_status']!=='Published')require_account(true);
if(!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/',$image['storage_name']))fail_request('Image unavailable.',404);
$path=portfolio_directory().'/'.$image['storage_name'];if(!is_file($path))fail_request('Image unavailable.',404);
if(ob_get_level())ob_clean();header('Content-Type: '.$image['mime_type']);header('X-Content-Type-Options: nosniff');header('Cache-Control: no-store');header('Content-Length: '.filesize($path));readfile($path);
