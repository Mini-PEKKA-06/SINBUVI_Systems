<?php
require_once __DIR__.'/common.php';require_account(true);
if($_SERVER['REQUEST_METHOD']!=='GET')fail_request('Use GET.',405);
$projectId=filter_var($_GET['projectId'] ?? null,FILTER_VALIDATE_INT);$inquiryId=filter_var($_GET['inquiryId'] ?? null,FILTER_VALIDATE_INT);
$q=$pdo->prepare('SELECT project_id AS id,title,slug,category,description,location,project_year AS year,publication_status AS status,featured_order AS featuredOrder,version,updated_at AS updatedAt FROM public_portfolio_projects'.($projectId?' WHERE project_id=?':'').' ORDER BY featured_order,project_id DESC LIMIT 200');$q->execute($projectId?[$projectId]:[]);$projects=$q->fetchAll();
$ids=array_column($projects,'id');$images=[];if($ids){$marks=implode(',',array_fill(0,count($ids),'?'));$q=$pdo->prepare("SELECT image_id AS id,project_id AS projectId,alt_text AS alt,sort_order AS sortOrder,width,height FROM public_portfolio_images WHERE project_id IN ($marks) ORDER BY sort_order,image_id");$q->execute($ids);$images=$q->fetchAll();}
$byId=[];foreach($projects as $i=>$p){$projects[$i]['images']=[];$byId[$p['id']]=$i;}
foreach($images as $image)if(isset($byId[$image['projectId']])){$image['url']='api/portfolio-image.php?id='.$image['id'];$projects[$byId[$image['projectId']]]['images'][]=$image;}
$q=$pdo->prepare('SELECT i.inquiry_id AS id,i.reference,i.full_name AS name,i.email,i.phone,i.inquiry_type AS type,i.interested_service AS service,i.message,i.requirements,i.status,i.client_id AS clientId,i.order_id AS orderId,o.order_number AS orderReference,i.owner_notes AS ownerNotes,i.version,i.created_at AS createdAt FROM public_inquiries i LEFT JOIN orders o ON o.order_id=i.order_id'.($inquiryId?' WHERE i.inquiry_id=?':'').' ORDER BY i.created_at DESC LIMIT 200');$q->execute($inquiryId?[$inquiryId]:[]);$inquiries=$q->fetchAll();
client_json_response(200,['success'=>true,'projects'=>$projects,'inquiries'=>$inquiries]);
