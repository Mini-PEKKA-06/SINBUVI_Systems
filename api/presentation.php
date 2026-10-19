<?php
require_once __DIR__.'/common.php';
require_once __DIR__.'/config.php';
$input=input_json();$uid=require_account();
if(presentation_reset_enabled()){
    // Explicit provenance: ordinary business notifications can never be reset here.
    $q=$pdo->prepare('UPDATE notifications SET read_at=NULL WHERE user_id=? AND demo_seed=1');$q->execute([$uid]);
}
client_json_response(200,['success'=>true,'resetEnabled'=>presentation_reset_enabled()]);
