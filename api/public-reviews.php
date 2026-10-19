<?php
require_once __DIR__.'/client-json.php';
require_once __DIR__.'/db.php';
if($_SERVER['REQUEST_METHOD']!=='GET')client_json_response(405,['success'=>false,'message'=>'Use GET.']);
$mode=$_GET['mode']??'authentic';if(!in_array($mode,['authentic','demo'],true))client_json_response(400,['success'=>false,'message'=>'Invalid review selection.']);
$page=filter_var($_GET['page']??1,FILTER_VALIDATE_INT);if(!$page||$page>10000)client_json_response(400,['success'=>false,'message'=>'Invalid page.']);
$demo=$mode==='demo'?1:0;$offset=($page-1)*6;
$q=$pdo->prepare("SELECT COUNT(*) AS total,COALESCE(AVG(rating),0) AS average FROM client_reviews WHERE status='Published' AND demo_seed=?");$q->execute([$demo]);$stats=$q->fetch();
$q=$pdo->prepare("SELECT rating,COUNT(*) AS count FROM client_reviews WHERE status='Published' AND demo_seed=? GROUP BY rating");$q->execute([$demo]);$distribution=array_fill(1,5,0);foreach($q as $row)$distribution[(int)$row['rating']]=(int)$row['count'];
$q=$pdo->prepare("SELECT r.review_id AS id,CASE WHEN r.demo_seed=1 THEN CONCAT('Demo client ',r.review_id) ELSE u.full_name END AS name,r.rating,r.review_text AS text,r.created_at AS createdAt,r.demo_seed AS demoSeed FROM client_reviews r JOIN users u ON u.user_id=r.client_id WHERE r.status='Published' AND r.demo_seed=? ORDER BY r.created_at DESC,r.review_id DESC LIMIT 6 OFFSET $offset");$q->execute([$demo]);
client_json_response(200,['success'=>true,'mode'=>$mode,'page'=>$page,'pageSize'=>6,'total'=>(int)$stats['total'],'average'=>round((float)$stats['average'],2),'distribution'=>$distribution,'reviews'=>$q->fetchAll()]);
