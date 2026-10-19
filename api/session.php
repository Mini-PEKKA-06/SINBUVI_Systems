<?php
require_once __DIR__.'/common.php';
if(empty($_SESSION['user_id']))client_json_response(200,['success'=>true,'account'=>null]);
require_account();client_json_response(200,['success'=>true,'account'=>account_profile($pdo,require_account())]);
