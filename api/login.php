<?php
require_once __DIR__.'/common.php';
$input=input_json();$identity=strtolower(text_value($input,isset($input['username'])?'username':'email',150));$password=$input['password'] ?? '';
if(!is_string($password)||$password===''||strlen($password)>255)fail_request('Enter your username and password.');
$q=$pdo->prepare("SELECT user_id,password_hash,status FROM users WHERE (username=? OR email=?) ORDER BY username=? DESC LIMIT 1");$q->execute([$identity,$identity,$identity]);$a=$q->fetch();
if(!$a||!password_verify($password,$a['password_hash']))fail_request('Username or password is incorrect.',401);
if($a['status']!=='active')fail_request('This account is inactive. Contact the Owner to reactivate access.',403);
client_json_response(200,['success'=>true]+establish_login($pdo,(int)$a['user_id']));
