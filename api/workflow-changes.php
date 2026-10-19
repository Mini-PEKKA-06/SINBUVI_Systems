<?php
require_once __DIR__.'/common.php';require_account(true);
$q=$pdo->query('SELECT change_id AS id,action,entity_id AS entityId,created_at AS createdAt,reversed_at AS reversedAt FROM workflow_changes ORDER BY change_id DESC LIMIT 100');
client_json_response(200,['success'=>true,'changes'=>$q->fetchAll()]);
