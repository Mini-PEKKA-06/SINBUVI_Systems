<?php
// Integer centavos throughout; decimal strings at the SQL boundary.
function money_cents(mixed $value): int {
    $text=is_float($value)?number_format($value,2,'.',''):(string)$value;
    if(!preg_match('/^(-?)(\d+)(?:\.(\d{1,2}))?$/D',$text,$m))throw new InvalidArgumentException('Use a monetary amount with at most two decimals.');
    return ($m[1]==='-'?-1:1)*((int)$m[2]*100+(int)str_pad($m[3]??'',2,'0'));
}
function decimal_cents(int $cents): string {return ($cents<0?'-':'').intdiv(abs($cents),100).'.'.str_pad((string)(abs($cents)%100),2,'0',STR_PAD_LEFT);}
function quotation_requested_date(mixed $value,?DateTimeImmutable $now=null): string {
    $date=date_value($value);$today=($now??new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->setTimezone(new DateTimeZone('Asia/Manila'))->format('Y-m-d');
    if($date<$today)throw new InvalidArgumentException('Quotation requested date must be today or later.');return $date;
}
function order_financials(array $order,array $payments,?DateTimeImmutable $asOf=null): array {
    $asOf=($asOf??new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->setTimezone(new DateTimeZone('Asia/Manila'));
    $total=money_cents($order['total_amount']);$original=money_cents($order['original_amount']??$order['total_amount']);$received=0;$recognized=null;$undated=0;
    usort($payments,static fn($a,$b)=>[$a['payment_date']??'',(int)$a['payment_id']]<=>[$b['payment_date']??'',(int)$b['payment_id']]);
    foreach($payments as $p){if($p['status']!=='Paid')continue;if(!$p['payment_date']){$undated++;continue;}if($p['payment_date']>$asOf->format('Y-m-d H:i:s')||money_cents($p['amount'])<=0)continue;
        $received+=money_cents($p['amount']);if($recognized===null&&$total>0&&$received>=$total)$recognized=$p['payment_date'];
    }
    $deposit=intdiv($total*40+50,100);$remaining=max(0,$total-$received);
    return ['originalAmount'=>$original/100,'agreedAmount'=>$total/100,'adjustment'=>($total-$original)/100,'depositRequired'=>$deposit/100,'finalInstallment'=>($total-$deposit)/100,'amountReceived'=>$received/100,'outstanding'=>$order['status']==='Cancelled'?0:$remaining/100,'depositOutstanding'=>max(0,$deposit-$received)/100,'credit'=>max(0,$received-$total)/100,'paymentStatus'=>$received<=0?'Unpaid':($received<$total?'Partially Paid':'Fully Paid'),'recognizedAt'=>$order['status']==='Cancelled'?null:$recognized,'undatedPaidPayments'=>$undated];
}
function order_payments(PDO $pdo,int $id,bool $lock=false): array {$q=$pdo->prepare('SELECT * FROM payments WHERE order_id=? ORDER BY payment_date,payment_id'.($lock?' FOR UPDATE':''));$q->execute([$id]);return $q->fetchAll();}
function order_lock(PDO $pdo,int $id): array {$q=$pdo->prepare('SELECT * FROM orders WHERE order_id=? FOR UPDATE');$q->execute([$id]);$o=$q->fetch();if(!$o)throw new InvalidArgumentException('Linked order was not found.');return $o;}
function recorded_funds(array $payments): int {return array_sum(array_map(static fn($p)=>in_array($p['status'],['Paid','Refunded'],true)?money_cents($p['amount']):0,$payments));}
function record_order_payment(PDO $pdo,array $input): array {
    require_account(true);$q=$pdo->prepare('SELECT order_id FROM orders WHERE order_number=?');$q->execute([text_value($input,'id',30)]);$o=order_lock($pdo,(int)$q->fetchColumn());
    if($o['status']==='Cancelled')throw new InvalidArgumentException('Cancelled orders cannot receive payments.');
    $payments=order_payments($pdo,(int)$o['order_id'],true);$f=order_financials($o,$payments);$amount=number_value($input['amount']??null,'Amount received',0.01,9999999999.99);$cents=money_cents($amount);
    if($cents>money_cents($f['outstanding']))throw new InvalidArgumentException('Payment exceeds the outstanding balance.');
    if($o['status']!=='Completed'&&$cents>money_cents($f['depositOutstanding']))throw new InvalidArgumentException('Record the 40% deposit first. Mark work completed before receiving the remaining balance.');
    $date=date_value($input['date']??null);if($date>date('Y-m-d')||$date<substr($o['created_at'],0,10))throw new InvalidArgumentException('Payment date must be between record creation and today.');
    if($o['status']==='Completed'&&!empty($o['completed_at'])&&$date<substr($o['completed_at'],0,10))throw new InvalidArgumentException('The completion installment cannot predate work completion.');
    $method=enum_value($input['method']??null,['Cash','Bank Transfer','Check','GCash','Maya','Other'],'payment method');
    $at=$date===date('Y-m-d')?date('Y-m-d H:i:s'):$date.' 12:00:00';
    $q=$pdo->prepare("INSERT INTO payments(order_id,payment_reference,amount,payment_method,status,payment_date) VALUES (?,?,?,?,'Paid',?)");$reference=reference('PAY');$q->execute([$o['order_id'],$reference,decimal_cents($cents),$method,$at]);
    $remaining=money_cents($f['outstanding'])-$cents;
    // Close/update unreceived intentions only. Actual Paid/Refunded history is immutable here.
    $q=$pdo->prepare("UPDATE payments SET amount=?,status=CASE WHEN ?=0 THEN 'Cancelled' ELSE status END WHERE order_id=? AND status IN ('Pending','Overdue') AND payment_date IS NULL");$q->execute([decimal_cents($remaining),$remaining,$o['order_id']]);
    $q=$pdo->prepare('INSERT INTO audit_logs(user_id,action,table_name,record_id,description) VALUES (?,?,?,?,?)');$q->execute([require_account(),'recordPayment','orders',$o['order_id'],'Received PHP '.decimal_cents($cents).' · '.$reference]);
    notify_users($pdo,array_merge(role_ids($pdo,['admin']),[(int)$o['customer_id']]),'payment:'.$reference,'Payment recorded',$o['order_number'].' · PHP '.decimal_cents($cents).' received','My Transactions',$o['order_number']);
    return ['id'=>$o['order_number'],'paymentReference'=>$reference];
}
function complete_order(PDO $pdo,array $input): array {
    require_account(true);$q=$pdo->prepare('SELECT order_id FROM orders WHERE order_number=?');$q->execute([text_value($input,'id',30)]);$o=order_lock($pdo,(int)$q->fetchColumn());
    if($o['status']==='Cancelled')throw new InvalidArgumentException('Cancelled orders cannot be completed.');if($o['status']==='Completed')return ['id'=>$o['order_number'],'unchanged'=>true];
    $f=order_financials($o,order_payments($pdo,(int)$o['order_id'],true));if($f['depositOutstanding']>0)throw new InvalidArgumentException('Receive the required deposit before completion.');
    $q=$pdo->prepare("SELECT COUNT(*) FROM schedules WHERE order_id=? AND status NOT IN ('Completed','Cancelled')");$q->execute([$o['order_id']]);if($q->fetchColumn())throw new InvalidArgumentException('Complete linked appointments before completing this order.');
    $q=$pdo->prepare("UPDATE orders SET status='Completed',completed_at=NOW() WHERE order_id=?");$q->execute([$o['order_id']]);
    $q=$pdo->prepare('INSERT INTO audit_logs(user_id,action,table_name,record_id,description) VALUES (?,?,?,?,?)');$q->execute([require_account(),'completeOrder','orders',$o['order_id'],'Owner confirmed work completion; no payment was invented.']);
    notify_users($pdo,[(int)$o['customer_id']],'complete:'.$o['order_id'],'Order completed','The remaining 60% is due.','My Transactions',$o['order_number']);return ['id'=>$o['order_number']];
}
