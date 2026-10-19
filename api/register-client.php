<?php
require_once __DIR__.'/common.php';
$input=input_json();
if(isset($input['role'])&&$input['role']!=='customer')fail_request('Public registration creates client accounts only.',403);
$username=username_value($input['username'] ?? null);$password=password_value($input['password'] ?? null);
if(($input['confirmPassword'] ?? null)!==$password)fail_request('Password confirmation does not match.');
$v=profile_values($input,'customer');
try{
 $pdo->beginTransaction();$q=$pdo->prepare("INSERT INTO users(username,full_name,personal_name,email,phone,address,password_hash,role,client_type,company_name,contact_person) VALUES (?,?,?,?,?,?,?,'customer',?,?,?)");$q->execute([$username,$v['name'],$v['fullName'],$v['email'],$v['phone'],$v['address'],password_hash($password,PASSWORD_DEFAULT),$v['type'],$v['companyName'],$v['contact']]);$id=(int)$pdo->lastInsertId();
 $GLOBALS['event_request']='register-'.$id;notify_users($pdo,role_ids($pdo,['admin']),'account','New client registered',$username,'Clients',(string)$id);$pdo->commit();
 client_json_response(201,['success'=>true]+establish_login($pdo,$id));
}catch(PDOException $e){if($pdo->inTransaction())$pdo->rollBack();if($e->getCode()==='23000')fail_request('That username or email is already in use.',409);throw $e;}
