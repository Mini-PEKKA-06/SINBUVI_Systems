<?php
// Public allowlist: never use the management snapshot here. No session dependency.
require_once __DIR__.'/client-json.php';
require_once __DIR__.'/db.php';
if($_SERVER['REQUEST_METHOD']!=='GET')client_json_response(405,['success'=>false,'message'=>'Use GET.']);
$projects=$pdo->query("SELECT p.project_id AS id,p.title,p.slug,p.category,p.description,p.location,p.project_year AS year,p.featured_order AS featuredOrder FROM public_portfolio_projects p WHERE p.publication_status='Published' AND EXISTS(SELECT 1 FROM public_portfolio_images i WHERE i.project_id=p.project_id) ORDER BY p.featured_order,p.project_id DESC LIMIT 100")->fetchAll();
$byId=[];foreach($projects as $index=>$project){$projects[$index]['images']=[];$byId[$project['id']]=$index;}
if($byId){$marks=implode(',',array_fill(0,count($byId),'?'));$q=$pdo->prepare("SELECT image_id AS id,project_id,width,height,alt_text AS alt FROM public_portfolio_images WHERE project_id IN ($marks) ORDER BY sort_order,image_id");$q->execute(array_keys($byId));foreach($q as $image){$index=$byId[$image['project_id']];unset($image['project_id']);$image['url']='api/portfolio-image.php?id='.$image['id'];$projects[$index]['images'][]=$image;}}
$catalog=$pdo->query("SELECT product_id AS id,product_name AS name,category,unit FROM products WHERE status='active' ORDER BY category,product_name LIMIT 100")->fetchAll();
client_json_response(200,['success'=>true,'projects'=>$projects,'catalog'=>$catalog]);
