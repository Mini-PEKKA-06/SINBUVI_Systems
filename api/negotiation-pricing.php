<?php
function offer_valid_days(): int {$c=sinbuvi_config();$days=(int)($c['offer_valid_days']??7);if($days<1||$days>90)throw new InvalidArgumentException('Offer validity must be 1–90 days.');return $days;}
function offer_expiry(): string {return (new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->modify('+'.offer_valid_days().' days')->format('Y-m-d H:i:s');}
function negotiation_lock(PDO $pdo,string $id): array {
    $q=$pdo->prepare('SELECT order_id FROM negotiations WHERE negotiation_id=?');$q->execute([$id]);$order=(int)$q->fetchColumn();if(!$order)throw new InvalidArgumentException('Negotiation not found.');
    order_lock($pdo,$order);$q=$pdo->prepare('SELECT * FROM negotiations WHERE negotiation_id=? FOR UPDATE');$q->execute([$id]);return $q->fetch();
}
function offer_is_expired(array $n): bool {return !empty($n['expires_at'])&&$n['expires_at']<=date('Y-m-d H:i:s');}
function apply_negotiated_price(PDO $pdo,array $n,int $actor,bool $legacy=false): array {
    $o=order_lock($pdo,(int)$n['order_id']);$payments=order_payments($pdo,(int)$o['order_id'],true);
    if((int)$o['customer_id']!==(int)$n['customer_id'])throw new InvalidArgumentException('Negotiation client does not own the linked order.');
    if(in_array($o['status'],['Processing','Ready','Completed','Cancelled'],true))throw new InvalidArgumentException('Fulfilled, processing or cancelled orders cannot be repriced.');
    $f=order_financials($o,$payments);if($f['paymentStatus']==='Fully Paid'||recorded_funds($payments)>=money_cents($o['total_amount']))throw new InvalidArgumentException('A settled order cannot be repriced.');
    $unit=money_cents($n['last_by']==='Admin'?$n['admin_offer']:$n['client_offer']);$quantity=(float)$n['quantity'];
    if($unit<=0||$quantity<1||floor($quantity)!==$quantity||$quantity>1000000)throw new InvalidArgumentException('Agreed price and whole negotiation quantity must be positive.');
    $agreed=$unit*(int)$quantity;if($agreed<1||$agreed>999999999999)throw new InvalidArgumentException('Agreed total is outside the supported range.');
    if(recorded_funds($payments)>$agreed)throw new InvalidArgumentException('Agreed total is below recorded funds; reconcile the payment history first.');
    $q=$pdo->prepare('SELECT * FROM order_adjustments WHERE negotiation_id=? AND reversed_at IS NULL ORDER BY adjustment_id DESC LIMIT 1 FOR UPDATE');$q->execute([$n['negotiation_id']]);$prior=$q->fetch();
    if($prior){if($prior['reversed_at'])throw new InvalidArgumentException('This decision was reversed. Issue a new negotiation.');return $prior;}
    $q=$pdo->prepare('INSERT INTO order_adjustments(order_id,negotiation_id,previous_amount,agreed_amount,adjustment_amount,agreed_unit_price,agreed_quantity,approved_by) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$o['order_id'],$n['negotiation_id'],$o['total_amount'],decimal_cents($agreed),decimal_cents($agreed-money_cents($o['total_amount'])),decimal_cents($unit),$n['quantity'],$actor]);
    $adjustment=(int)$pdo->lastInsertId();$q=$pdo->prepare('UPDATE orders SET total_amount=?,price_version=price_version+1 WHERE order_id=?');$q->execute([decimal_cents($agreed),$o['order_id']]);
    // Pending entries are payment intentions; never rewrite an actual receipt.
    $q=$pdo->prepare("UPDATE payments SET amount=? WHERE order_id=? AND status IN ('Pending','Overdue') AND payment_date IS NULL");
    $q->execute([decimal_cents(max(0,$agreed-recorded_funds($payments))),$o['order_id']]);
    return ['adjustment_id'=>$adjustment,'agreed_amount'=>decimal_cents($agreed)];
}
function negotiation_decision(PDO $pdo,string $action,array $input): array {
    $actor=require_account(true);$id=text_value($input,'id',40);$n=negotiation_lock($pdo,$id);$choice=$action==='acceptNegotiation'?'Approved':enum_value($input['decision']??null,['Approved','Denied'],'owner decision');
    if($n['owner_decision']!=='Pending'){if($n['owner_decision']===$choice)return ['id'=>$id,'unchanged'=>true];throw new InvalidArgumentException('The owner decision is final.');}
    if($choice==='Approved'){
        if(offer_is_expired($n))throw new InvalidArgumentException('This offer expired. Issue a new counteroffer before approval.');
        apply_negotiated_price($pdo,$n,$actor);
    }
    $q=$pdo->prepare('UPDATE negotiations SET owner_decision=?,status=?,decision_reason=?,decided_by=?,decided_at=NOW(6),updated_at=NOW() WHERE negotiation_id=?');$q->execute([$choice,$choice==='Approved'?'Accepted':'Rejected',optional_text($input,'reason',2000),$actor,$id]);return ['id'=>$id];
}
function offer_deadline_notifications(PDO $pdo): void {
    $q=$pdo->query("SELECT negotiation_id,customer_id,subject,expires_at FROM negotiations WHERE owner_decision='Pending' AND expires_at<=DATE_ADD(NOW(),INTERVAL 48 HOUR)");
    foreach($q as $n){$expired=$n['expires_at']<=date('Y-m-d H:i:s');$event='offer-deadline:'.$n['negotiation_id'].':'.$n['expires_at'].':'.($expired?'expired':'soon');
        $insert=$pdo->prepare("INSERT IGNORE INTO notifications(user_id,event_key,title,message,target_page,target_id) SELECT user_id,?,?,?,'Negotiation',? FROM users WHERE user_id=? AND status='active'");
        foreach(array_unique(array_merge(role_ids($pdo,['admin']),[(int)$n['customer_id']])) as $id)$insert->execute([$event,$expired?'Offer expired':'Offer expiring soon',$n['subject'],$n['negotiation_id'],$id]);
    }
}
