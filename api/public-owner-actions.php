<?php
require_once __DIR__.'/portfolio-storage.php';
function public_locked_record(PDO $pdo,string $table,string $key,array $input): array {
 $id=filter_var($input['id'] ?? null,FILTER_VALIDATE_INT);if(!$id)throw new InvalidArgumentException('Select a valid record.');
 $q=$pdo->prepare("SELECT * FROM $table WHERE $key=? FOR UPDATE");$q->execute([$id]);$row=$q->fetch();if(!$row)throw new InvalidArgumentException('Record not found.');
 if(!isset($input['version'])||(int)$input['version']!==(int)$row['version'])throw new InvalidArgumentException('This record changed. Close the form, refresh the list and reopen it.');return $row;
}
function public_owner_action(PDO $pdo,string $action,array $input): ?array {
 if(!in_array($action,['savePortfolio','archivePortfolio','deletePortfolio','savePortfolioImage','deletePortfolioImage','updatePublicInquiry'],true))return null;
 require_account(true);
 if($action==='savePortfolio'){
  $id=(int)($input['id'] ?? 0);$old=$id?public_locked_record($pdo,'public_portfolio_projects','project_id',$input):null;
  $title=text_value($input,'title',150);$category=enum_value($input['category'] ?? null,['Glass','Aluminum','Installation','Fabrication','Other'],'project category');$description=text_value($input,'description',3000);$location=optional_text($input,'location',150);$year=($input['year'] ?? '')===''?null:number_value($input['year'],'project year',1900,2100);if($year!==null&&floor($year)!==$year)throw new InvalidArgumentException('Enter a whole project year.');
  $order=number_value($input['featuredOrder'] ?? 0,'featured order',0,9999);if(floor($order)!==$order)throw new InvalidArgumentException('Featured order must be a whole number.');
  $status=enum_value($input['status'] ?? 'Draft',['Draft','Published','Archived'],'publication status');
  if($status==='Published'){$q=$pdo->prepare('SELECT COUNT(*) FROM public_portfolio_images WHERE project_id=?');$q->execute([$id]);if(!$q->fetchColumn())throw new InvalidArgumentException('Upload an approved real project photograph before publishing.');if(($input['publicApproval'] ?? false)!==true)throw new InvalidArgumentException('Confirm the information and photographs are approved for public use.');}
  if($old){$q=$pdo->prepare('UPDATE public_portfolio_projects SET title=?,category=?,description=?,location=?,project_year=?,publication_status=?,featured_order=?,version=version+1 WHERE project_id=?');$q->execute([$title,$category,$description,$location,$year,$status,$order,$id]);}
  else{$slug=trim(strtolower(preg_replace('/[^a-zA-Z0-9]+/','-',$title)),'-') ?: 'project';$slug.='-'.bin2hex(random_bytes(3));$q=$pdo->prepare('INSERT INTO public_portfolio_projects(title,slug,category,description,location,project_year,publication_status,featured_order,created_by) VALUES (?,?,?,?,?,?,?,?,?)');$q->execute([$title,$slug,$category,$description,$location,$year,$status,$order,require_account()]);$id=(int)$pdo->lastInsertId();}
  return ['id'=>$id];
 }
 if($action==='archivePortfolio'||$action==='deletePortfolio'){
  $row=public_locked_record($pdo,'public_portfolio_projects','project_id',$input);$id=(int)$row['project_id'];
  if($action==='archivePortfolio'){$q=$pdo->prepare("UPDATE public_portfolio_projects SET publication_status='Archived',version=version+1 WHERE project_id=?");$q->execute([$id]);}
  else{if($row['publication_status']==='Published')throw new InvalidArgumentException('Unpublish or archive this project before deleting it.');$q=$pdo->prepare('SELECT storage_name FROM public_portfolio_images WHERE project_id=?');$q->execute([$id]);$GLOBALS['portfolio_remove']=$q->fetchAll(PDO::FETCH_COLUMN);$q=$pdo->prepare('DELETE FROM public_portfolio_images WHERE project_id=?');$q->execute([$id]);$q=$pdo->prepare('DELETE FROM public_portfolio_projects WHERE project_id=?');$q->execute([$id]);}
  return ['id'=>$id];
 }
 if($action==='savePortfolioImage'||$action==='deletePortfolioImage'){
  $q=$pdo->prepare('SELECT project_id FROM public_portfolio_images WHERE image_id=?');$q->execute([(int)($input['imageId'] ?? 0)]);$pid=$q->fetchColumn();if(!$pid)throw new InvalidArgumentException('Image not found.');
  if((int)($input['id'] ?? 0)!==(int)$pid)throw new InvalidArgumentException('Image does not belong to this project.');
  $project=public_locked_record($pdo,'public_portfolio_projects','project_id',$input);
  $q=$pdo->prepare('SELECT storage_name FROM public_portfolio_images WHERE image_id=? AND project_id=? FOR UPDATE');$q->execute([(int)$input['imageId'],$pid]);$filename=$q->fetchColumn();if(!$filename)throw new InvalidArgumentException('Image changed; reload the project.');
  if($action==='savePortfolioImage'){$alt=text_value($input,'alt',200);$sort=number_value($input['sortOrder'] ?? 0,'image order',0,9999);if(floor($sort)!==$sort)throw new InvalidArgumentException('Image order must be a whole number.');$q=$pdo->prepare('UPDATE public_portfolio_images SET alt_text=?,sort_order=? WHERE image_id=?');$q->execute([$alt,$sort,$input['imageId']]);}
  else{$q=$pdo->prepare('SELECT COUNT(*) FROM public_portfolio_images WHERE project_id=?');$q->execute([$pid]);if($project['publication_status']==='Published'&&(int)$q->fetchColumn()<=1)throw new InvalidArgumentException('Unpublish before removing the final project image.');$q=$pdo->prepare('DELETE FROM public_portfolio_images WHERE image_id=?');$q->execute([$input['imageId']]);$GLOBALS['portfolio_remove']=[$filename];}
  $q=$pdo->prepare('UPDATE public_portfolio_projects SET version=version+1 WHERE project_id=?');$q->execute([$pid]);return ['id'=>(int)$pid];
 }
 if($action==='updatePublicInquiry'){
  $row=public_locked_record($pdo,'public_inquiries','inquiry_id',$input);$status=enum_value($input['status'] ?? null,['New','Reviewing','Responded','Closed'],'inquiry status');$client=empty($input['clientId'])?null:customer_id($pdo,$input['clientId']);$order=null;$ref=optional_text($input,'orderReference',30);
  if($ref){$q=$pdo->prepare('SELECT order_id,customer_id FROM orders WHERE order_number=?');$q->execute([$ref]);$o=$q->fetch();if(!$o)throw new InvalidArgumentException('Quotation/order reference not found.');if($client&&$client!==(int)$o['customer_id'])throw new InvalidArgumentException('The selected client does not own that quotation/order.');$client=(int)$o['customer_id'];$order=(int)$o['order_id'];}
  $q=$pdo->prepare('UPDATE public_inquiries SET status=?,client_id=?,order_id=?,owner_notes=?,version=version+1 WHERE inquiry_id=?');$q->execute([$status,$client,$order,optional_text($input,'ownerNotes',3000),$row['inquiry_id']]);return ['id'=>(int)$row['inquiry_id']];
 }
 return null;
}
function portfolio_cleanup_files(): void {
 try{foreach($GLOBALS['portfolio_remove'] ?? [] as $name)if(preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/',$name)){$path=portfolio_directory().'/'.$name;if(is_file($path)&&!@unlink($path))error_log('Portfolio: unused image file could not be removed.');}}catch(Throwable $e){error_log('Portfolio: post-commit file cleanup unavailable.');}
}
