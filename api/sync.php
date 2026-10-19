<?php
require_once __DIR__.'/actions.php';
require_account();
if($_SERVER['REQUEST_METHOD']==='GET'){
    atomic_change($pdo,fn()=>offer_deadline_notifications($pdo));
    $pdo->beginTransaction();$data=snapshot($pdo);$pdo->commit();
    client_json_response(200,['success'=>true,'data'=>$data]);
}
$input=input_json();dispatch_action(text_value($input,'action',40),$input);
