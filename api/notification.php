<?php
require_once __DIR__.'/common.php';
$uid=require_account();$q=$pdo->prepare('SELECT notification_id AS id,title,message,target_page AS page,target_id AS targetId,created_at AS createdAt,read_at AS readAt FROM notifications WHERE user_id=? AND notification_id=?');$q->execute([$uid,(int)($_GET['id'] ?? 0)]);$row=$q->fetch();if(!$row)fail_request('Notification not found.',404);
client_json_response(200,['success'=>true,'notification'=>$row]);
