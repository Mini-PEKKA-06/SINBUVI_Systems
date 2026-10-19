<?php
require_once __DIR__.'/common.php';require_account();
if(is_staff())fail_request('Owner or client access required.',403);
$id=filter_var($_GET['id']??null,FILTER_VALIDATE_INT);if(!$id||$id<1)fail_request('Select a review.');
$rows=reviews_snapshot($pdo,$id);if(!$rows)fail_request('Review not found.',404);
client_json_response(200,['success'=>true,'review'=>$rows[0]]);
