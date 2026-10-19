<?php
require_once __DIR__.'/common.php';
require_account();$pdo->beginTransaction();$data=snapshot($pdo);$pdo->commit();
client_json_response(200,['success'=>true,'transactions'=>$data['transactions']]);
