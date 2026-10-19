<?php
// Compare business values, not automatic timestamps, before sending change notices.
function business_event_signature(PDO $pdo,string $action,array $input):?string{
    if(in_array($action,['saveStaff','saveInventory','saveAvailability','assignStaff'],true)&&empty($input['id']))return null;
    $queries=[
        'transactionStatus'=>["SELECT o.status,o.stock_reserved,p.payment_id,p.status AS payment_status,p.amount FROM orders o LEFT JOIN payments p USING(order_id) WHERE o.order_number=? ORDER BY p.payment_id",$input['id']??''],
        'respondNegotiation'=>['SELECT client_offer,admin_offer,quantity,message,status,last_by,expires_at FROM negotiations WHERE negotiation_id=?',$input['id']??''],
        'recommendNegotiation'=>['SELECT recommendation,reason FROM staff_recommendations WHERE negotiation_id=? AND staff_id='.require_account(),$input['id']??''],
        'updateSchedule'=>['SELECT schedule_date,schedule_time,end_time,status,address,notes FROM schedules WHERE schedule_id=?',$input['id']??0],
        'assignTeam'=>["SELECT staff_id,start_time,end_time,status FROM staff_assignments WHERE schedule_id=? AND staff_id IS NOT NULL ORDER BY staff_id",$input['scheduleId']??0],
        'assignStaff'=>['SELECT staff_id,start_time,end_time,status FROM staff_assignments WHERE assignment_id=?',$input['id']??0],
        'saveProfile'=>['SELECT username,full_name,email,phone,address,password_hash,company_name,client_type FROM users WHERE user_id=?',require_account()],
        'saveStaff'=>['SELECT username,full_name,email,phone,address,status,password_hash FROM users WHERE user_id=?',$input['id']??0],
        'saveInventoryPolicy'=>['SELECT lead_days,safety_percent,review_days,slow_days FROM inventory_policies WHERE product_id=?',$input['id']??0],
        'saveInventory'=>['SELECT sku,product_name,category,unit,stock_quantity,price,minimum_stock FROM products WHERE product_id=?',$input['id']??0],
        'saveAvailability'=>['SELECT staff_id,work_date,start_time,end_time,availability_type,reason FROM staff_availability WHERE availability_id=?',$input['id']??0],
    ];
    if(!isset($queries[$action]))return null;
    [$sql,$id]=$queries[$action];$q=$pdo->prepare($sql);$q->execute([$id]);return hash('sha256',json_encode($q->fetchAll()));
}
function notify_stock_transitions(PDO $pdo,array $before):void{
    if(!$before)return;
    $after=inventory_planning($pdo);
    foreach($after as $id=>$product){
        $old=$before[$id]['status']??null;
        if($old===$product['status']||$product['status']==='In Stock')continue;
        $q=$pdo->prepare('SELECT product_name FROM products WHERE product_id=?');$q->execute([$id]);$name=$q->fetchColumn();
        notify_users($pdo,role_ids($pdo,['admin']),'stock-threshold:'.$id,'Stock alert: '.$product['status'],$name.' · review the demand-based reorder point.','Inventory',(string)$id);
    }
}
