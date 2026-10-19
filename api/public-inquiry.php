<?php
require_once __DIR__.'/common.php';
$input=input_json();
$key=text_value($input,'submissionKey',36);if(!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i',$key))fail_request('Reload the form and try again.');
$data=[text_value($input,'fullName',150),strtolower(text_value($input,'email',150)),optional_text($input,'phone',30),enum_value($input['type'] ?? null,['General inquiry','Quotation request','Project discussion'],'inquiry type'),optional_text($input,'service',150),text_value($input,'message',5000),optional_text($input,'requirements',2000)];
if(!filter_var($data[1],FILTER_VALIDATE_EMAIL))fail_request('Enter a valid email address.');
if($data[2]){$digits=preg_replace('/\D/','',$data[2]);if(!preg_match('/^[+0-9() .-]{5,30}$/',$data[2])||strlen($digits)<7||strlen($digits)>15)fail_request('Enter a contact number with 7–15 digits, or leave it blank.');}
$hash=hash('sha256',json_encode($data));$dedupe=hash('sha256',$hash.':'.intdiv(time(),900));
try{
 $pdo->beginTransaction();
 $q=$pdo->prepare('SELECT reference,payload_hash FROM public_inquiries WHERE submission_key=? OR dedupe_key=? LIMIT 1 FOR UPDATE');$q->execute([$key,$dedupe]);$prior=$q->fetch();
 if($prior){if($prior['payload_hash']!==$hash)throw new InvalidArgumentException('This submission token has already been used. Reload the form.');$pdo->commit();client_json_response(200,['success'=>true,'reference'=>$prior['reference'],'duplicate'=>true,'message'=>'This inquiry has already been received.']);}
 $ref='INQ-'.date('Y').'-'.bin2hex(random_bytes(6));$q=$pdo->prepare('INSERT INTO public_inquiries(reference,submission_key,payload_hash,dedupe_key,full_name,email,phone,inquiry_type,interested_service,message,requirements) VALUES (?,?,?,?,?,?,?,?,?,?,?)');$q->execute(array_merge([$ref,$key,$hash,$dedupe],$data));$id=(int)$pdo->lastInsertId();
 $GLOBALS['event_request']='public-inquiry-'.$id;notify_users($pdo,role_ids($pdo,['admin']),'received','New website inquiry',$ref.' — '.$data[0],'Website Inquiries',(string)$id);
 $pdo->commit();client_json_response(201,['success'=>true,'reference'=>$ref,'message'=>'Your inquiry has been received. Please use this reference when contacting our team.']);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($e instanceof InvalidArgumentException)fail_request($e->getMessage());if($e instanceof PDOException&&in_array($e->getCode(),['23000','40001'],true))fail_request('This inquiry may already have been received. Retry with the same form to check safely.',409);throw $e;}
