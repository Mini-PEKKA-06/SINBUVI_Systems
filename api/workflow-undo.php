<?php
function workflow_state(PDO $pdo,string $action,array $input): ?array {
    $id=$input['id']??0;
    $map=['saveInventory'=>['products','product_id'],'updateSchedule'=>['schedules','schedule_id'],'updatePublicInquiry'=>['public_inquiries','inquiry_id'],'moderateReview'=>['client_reviews','review_id'],'decideNegotiation'=>['negotiations','negotiation_id'],'acceptNegotiation'=>['negotiations','negotiation_id']];
    if(!isset($map[$action])||!$id)return null;[$table,$key]=$map[$action];
    if($table==='negotiations')negotiation_lock($pdo,(string)$id);
    $q=$pdo->prepare("SELECT * FROM $table WHERE $key=? FOR UPDATE");$q->execute([$id]);$row=$q->fetch();if(!$row)return null;
    $state=['row'=>$row];
    if($action==='saveInventory'){$q=$pdo->prepare('SELECT COALESCE(MAX(movement_id),0) FROM inventory_movements WHERE product_id=?');$q->execute([$id]);$state['lastMovement']=(int)$q->fetchColumn();}
    if($action==='updateSchedule'){$q=$pdo->prepare('SELECT * FROM staff_assignments WHERE schedule_id=? ORDER BY assignment_id FOR UPDATE');$q->execute([$id]);$state['assignments']=$q->fetchAll();}
    if($table==='negotiations'){$state['order']=order_lock($pdo,(int)$row['order_id']);}
    return $state;
}
function save_workflow_change(PDO $pdo,string $action,array $input,?array $before): ?int {
    if(!$before)return null;$after=workflow_state($pdo,$action,$input);if(!$after||$before===$after)return null;
    if($action==='saveInventory'&&$before['row']['stock_quantity']===$after['row']['stock_quantity'])return null;
    $q=$pdo->prepare('INSERT INTO workflow_changes(actor_id,action,entity_id,before_json,after_json) VALUES (?,?,?,?,?)');$q->execute([require_account(),$action,(string)$input['id'],json_encode($before),json_encode($after)]);return (int)$pdo->lastInsertId();
}
function undo_workflow(PDO $pdo,array $input): array {
    $actor=require_account(true);$id=filter_var($input['id']??null,FILTER_VALIDATE_INT);if(!$id)throw new InvalidArgumentException('Choose a saved change.');
    // Read identity first; acquire the entity lock in the original action's order.
    $q=$pdo->prepare('SELECT * FROM workflow_changes WHERE change_id=?');$q->execute([$id]);$change=$q->fetch();if(!$change)throw new InvalidArgumentException('Saved change not found.');
    $current=workflow_state($pdo,$change['action'],['id'=>$change['entity_id']]);
    $q=$pdo->prepare('SELECT * FROM workflow_changes WHERE change_id=? FOR UPDATE');$q->execute([$id]);$change=$q->fetch();
    if($change['reversed_at'])throw new InvalidArgumentException('This change has already been reversed.');
    $before=json_decode($change['before_json'],true);$after=json_decode($change['after_json'],true);
    if($current!==$after)throw new InvalidArgumentException('Later changes depend on this record. Undo is no longer safe.');
    $r=$before['row'];$action=$change['action'];
    if($action==='saveInventory'){
        perform_action($pdo,'saveInventory',['id'=>$r['product_id'],'sku'=>$r['sku'],'name'=>$r['product_name'],'category'=>$r['category'],'unit'=>$r['unit'],'quantity'=>$r['stock_quantity'],'price'=>$r['price'],'minStock'=>$r['minimum_stock'],'_undoReason'=>'Compensating reversal of inventory change '.$id]);
    }elseif($action==='updateSchedule'){
        if(in_array($current['row']['status'],['Completed','Cancelled'],true)||in_array($r['status'],['Completed','Cancelled'],true))throw new InvalidArgumentException('Closed schedule events cannot be undone.');
        perform_action($pdo,'updateSchedule',['id'=>$r['schedule_id'],'date'=>$r['schedule_date'],'time'=>substr($r['schedule_time'],0,5),'end'=>$r['end_time']?substr($r['end_time'],0,5):'','status'=>$r['status'],'address'=>$r['address'],'notes'=>$r['notes']??'']);
        $q=$pdo->prepare('UPDATE schedules SET end_time=? WHERE schedule_id=?');$q->execute([$r['end_time'],$r['schedule_id']]);
        notify_users($pdo,array_merge(role_ids($pdo,['admin']),[(int)$r['customer_id']],array_filter(array_column($current['assignments'],'staff_id'))),'undo-schedule:'.$id,'Schedule change reversed',$r['service_type'],'Calendar',(string)$r['schedule_id']);
    }elseif($action==='updatePublicInquiry'){
        $q=$pdo->prepare('UPDATE public_inquiries SET status=?,client_id=?,order_id=?,owner_notes=?,version=version+1 WHERE inquiry_id=?');$q->execute([$r['status'],$r['client_id'],$r['order_id'],$r['owner_notes'],$r['inquiry_id']]);
    }elseif($action==='moderateReview'){
        if($current['row']['status']==='Deleted')throw new InvalidArgumentException('A withdrawn review cannot be restored.');
        $q=$pdo->prepare('UPDATE client_reviews SET status=?,moderation_reason=?,version=version+1 WHERE review_id=?');$q->execute([$r['status'],$r['moderation_reason'],$r['review_id']]);
        $q=$pdo->prepare('INSERT INTO review_history(review_id,actor_id,action,prior_status,new_status,rating,review_text,reason) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$r['review_id'],$actor,'undoModeration',$current['row']['status'],$r['status'],$r['rating'],$r['review_text'],'Compensating reversal of change '.$id]);
        notify_users($pdo,[(int)$r['client_id']],'undo-review:'.$id,'Review moderation reversed','The Owner reversed the latest moderation.','Reviews',(string)$r['review_id']);
    }else{
        $order=$current['order'];$payments=order_payments($pdo,(int)$order['order_id'],true);
        if(recorded_funds($payments)>0||in_array($order['status'],['Processing','Ready','Completed','Cancelled'],true))throw new InvalidArgumentException('Payment or fulfillment events prevent reversing this decision.');
        $q=$pdo->prepare('SELECT COUNT(*) FROM schedules WHERE order_id=?');$q->execute([$order['order_id']]);if($q->fetchColumn())throw new InvalidArgumentException('Linked scheduling prevents reversing this decision.');
        $q=$pdo->prepare('UPDATE order_adjustments SET reversed_at=NOW(6),reversed_by=? WHERE negotiation_id=? AND reversed_at IS NULL');$q->execute([$actor,$r['negotiation_id']]);
        $q=$pdo->prepare('UPDATE orders SET total_amount=?,price_version=price_version+1 WHERE order_id=?');$q->execute([$before['order']['total_amount'],$order['order_id']]);
        $q=$pdo->prepare("UPDATE payments SET amount=? WHERE order_id=? AND status IN ('Pending','Overdue') AND payment_date IS NULL");$q->execute([$before['order']['total_amount'],$order['order_id']]);
        $q=$pdo->prepare('UPDATE negotiations SET status=?,owner_decision=?,decided_by=?,decided_at=?,decision_reason=?,updated_at=NOW() WHERE negotiation_id=?');$q->execute([$r['status'],$r['owner_decision'],$r['decided_by'],$r['decided_at'],$r['decision_reason'],$r['negotiation_id']]);
        notify_users($pdo,array_merge(role_ids($pdo,['admin','staff']),[(int)$r['customer_id']]),'undo-negotiation:'.$id,'Negotiation decision reversed','The previous order amount was restored; payment history was retained.','Negotiation',$r['negotiation_id']);
    }
    $reason=text_value($input,'reason',1000);$q=$pdo->prepare('UPDATE workflow_changes SET reversed_at=NOW(6),reversed_by=?,reason=? WHERE change_id=?');$q->execute([$actor,$reason,$id]);
    $q=$pdo->prepare('INSERT INTO audit_logs(user_id,action,table_name,record_id,description) VALUES (?,?,?,?,?)');$q->execute([$actor,'undoChange','workflow_changes',$id,$reason]);return ['id'=>$id];
}
