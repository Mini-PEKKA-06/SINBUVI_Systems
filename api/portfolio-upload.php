<?php
require_once __DIR__.'/common.php';require_account(true);require_once __DIR__.'/portfolio-storage.php';
if($_SERVER['REQUEST_METHOD']!=='POST')fail_request('Use POST.',405);
$id=filter_var($_POST['projectId'] ?? null,FILTER_VALIDATE_INT);if(!$id)fail_request('Save a project draft before uploading.');
$alt=text_value($_POST,'alt',200);$file=$_FILES['image'] ?? null;if(!$file||!is_array($file)||($file['error'] ?? UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)fail_request('Choose a JPEG, PNG or WebP image no larger than 2 MB.');
if($file['size']>2*1024*1024||$file['size']<1||!is_uploaded_file($file['tmp_name']))fail_request('Upload an image no larger than 2 MB.');
$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$formats=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];$dimensions=@getimagesize($file['tmp_name']);
if(!isset($formats[$mime])||!$dimensions||$dimensions[0]<1||$dimensions[1]<1||$dimensions[0]>6000||$dimensions[1]>6000||$dimensions[0]*$dimensions[1]>24000000)fail_request('Use a valid JPEG, PNG or WebP image up to 6000px and 24 megapixels. SVG and executable files are not accepted.');
$hash=hash_file('sha256',$file['tmp_name']);$newPath=null;
try{
 $pdo->beginTransaction();$q=$pdo->prepare('SELECT project_id FROM public_portfolio_projects WHERE project_id=? FOR UPDATE');$q->execute([$id]);if(!$q->fetch())throw new InvalidArgumentException('Project not found.');
 $q=$pdo->prepare('SELECT image_id FROM public_portfolio_images WHERE project_id=? AND file_hash=?');$q->execute([$id,$hash]);$existing=$q->fetchColumn();if($existing){$pdo->commit();client_json_response(200,['success'=>true,'id'=>(int)$existing,'duplicate'=>true]);}
 $q=$pdo->prepare('SELECT COUNT(*) FROM public_portfolio_images WHERE project_id=?');$q->execute([$id]);if((int)$q->fetchColumn()>=12)throw new InvalidArgumentException('A project supports up to 12 photographs.');
 $name=bin2hex(random_bytes(16)).'.'.$formats[$mime];$newPath=portfolio_directory().'/'.$name;if(!move_uploaded_file($file['tmp_name'],$newPath))throw new RuntimeException('Unable to store the image.');
 $q=$pdo->prepare('INSERT INTO public_portfolio_images(project_id,storage_name,mime_type,width,height,alt_text,file_hash) VALUES (?,?,?,?,?,?,?)');$q->execute([$id,$name,$mime,$dimensions[0],$dimensions[1],$alt,$hash]);$imageId=(int)$pdo->lastInsertId();$q=$pdo->prepare('UPDATE public_portfolio_projects SET version=version+1 WHERE project_id=?');$q->execute([$id]);$pdo->commit();client_json_response(201,['success'=>true,'id'=>$imageId]);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($newPath&&is_file($newPath))@unlink($newPath);throw $e;}
