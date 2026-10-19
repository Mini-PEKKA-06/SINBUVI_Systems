<?php
function optional_text(array $input,string $key,int $max=255): ?string { $value=text_value($input,$key,$max,false);return $value===''?null:$value; }
function username_value(mixed $value,?string $existing=null): string {
    if(!is_string($value))throw new InvalidArgumentException('Enter a username.');$value=strtolower(trim($value));
    if($value==='staff3')throw new InvalidArgumentException('This retired demonstration username cannot be reused.');
    if($value!==$existing && !preg_match('/^[a-z0-9][a-z0-9._-]{2,49}$/',$value))throw new InvalidArgumentException('Username must be 3–50 letters, numbers, dots, underscores or hyphens.');
    return $value;
}
function password_value(mixed $value): string {
    if(!is_string($value)||strlen($value)<8||strlen($value)>255)throw new InvalidArgumentException('Use a password of 8–255 characters.');return $value;
}
function account_profile(PDO $pdo,int $id): array {
    $q=$pdo->prepare('SELECT user_id AS id,username,full_name AS name,personal_name AS fullName,email,phone,address,role,status,client_type AS type,company_name AS companyName,contact_person AS contact,last_login_at AS lastLogin FROM users WHERE user_id=?');$q->execute([$id]);$a=$q->fetch();if(!$a)throw new InvalidArgumentException('Account not found.');$a['id']=(int)$a['id'];return $a;
}
function profile_values(array $input,string $role,array $existing=[]): array {
    $type=$role==='customer'?enum_value($input['type'] ?? $existing['type'] ?? null,['Individual','Business'],'account type'):null;
    $personal=optional_text($input,'fullName',150);
    $company=$role==='customer'&&$type==='Business'?text_value($input,'companyName',150):null;
    if(!$company && !$personal)throw new InvalidArgumentException('Enter your full name.');
    $email=text_value($input,'email',150);if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Enter a valid email address.');
    $phone=optional_text($input,'phone',30);if($phone&&!preg_match('/^[+0-9() .-]{5,30}$/',$phone))throw new InvalidArgumentException('Enter a valid contact number.');
    $address=optional_text($input,'address',255);
    return ['name'=>$company ?: $personal,'fullName'=>$personal,'email'=>$email?strtolower($email):null,'phone'=>$phone,'address'=>$address,'type'=>$type,'companyName'=>$company,'contact'=>$company?$personal:null];
}
function establish_login(PDO $pdo,int $id): array {
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT last_login_at FROM users WHERE user_id=? AND status='active' FOR UPDATE");$q->execute([$id]);$row=$q->fetch();if(!$row)throw new InvalidArgumentException('Account is inactive.');
        $previous=$row['last_login_at'];$q=$pdo->prepare('UPDATE users SET previous_login_at=last_login_at,last_login_at=NOW(6) WHERE user_id=?');$q->execute([$id]);
        $q=$pdo->prepare('SELECT last_login_at FROM users WHERE user_id=?');$q->execute([$id]);$now=$q->fetchColumn();$new=0;
        if($previous){$q=$pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND created_at>? AND created_at<=?');$q->execute([$id,$previous,$now]);$new=(int)$q->fetchColumn();}
        $q=$pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL');$q->execute([$id]);$unread=(int)$q->fetchColumn();
        $account=account_profile($pdo,$id);$pdo->commit();
        session_regenerate_id(true);$_SESSION['user_id']=$id;$_SESSION['role']=$account['role'];
        return ['account'=>$account,'loginSummary'=>['firstLogin'=>$previous===null,'newSinceLastLogin'=>$new,'totalUnread'=>$unread,'previousLogin'=>$previous,'currentLogin'=>$now]];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function account_action(PDO $pdo,string $action,array $input): ?array {
    if($action==='saveProfile'){
        $id=require_account();if(isset($input['id'])&&(int)$input['id']!==$id)fail_request('You may only update your own profile.',403);
        if(isset($input['role'])||isset($input['status']))fail_request('Role and access status cannot be edited in a profile.',403);
        $old=account_profile($pdo,$id);$username=username_value($input['username'] ?? $old['username'],$old['username']);$v=profile_values($input,$old['role'],$old);
        $newPassword=$input['newPassword'] ?? '';
        if($newPassword!==''){
            $password=password_value($newPassword);if(($input['confirmPassword'] ?? '')!==$password)throw new InvalidArgumentException('Password confirmation does not match.');
            $q=$pdo->prepare('SELECT password_hash FROM users WHERE user_id=? FOR UPDATE');$q->execute([$id]);if(!is_string($input['currentPassword'] ?? null)||!password_verify($input['currentPassword'],$q->fetchColumn()))throw new InvalidArgumentException('Current password is incorrect.');
            $q=$pdo->prepare('UPDATE users SET password_hash=? WHERE user_id=?');$q->execute([password_hash($password,PASSWORD_DEFAULT),$id]);
        }
        $q=$pdo->prepare('UPDATE users SET username=?,full_name=?,personal_name=?,email=?,phone=?,address=?,client_type=?,company_name=?,contact_person=? WHERE user_id=?');$q->execute([$username,$v['name'],$v['fullName'],$v['email'],$v['phone'],$v['address'],$v['type'],$v['companyName'],$v['contact'],$id]);return ['id'=>$id];
    }
    if($action==='saveStaff'){
        require_account(true);if(isset($input['role'])&&$input['role']!=='staff')fail_request('Only staff accounts can be managed here.',403);
        $id=(int)($input['id'] ?? 0);$old=[];if($id){$q=$pdo->prepare('SELECT user_id FROM users WHERE user_id=? FOR UPDATE');$q->execute([$id]);$old=account_profile($pdo,$id);if($old['role']!=='staff')fail_request('Only staff accounts can be managed here.',403);}
        $username=username_value($input['username'] ?? null,$old['username'] ?? null);$v=profile_values($input,'staff');$status=enum_value($input['status'] ?? 'active',['active','inactive'],'access status');
        if($status==='inactive'&&$id){$q=$pdo->prepare("SELECT a.assignment_id FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND a.status='Assigned' AND s.status NOT IN ('Completed','Cancelled') AND s.schedule_date>=CURDATE() LIMIT 1 FOR UPDATE");$q->execute([$id]);if($q->fetch())throw new InvalidArgumentException('Reassign or cancel this staff member’s future jobs before disabling access.');}
        if($id){$q=$pdo->prepare("UPDATE users SET username=?,full_name=?,personal_name=?,email=?,phone=?,address=?,status=? WHERE user_id=? AND role='staff'");$q->execute([$username,$v['name'],$v['fullName'],$v['email'],$v['phone'],$v['address'],$status,$id]);}
        else{$password=password_value($input['password'] ?? null);$q=$pdo->prepare("INSERT INTO users(username,full_name,personal_name,email,phone,address,password_hash,role,status,company_name,contact_person) VALUES (?,?,?,?,?,?,?,'staff',?,NULL,NULL)");$q->execute([$username,$v['name'],$v['fullName'],$v['email'],$v['phone'],$v['address'],password_hash($password,PASSWORD_DEFAULT),$status]);$id=(int)$pdo->lastInsertId();}
        if(!empty($input['resetPassword'])){$password=password_value($input['resetPassword']);$q=$pdo->prepare("UPDATE users SET password_hash=? WHERE user_id=? AND role='staff'");$q->execute([password_hash($password,PASSWORD_DEFAULT),$id]);}
        initialize_weekly_hours($pdo,$id);return ['id'=>$id];
    }
    if($action==='deleteStaff'){
        require_account(true);$id=(int)($input['id'] ?? 0);$q=$pdo->prepare('SELECT role FROM users WHERE user_id=? FOR UPDATE');$q->execute([$id]);if($q->fetchColumn()!=='staff')fail_request('Only staff accounts can be deleted; owner accounts are protected.',403);
        $q=$pdo->prepare("SELECT assignment_id FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND a.status='Assigned' AND s.status NOT IN ('Completed','Cancelled') AND s.schedule_date>=CURDATE() LIMIT 1 FOR UPDATE");$q->execute([$id]);if($q->fetch())throw new InvalidArgumentException('Reassign or cancel future jobs before removing access.');
        $history=0;foreach(['staff_assignments'=>'staff_id','staff_availability'=>'staff_id','staff_recommendations'=>'staff_id','audit_logs'=>'user_id','prototype_requests'=>'user_id','notifications'=>'user_id'] as $table=>$col){$q=$pdo->prepare("SELECT COUNT(*) FROM $table WHERE $col=?");$q->execute([$id]);$history+=(int)$q->fetchColumn();}
        if($history){$q=$pdo->prepare("UPDATE users SET status='inactive' WHERE user_id=?");$q->execute([$id]);return ['id'=>$id,'deactivated'=>true];}
        if(weekly_hours_ready($pdo)){$q=$pdo->prepare('DELETE FROM personnel_weekly_hours WHERE user_id=?');$q->execute([$id]);}
        $q=$pdo->prepare('DELETE FROM users WHERE user_id=?');$q->execute([$id]);return ['id'=>$id,'deleted'=>true];
    }
    if($action==='addClient'){
        require_account(true);$type=enum_value($input['type'] ?? null,['Business','Individual'],'client type');
        $v=profile_values(['type'=>$type,'companyName'=>$type==='Business'?($input['name'] ?? ''):'','fullName'=>$type==='Business'?($input['contact'] ?? ''):($input['name'] ?? ''),'email'=>$input['email'] ?? '','phone'=>$input['phone'] ?? '','address'=>$input['address'] ?? ''],'customer');
        $username=isset($input['username'])?username_value($input['username']):($v['email'] ?? '');if(!$username)throw new InvalidArgumentException('Provide a username or email.');
        $q=$pdo->prepare("INSERT INTO users(username,full_name,personal_name,email,phone,address,password_hash,role,client_type,company_name,contact_person) VALUES (?,?,?,?,?,?,?,'customer',?,?,?)");$q->execute([$username,$v['name'],$v['fullName'],$v['email'],$v['phone'],$v['address'],password_hash('clientdemo',PASSWORD_DEFAULT),$type,$v['companyName'],$v['contact']]);return ['id'=>(int)$pdo->lastInsertId()];
    }
    return null;
}
