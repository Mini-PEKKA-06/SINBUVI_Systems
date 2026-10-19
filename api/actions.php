<?php
require_once __DIR__.'/common.php';

function create_order(PDO $pdo,array $input): array {
    $client=customer_id($pdo,$input['clientId'] ?? require_account());
    $items=$input['items'] ?? null;
    if (!is_array($items) || !array_is_list($items) || count($items)<1 || count($items)>100) throw new InvalidArgumentException('Choose between 1 and 100 materials.');
    $date=date_value($input['date'] ?? date('Y-m-d'));
    if(!is_admin())$date=quotation_requested_date($date);
    if(is_admin()&&$date>date('Y-m-d'))throw new InvalidArgumentException('Transaction date cannot be in the future.');
    $method=enum_value($input['paymentMethod'] ?? 'Cash',['Cash','Bank Transfer','Check','GCash','Maya','Other'],'payment method');
    $notes=optional_text($input,'notes',5000);
    $movements=stock_change($pdo,$items,-1);
    $checked=[];$totalCents=0;
    foreach($items as $i){$q=$pdo->prepare('SELECT price,unit FROM products WHERE product_id=? FOR UPDATE');$q->execute([$i['productId']]);$product=$q->fetch();$price=$product['price'];$qty=(float)$i['quantity'];if($product['unit']!=='sq.m'&&floor($qty)!==$qty)throw new InvalidArgumentException('Countable materials require whole quantities.');$totalCents+=intdiv(money_cents($price)*money_cents($qty)+50,100);$checked[]=[$i['productId'],$qty,$price];}
    $total=decimal_cents($totalCents);
    if ($totalCents<=0 || $totalCents>999999999999) throw new InvalidArgumentException('Order total is outside the supported range.');
    $id=allocate_order_number($pdo,(int)date('Y'));$status='Pending';
    $q=$pdo->prepare("INSERT INTO orders(order_number,customer_id,order_date,status,subtotal,total_amount,notes,stock_reserved,original_amount,requested_date,order_kind) VALUES (?,?,?,'Pending',?,?,?,1,?,?,?)");$q->execute([$id,$client,(is_admin()?$date:date('Y-m-d')).' '.date('H:i:s'),$total,$total,$notes,$total,is_admin()?null:$date,is_admin()?'Order':'Quotation']);$orderId=$pdo->lastInsertId();
    $q=$pdo->prepare('UPDATE inventory_movements SET order_id=? WHERE movement_id=?');foreach($movements as $movement)$q->execute([$orderId,$movement]);
    $q=$pdo->prepare('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES (?,?,?,?)');foreach($checked as $line)$q->execute(array_merge([$orderId],$line));
    $q=$pdo->prepare('INSERT INTO payments(order_id,payment_reference,amount,payment_method,status,payment_date) VALUES (?,?,?,?,?,?)');$q->execute([$orderId,reference('PAY'),$total,$method,$status,$status==='Paid'?date('Y-m-d H:i:s'):null]);
    return ['id'=>$id,'orderNumber'=>$id,'total'=>$total];
}

function perform_action(PDO $pdo,string $action,array $input): array {
    require_account();
    if($action==='completeOrder')return complete_order($pdo,$input);
    if($action==='recordPayment')return record_order_payment($pdo,$input);
    if($action==='undoChange')return undo_workflow($pdo,$input);
    if($action==='saveInventoryPolicy')return inventory_policy_action($pdo,$input);
    if(is_staff() && !in_array($action,['recommendNegotiation','saveProfile','readNotification','readAllNotifications','saveWeeklyHours','saveAvailability','deleteAvailability'],true))fail_request('This action is not available to staff.',403);
    if(in_array($action,['saveInventory','deleteInventory','addClient','transactionStatus','saveStaff','deleteStaff','assignStaff','assignTeam','updateSchedule','decideNegotiation','acceptNegotiation'],true))require_account(true);
    if(in_array($action,['createNegotiation','respondNegotiation'],true)){$qty=number_value($input['quantity'] ?? null,'Quantity',1);if(floor($qty)!==$qty)throw new InvalidArgumentException('Negotiation quantity must be a whole number.');}
    $public=public_owner_action($pdo,$action,$input);if($public!==null)return $public;
    $v2=v2_action($pdo,$action,$input);if($v2!==null)return $v2;
    $review=review_action($pdo,$action,$input);if($review!==null)return $review;
    if($action==='acceptNegotiation')require_account(true);
    if($action==='createTransaction')return create_order($pdo,$input);
    if($action==='transactionStatus'){
        require_account(true);$next=enum_value($input['status'] ?? null,['Pending','Paid','Overdue','Cancelled'],'payment status');
        $q=$pdo->prepare('SELECT * FROM orders WHERE order_number=? FOR UPDATE');$q->execute([text_value($input,'id',30)]);$o=$q->fetch();if(!$o)throw new InvalidArgumentException('Transaction not found.');
        if($next==='Paid')throw new InvalidArgumentException('Record an actual payment amount using Record Payment.');
        if(recorded_funds(order_payments($pdo,(int)$o['order_id'],true))>0)throw new InvalidArgumentException('Recorded payment history cannot be cancelled or downgraded through status changes.');
        $q=$pdo->prepare('SELECT product_id AS productId,quantity FROM order_items WHERE order_id=?');$q->execute([$o['order_id']]);$items=$q->fetchAll();$reserve=$next!=='Cancelled';
        if((bool)$o['stock_reserved']!==$reserve){if(!$items)throw new InvalidArgumentException('This legacy transaction has no material lines; reconcile it before changing its reservation.');stock_change($pdo,$items,$reserve?-1:1,(int)$o['order_id']);}
        $orderStatus=$next==='Cancelled'?'Cancelled':($o['status']==='Cancelled'?'Pending':$o['status']);
        $q=$pdo->prepare('UPDATE orders SET status=?,stock_reserved=? WHERE order_id=?');$q->execute([$orderStatus,(int)$reserve,$o['order_id']]);
        $q=$pdo->prepare("UPDATE payments SET status=? WHERE order_id=? AND status IN ('Pending','Overdue','Cancelled') AND payment_date IS NULL");$q->execute([$next,$o['order_id']]);
        return [];
    }
    if($action==='saveInventory'){
        if(($input['unit'] ?? '')!=='sq.m')foreach(['quantity','minStock'] as $field){$value=number_value($input[$field] ?? null,$field);if(floor($value)!==$value)throw new InvalidArgumentException('Countable stock and minimum stock require whole numbers.');}
        require_account(true);$id=filter_var($input['id'] ?? 0,FILTER_VALIDATE_INT);if($id===false||$id<0)throw new InvalidArgumentException('Invalid inventory ID.');
        $values=[text_value($input,'sku',30),text_value($input,'name',150),enum_value($input['category'] ?? null,['Glass','Aluminum','Hardware','Accessories'],'category'),text_value($input,'unit',30),number_value($input['quantity'] ?? null,'Stock'),number_value($input['price'] ?? null,'Price',0.01,10000000),number_value($input['minStock'] ?? null,'Minimum stock')];
        if($id){$q=$pdo->prepare("SELECT product_id,stock_quantity FROM products WHERE product_id=? AND status='active' FOR UPDATE");$q->execute([$id]);$priorProduct=$q->fetch();if(!$priorProduct)throw new InvalidArgumentException('Inventory item not found.');$q=$pdo->prepare('UPDATE products SET sku=?,product_name=?,category=?,unit=?,stock_quantity=?,price=?,minimum_stock=? WHERE product_id=?');$q->execute([...$values,$id]);}
        else{$q=$pdo->prepare('INSERT INTO products(sku,product_name,category,unit,stock_quantity,price,minimum_stock) VALUES (?,?,?,?,?,?,?)');$q->execute($values);$id=(int)$pdo->lastInsertId();}
        $delta=round((float)$values[4]-(float)($priorProduct['stock_quantity']??0),2);
        if(abs($delta)>0.001&&reviews_available($pdo)){
            $q=$pdo->prepare('INSERT INTO inventory_movements(product_id,event_key,movement_type,quantity,occurred_at,reason,created_by) VALUES (?,?,?,?,NOW(),?,?)');
            $q->execute([$id,($GLOBALS['event_request']??reference('ADJ')).':inventory-adjustment:'.$id,$delta>0?'Adjustment In':'Adjustment Out',abs($delta),optional_text($input,'_undoReason',255)??'Owner inventory quantity adjustment',require_account()]);
        }
        return ['id'=>$id];
    }
    if($action==='deleteInventory'){
        require_account(true);$id=$input['id'] ?? 0;$q=$pdo->prepare('SELECT product_id FROM products WHERE product_id=? FOR UPDATE');$q->execute([$id]);if(!$q->fetch())throw new InvalidArgumentException('Inventory item not found.');
        $q=$pdo->prepare('SELECT order_item_id FROM order_items WHERE product_id=? LIMIT 1');$q->execute([$id]);if($q->fetch())throw new InvalidArgumentException('This material has transaction history. Keep it available for receipts and stock restoration.');
        $q=$pdo->prepare("UPDATE products SET status='inactive' WHERE product_id=?");$q->execute([$id]);return [];
    }
    if($action==='addClient'){
        require_account(true);$email=strtolower(text_value($input,'email',150));if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Enter a valid client email.');$name=text_value($input,'name',150);$type=enum_value($input['type'] ?? null,['Business','Individual'],'client type');
        $q=$pdo->prepare("INSERT INTO users(full_name,email,password_hash,role,phone,address,client_type,company_name,contact_person) VALUES (?,?,?,'customer',?,?,?,?,?)");$q->execute([$name,$email,password_hash('clientdemo',PASSWORD_DEFAULT),text_value($input,'phone',30,false),text_value($input,'address',255,false),$type,$type==='Business'?$name:'',text_value($input,'contact',150)]);return ['id'=>(int)$pdo->lastInsertId()];
    }
    if($action==='addSchedule' || $action==='updateSchedule'){
        $existing=null;
        if($action==='updateSchedule'){require_account(true);$q=$pdo->prepare('SELECT * FROM schedules WHERE schedule_id=? FOR UPDATE');$q->execute([$input['id'] ?? 0]);$existing=$q->fetch();if(!$existing)throw new InvalidArgumentException('Schedule not found.');}
        $client=customer_id($pdo,$existing['customer_id'] ?? ($input['clientId'] ?? require_account()));$q=$pdo->prepare('SELECT user_id FROM users WHERE user_id=? FOR UPDATE');$q->execute([$client]);
        $date=date_value($input['date'] ?? null);$time=text_value($input,'time',5);if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/',$time))throw new InvalidArgumentException('Enter a valid appointment time.');$status=$existing?enum_value($input['status'] ?? null,['Pending','Confirmed','Completed','Cancelled'],'schedule status'):'Pending';
        if(!$existing || $date!==$existing['schedule_date'] || $time!==substr($existing['schedule_time'],0,5))if($date.' '.$time<date('Y-m-d H:i'))throw new InvalidArgumentException('Choose a future appointment date and time.');
        $service=$existing['service_type'] ?? enum_value($input['service'] ?? null,['Glass Installation','Aluminum Fabrication','Delivery','Site Measurement','Repair','Other'],'service');$address=text_value($input,'address',255);$notes=optional_text($input,'notes',5000);
        if($status!=='Cancelled'){$q=$pdo->prepare("SELECT schedule_id FROM schedules WHERE customer_id=? AND schedule_date=? AND schedule_time=? AND status<>'Cancelled' AND schedule_id<>? LIMIT 1");$q->execute([$client,$date,$time,$existing['schedule_id'] ?? 0]);if($q->fetch())throw new InvalidArgumentException('This client already has an appointment at that time.');}
        if($existing){$q=$pdo->prepare('UPDATE schedules SET schedule_date=?,schedule_time=?,status=?,address=?,notes=? WHERE schedule_id=?');$q->execute([$date,$time,$status,$address,$notes,$existing['schedule_id']]);$id=$existing['schedule_id'];}else{$q=$pdo->prepare('INSERT INTO schedules(customer_id,service_type,schedule_date,schedule_time,address,notes) VALUES (?,?,?,?,?,?)');$q->execute([$client,$service,$date,$time,$address,$notes]);$id=(int)$pdo->lastInsertId();}return ['id'=>$id];
    }
    if($action==='createNegotiation'){
        if(is_admin())throw new InvalidArgumentException('Clients start negotiations from an order.');$client=customer_id($pdo,require_account());$order=text_value($input,'relatedOrder',30);$q=$pdo->prepare("SELECT order_id FROM orders WHERE order_number=? AND customer_id=? AND status<>'Cancelled' FOR UPDATE");$q->execute([$order,$client]);$id=$q->fetchColumn();if(!$id)throw new InvalidArgumentException('Choose one of your active orders.');
        $ref=reference('NEG');$q=$pdo->prepare('INSERT INTO negotiations(negotiation_id,customer_id,order_id,subject,client_offer,quantity,message,expires_at) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$ref,$client,$id,text_value($input,'subject',200),number_value($input['clientOffer'] ?? null,'Offer',0.01,10000000),number_value($input['quantity'] ?? null,'Quantity',1),text_value($input,'message',5000),offer_expiry()]);return ['id'=>$ref];
    }
    if($action==='respondNegotiation' || $action==='acceptNegotiation'){
        $n=negotiation_lock($pdo,text_value($input,'id',40));if(!$n || (!is_admin() && (int)$n['customer_id']!==require_account()))throw new InvalidArgumentException('Negotiation not found.');if(in_array($n['status'],['Accepted','Rejected'],true))throw new InvalidArgumentException('This negotiation is already closed.');$by=is_admin()?'Admin':'Client';
        if($action==='acceptNegotiation'){if($n['last_by']===$by)throw new InvalidArgumentException('Wait for the other party to respond before accepting.');$q=$pdo->prepare("UPDATE negotiations SET status='Accepted',updated_at=NOW() WHERE negotiation_id=?");$q->execute([$n['negotiation_id']]);}
        else{$field=is_admin()?'admin_offer':'client_offer';$q=$pdo->prepare("UPDATE negotiations SET $field=?,quantity=?,message=?,status=?,last_by=?,updated_at=NOW(),expires_at=? WHERE negotiation_id=?");$q->execute([number_value($input['offer'] ?? null,'Offer',0.01,10000000),number_value($input['quantity'] ?? null,'Quantity',1),text_value($input,'message',5000),is_admin()?'Counter Offer':'Client Offer',$by,offer_expiry(),$n['negotiation_id']]);}return [];
    }
    throw new InvalidArgumentException('Unknown action.');
}

function dispatch_action(string $action,array $input): never {
    global $pdo;$uid=require_account();$key=$input['requestId'] ?? '';
    if(!is_string($key)||!preg_match('/^[a-zA-Z0-9-]{16,64}$/',$key))fail_request('A valid request ID is required.');
    try{
        $response=atomic_change($pdo,function()use($pdo,$key,$uid,$action,$input){
            $GLOBALS['portfolio_remove']=[];
            try{$q=$pdo->prepare("INSERT INTO prototype_requests(request_id,user_id,action,response_json) VALUES (?,?,?,'{}')");$q->execute([$key,$uid,$action]);}
            catch(PDOException $e){if($e->getCode()!=='23000')throw $e;$q=$pdo->prepare('SELECT * FROM prototype_requests WHERE request_id=? FOR UPDATE');$q->execute([$key]);$prior=$q->fetch();if(!$prior || (int)$prior['user_id']!==$uid || $prior['action']!==$action)throw new InvalidArgumentException('Request ID is already in use.');return json_decode($prior['response_json'],true);}
            $GLOBALS['event_request']=$key;
            $before=v2_before($pdo,$action,$input);$undoBefore=workflow_state($pdo,$action,$input);$result=perform_action($pdo,$action,$input);$change=save_workflow_change($pdo,$action,$input,$undoBefore);if($change)$result['undoId']=$change;v2_after($pdo,$action,$input,$result,$before);
            $response=['success'=>true]+$result;$q=$pdo->prepare('UPDATE prototype_requests SET response_json=? WHERE request_id=?');$q->execute([json_encode($response),$key]);return $response;
        });
        portfolio_cleanup_files();client_json_response(200,$response);
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($e instanceof InvalidArgumentException)fail_request($e->getMessage());error_log('Prototype action: '.$e->getMessage());fail_request($e instanceof PDOException && $e->getCode()==='23000'?'That username, email, SKU or availability period is already in use.':'Unable to save. Reload current data and try again.',409);}
}
