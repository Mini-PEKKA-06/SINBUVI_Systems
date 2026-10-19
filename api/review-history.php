<?php
require_once __DIR__.'/common.php';require_account(true);
$id=filter_var($_GET['id']??null,FILTER_VALIDATE_INT);if(!$id)fail_request('Select a review.');
$q=$pdo->prepare('SELECT h.action,h.new_status AS status,h.reason,h.created_at AS createdAt,u.full_name AS actor FROM review_history h JOIN users u ON u.user_id=h.actor_id WHERE h.review_id=? ORDER BY h.history_id');$q->execute([$id]);
client_json_response(200,['success'=>true,'history'=>$q->fetchAll()]);
