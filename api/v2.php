<?php
require_once __DIR__.'/accounts-v2.php';
require_once __DIR__.'/scheduling-v2.php';

function notify_users(PDO $pdo,array $ids,string $event,string $title,string $message,string $page,?string $target=null,bool $demoSeed=false): void {
    $key=($GLOBALS['event_request'] ?? reference('EVT')).':'.$event;
    $q=$pdo->prepare("INSERT IGNORE INTO notifications(user_id,event_key,title,message,target_page,target_id,demo_seed) SELECT user_id,?,?,?,?,?,? FROM users WHERE user_id=? AND status='active'");
    foreach(array_unique(array_map('intval',$ids)) as $id)if($id>0)$q->execute([$key,$title,$message,$page,$target,(int)$demoSeed,$id]);
}
function role_ids(PDO $pdo,array $roles): array {
    $marks=implode(',',array_fill(0,count($roles),'?'));$q=$pdo->prepare("SELECT user_id FROM users WHERE status='active' AND role IN ($marks)");$q->execute($roles);return array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));
}
function v2_snapshot(PDO $pdo,array $data): array {
    $id=require_account();$data['account']=account_profile($pdo,$id);
    $q=$pdo->prepare('SELECT notification_id AS id,title,message,target_page AS page,target_id AS targetId,created_at AS createdAt,read_at AS readAt FROM notifications WHERE user_id=? ORDER BY created_at DESC,notification_id DESC LIMIT 200');$q->execute([$id]);$data['notifications']=$q->fetchAll();
    $q=$pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL');$q->execute([$id]);$data['unreadCount']=(int)$q->fetchColumn();
    $data['weeklyHours']=[];
    if((is_admin()||is_staff())&&weekly_hours_ready($pdo)){$q=$pdo->prepare("SELECT user_id AS staffId,weekday,working,TIME_FORMAT(start_time,'%H:%i') AS start,TIME_FORMAT(end_time,'%H:%i') AS end FROM personnel_weekly_hours".(is_staff()?' WHERE user_id=?':'').' ORDER BY user_id,weekday');$q->execute(is_staff()?[$id]:[]);$data['weeklyHours']=$q->fetchAll();}
    $data['staff']=[];$data['availability']=[];$data['assignments']=[];$data['recommendations']=[];$data['personnel']=[];
    if(is_admin())$data['personnel']=$pdo->query("SELECT user_id AS id,full_name AS name,role,status FROM users WHERE role IN ('admin','staff') ORDER BY role,user_id")->fetchAll();
    if(is_admin()||is_staff()){
        $q=$pdo->prepare("SELECT user_id AS id,username,full_name AS name,personal_name AS fullName,email,phone,address,role,status FROM users WHERE role='staff'".(is_staff()?' AND user_id=?':'').' ORDER BY user_id');$q->execute(is_staff()?[$id]:[]);$data['staff']=$q->fetchAll();
        $q=$pdo->prepare("SELECT a.availability_id AS id,a.staff_id AS staffId,u.full_name AS staff,a.work_date AS date,TIME_FORMAT(a.start_time,'%H:%i') AS start,TIME_FORMAT(a.end_time,'%H:%i') AS end,a.availability_type AS type,a.reason FROM staff_availability a JOIN users u ON u.user_id=a.staff_id".(is_staff()?' WHERE a.staff_id=?':'').' ORDER BY a.work_date,a.start_time');$q->execute(is_staff()?[$id]:[]);$data['availability']=$q->fetchAll();
        $q=$pdo->prepare("SELECT r.recommendation_id AS id,r.negotiation_id AS negotiationId,r.staff_id AS staffId,COALESCE(u.full_name,'Former personnel (archived)') AS staff,r.recommendation,r.reason,r.updated_at AS updated,n.owner_decision AS ownerDecision FROM staff_recommendations r LEFT JOIN users u ON u.user_id=r.staff_id JOIN negotiations n ON n.negotiation_id=r.negotiation_id".(is_staff()?' WHERE r.staff_id=?':''));$q->execute(is_staff()?[$id]:[]);$data['recommendations']=$q->fetchAll();
    }
    $q=$pdo->prepare("SELECT a.assignment_id AS id,a.schedule_id AS scheduleId,a.staff_id AS staffId,COALESCE(u.full_name,'Former personnel (archived)') AS staff,s.customer_id AS clientId,c.full_name AS client,s.service_type AS service,s.schedule_date AS date,TIME_FORMAT(a.start_time,'%H:%i') AS start,TIME_FORMAT(a.end_time,'%H:%i') AS end,a.status FROM staff_assignments a LEFT JOIN users u ON u.user_id=a.staff_id JOIN schedules s ON s.schedule_id=a.schedule_id JOIN users c ON c.user_id=s.customer_id".(is_admin()?'':(is_staff()?' WHERE a.schedule_id IN (SELECT schedule_id FROM staff_assignments WHERE staff_id=?)':' WHERE s.customer_id=?')).' ORDER BY s.schedule_date,a.start_time');$q->execute(is_admin()?[]:[$id]);$data['assignments']=$q->fetchAll();
    $q=$pdo->query('SELECT schedule_id,end_time FROM schedules');$ends=[];foreach($q as $row)$ends[$row['schedule_id']]=$row['end_time']?substr($row['end_time'],0,5):null;
    foreach($data['schedules'] as &$s){$s['end']=$ends[$s['id']] ?? null;}unset($s);
    $q=$pdo->query('SELECT negotiation_id,owner_decision,decision_reason,decided_at FROM negotiations');$decisions=[];foreach($q as $row)$decisions[$row['negotiation_id']]=$row;
    foreach($data['negotiations'] as &$n){$d=$decisions[$n['id']];$n['ownerDecision']=$d['owner_decision'];$n['decisionReason']=$d['decision_reason'];$n['decidedAt']=$d['decided_at'];}unset($n);
    $data['inventoryActivity']=is_admin()?$pdo->query("SELECT p.product_id AS id,p.product_name AS name,p.unit,SUM(CASE WHEN m.movement_type='Sale' THEN m.quantity WHEN m.movement_type='Restore' THEN -m.quantity ELSE 0 END) AS sold,SUM(CASE WHEN m.movement_type='Receipt' THEN m.quantity ELSE 0 END) AS received FROM inventory_movements m JOIN products p ON p.product_id=m.product_id GROUP BY p.product_id,p.product_name,p.unit ORDER BY sold DESC LIMIT 6")->fetchAll():[];
    return $data;
}
function v2_action(PDO $pdo,string $action,array $input): ?array {
    $result=account_action($pdo,$action,$input);if($result!==null)return $result;
    $result=scheduling_action($pdo,$action,$input);if($result!==null)return $result;
    if($action==='readNotification'||$action==='readAllNotifications'){
        $q=$pdo->prepare('UPDATE notifications SET read_at=COALESCE(read_at,NOW(6)) WHERE user_id=?'.($action==='readNotification'?' AND notification_id=?':''));$q->execute($action==='readNotification'?[require_account(),(int)($input['id'] ?? 0)]:[require_account()]);return [];
    }
    if($action==='recommendNegotiation'){
        if(!is_staff())fail_request('Staff access required.',403);$id=text_value($input,'id',40);$n=negotiation_lock($pdo,$id);$decision=$n['owner_decision'];if(offer_is_expired($n))throw new InvalidArgumentException('This offer expired. Wait for a renewed offer.');if(!$decision)throw new InvalidArgumentException('Negotiation not found.');if($decision!=='Pending')throw new InvalidArgumentException('The owner has already finalized this negotiation.');
        $choice=enum_value($input['recommendation'] ?? null,['Approve','Deny'],'recommendation');$q=$pdo->prepare('INSERT INTO staff_recommendations(negotiation_id,staff_id,recommendation,reason) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE recommendation=VALUES(recommendation),reason=VALUES(reason),updated_at=NOW(6)');$q->execute([$id,require_account(),$choice,optional_text($input,'reason',2000)]);return ['id'=>$id];
    }
    if($action==='decideNegotiation'||$action==='acceptNegotiation'){
        return negotiation_decision($pdo,$action,$input);
    }
    return null;
}
function v2_before(PDO $pdo,string $action,array $input): array {
    $before=['signature'=>business_event_signature($pdo,$action,$input)];
    if(in_array($action,['createTransaction','transactionStatus','saveInventory','saveInventoryPolicy'],true))$before['stock']=inventory_planning($pdo);
    if($action==='updateSchedule'){$q=$pdo->prepare('SELECT customer_id FROM schedules WHERE schedule_id=?');$q->execute([$input['id'] ?? 0]);$before['clientId']=(int)$q->fetchColumn();}
    return $before;
}
function v2_after(PDO $pdo,string $action,array $input,array $result,array $before): void {
    $actor=require_account();$owners=role_ids($pdo,['admin']);$staff=role_ids($pdo,['staff']);$id=(string)($result['id'] ?? $input['id'] ?? '');
    if(!empty($result['unchanged']))return;
    if(isset($before['stock']))notify_stock_transitions($pdo,$before['stock']);
    if(isset($before['signature'])&&$before['signature']===business_event_signature($pdo,$action,$input))return;
    if(in_array($action,['saveStaff','deleteStaff','assignStaff','assignTeam','saveAvailability','deleteAvailability','updateSchedule','decideNegotiation','acceptNegotiation','recommendNegotiation','saveInventory','saveInventoryPolicy'],true)){
        $q=$pdo->prepare('INSERT INTO audit_logs(user_id,action,table_name,record_id,description) VALUES (?,?,?,NULL,?)');$q->execute([$actor,$action,'prototype_v2',$action.' record '.$id]);
    }
    if(in_array($action,['createNegotiation','respondNegotiation','recommendNegotiation','decideNegotiation','acceptNegotiation'],true)){
        $q=$pdo->prepare('SELECT customer_id,subject,owner_decision FROM negotiations WHERE negotiation_id=?');$q->execute([$id]);$n=$q->fetch();if(!$n)return;
        $recipients=$owners;if($action==='createNegotiation')$recipients=array_merge($owners,$staff);
        elseif(in_array($action,['decideNegotiation','acceptNegotiation'],true))$recipients=array_merge($owners,$staff,[(int)$n['customer_id']]);
        elseif($action==='respondNegotiation')$recipients=array_merge($owners,$staff,[(int)$n['customer_id']]);
        $title=$action==='recommendNegotiation'?'Staff recommendation received':(in_array($action,['decideNegotiation','acceptNegotiation'],true)?'Owner decision: '.$n['owner_decision']:'Negotiation update');
        notify_users($pdo,array_diff($recipients,[$actor]),$action.':'.$id,$title,$n['subject'],'Negotiation',$id);
    }
    if(in_array($action,['addSchedule','updateSchedule','assignStaff','assignTeam'],true)){
        $sid=(int)($result['scheduleId'] ?? $result['id'] ?? $input['id'] ?? 0);$q=$pdo->prepare('SELECT customer_id,service_type FROM schedules WHERE schedule_id=?');$q->execute([$sid]);$s=$q->fetch();
        if($s){$q=$pdo->prepare('SELECT staff_id FROM staff_assignments WHERE schedule_id=?');$q->execute([$sid]);$recipients=array_merge($owners,[(int)$s['customer_id']],array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN)),[(int)($result['oldStaffId'] ?? 0)]);notify_users($pdo,array_diff($recipients,[$actor]),$action.':'.$sid,'Schedule updated',$s['service_type'],'Calendar',(string)$sid);}
    }
    if(in_array($action,['saveAvailability','deleteAvailability'],true))notify_users($pdo,[(int)$result['staffId']],$action.':'.$id,'Availability updated','Your working availability or time off has changed.','Staff Schedule','availability:'.$id);
    if(in_array($action,['saveProfile','saveStaff','addClient'],true))notify_users($pdo,[(int)($result['id'] ?? $actor)],$action.':'.$id,'Account updated','Account details or access status have been updated.','Profile',$id);
    if($action==='createTransaction'||$action==='transactionStatus'){
        $q=$pdo->prepare('SELECT customer_id,order_number FROM orders WHERE order_number=?');$q->execute([$result['id'] ?? $input['id'] ?? '']);$o=$q->fetch();if($o)notify_users($pdo,array_diff(array_merge($owners,[(int)$o['customer_id']]),[$actor]),$action.':'.$o['order_number'],'Transaction updated',$o['order_number'],'My Transactions',$o['order_number']);
    }
}
