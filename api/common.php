<?php
require_once __DIR__.'/client-json.php';
require_once __DIR__.'/db.php';
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function fail_request(string $message, int $status = 400): never {
    client_json_response($status, ['success'=>false,'message'=>$message]);
}
function require_account(bool $admin = false): int {
    global $pdo;
    if (empty($_SESSION['user_id'])) fail_request('Sign in to continue.',401);
    static $verified=null;
    if($verified!==(int)$_SESSION['user_id']){
        $q=$pdo->prepare("SELECT role FROM users WHERE user_id=? AND status='active'");$q->execute([$_SESSION['user_id']]);$role=$q->fetchColumn();
        if(!$role){$_SESSION=[];fail_request('Your account is inactive. Sign in with an active account.',401);}
        $_SESSION['role']=$role;$verified=(int)$_SESSION['user_id'];
    }
    if ($admin && ($_SESSION['role'] ?? '')!=='admin') fail_request('Owner access required.',403);
    return (int)$_SESSION['user_id'];
}
function is_admin(): bool { return ($_SESSION['role'] ?? '')==='admin'; }
function is_staff(): bool { return ($_SESSION['role'] ?? '')==='staff'; }
function input_json(): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_request('Use POST for this action.',405);
    try { $input=json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { fail_request('Send valid JSON.'); }
    if (!is_array($input) || array_is_list($input)) fail_request('Send a JSON object.');
    return $input;
}
function text_value(array $input,string $key,int $max=255,bool $required=true): string {
    $value=$input[$key] ?? '';
    if (!is_string($value) || strlen(trim($value))>$max || ($required && trim($value)==='')) throw new InvalidArgumentException("Invalid $key.");
    return trim($value);
}
function number_value(mixed $value,string $label,float $min=0,float $max=1000000): float {
    if (!is_numeric($value) || !is_finite((float)$value) || $value<$min || $value>$max || abs((float)$value*100-round((float)$value*100))>0.00001) throw new InvalidArgumentException("$label must be between $min and $max with at most two decimals.");
    return (float)$value;
}
function date_value(mixed $value): string {
    if (!is_string($value)) throw new InvalidArgumentException('Enter a valid date.');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
    if (!$date || $date->format('Y-m-d')!==$value || $value<'2000-01-01' || $value>'2100-12-31') throw new InvalidArgumentException('Enter a valid date between 2000 and 2100.');
    return $value;
}
function enum_value(mixed $value,array $allowed,string $label): string {
    if (!is_string($value) || !in_array($value,$allowed,true)) throw new InvalidArgumentException("Invalid $label.");
    return $value;
}
function reference(string $prefix): string { return $prefix.'-'.date('Y').'-'.bin2hex(random_bytes(8)); }
function customer_id(PDO $pdo,mixed $value): int {
    $id=filter_var($value,FILTER_VALIDATE_INT);
    if (!$id || $id<1) throw new InvalidArgumentException('Select a valid client.');
    if (!is_admin() && $id!==require_account()) throw new InvalidArgumentException('This client does not belong to your account.');
    $q=$pdo->prepare("SELECT user_id FROM users WHERE user_id=? AND role='customer' AND status='active'");$q->execute([$id]);
    if (!$q->fetch()) throw new InvalidArgumentException('Client not found.');
    return $id;
}
function atomic_change(PDO $pdo,callable $operation): mixed {
    // InnoDB can choose a safe rollback victim even with consistent application
    // locks. Retry only an explicitly aborted serialization transaction, at most
    // twice; validation failures and unknown commit outcomes are never retried.
    for($attempt=0;$attempt<3;$attempt++){
        try{$pdo->beginTransaction();$result=$operation();$pdo->commit();return $result;}
        catch(Throwable $error){
            if($pdo->inTransaction())$pdo->rollBack();
            if($error instanceof PDOException&&$error->getCode()==='40001'&&$attempt<2){usleep(20000*($attempt+1));continue;}
            throw $error;
        }
    }
    throw new RuntimeException('Transaction could not be completed.');
}
function stock_change(PDO $pdo,array $items,int $direction,?int $orderId=null): array {
    $totals=[];$movements=[];
    foreach ($items as $item) {
        if (!is_array($item)) throw new InvalidArgumentException('Each material must be an object.');
        $id=filter_var($item['productId'] ?? null,FILTER_VALIDATE_INT);
        if (!$id || $id<1) throw new InvalidArgumentException('Select valid materials.');
        $qty=number_value($item['quantity'] ?? null,'Quantity',0.01);
        $totals[$id]=($totals[$id] ?? 0)+$qty;
    }
    ksort($totals,SORT_NUMERIC); // consistent lock order across multi-material orders
    foreach ($totals as $id=>$qty) {
        $q=$pdo->prepare('SELECT product_name,unit,stock_quantity,status FROM products WHERE product_id=? FOR UPDATE');$q->execute([$id]);$p=$q->fetch();
        if (!$p || ($direction===-1 && $p['status']!=='active')) throw new InvalidArgumentException('A selected material is unavailable.');
        if($direction===-1 && $p['unit']!=='sq.m' && abs($qty-round($qty))>0.00001)throw new InvalidArgumentException('Countable materials require whole quantities.');
        if ($direction===-1 && (float)$p['stock_quantity']+0.00001<$qty) throw new InvalidArgumentException('Insufficient stock for '.$p['product_name'].'. Available: '.$p['stock_quantity']);
        $next=(float)$p['stock_quantity']+$direction*$qty;
        if ($next>9999999999.99) throw new InvalidArgumentException('Stock exceeds the database limit.');
        $q=$pdo->prepare('UPDATE products SET stock_quantity=? WHERE product_id=?');$q->execute([$next,$id]);
        $q=$pdo->prepare('INSERT INTO inventory_movements(product_id,order_id,event_key,movement_type,quantity,occurred_at) VALUES (?,?,?,?,?,NOW())');$q->execute([$id,$orderId,($GLOBALS['event_request'] ?? reference('STOCK')).':stock:'.$id.':'.$direction,$direction===-1?'Sale':'Restore',$qty]);$movements[]=(int)$pdo->lastInsertId();
    }
    return $movements;
}
function snapshot(PDO $pdo): array {
    $uid=require_account();$admin=is_admin();
    $clients=$pdo->prepare("SELECT user_id AS id,full_name AS name,client_type AS type,contact_person AS contact,email,phone,address,company_name AS companyName FROM users WHERE role='customer' AND status='active'".($admin?'':(is_staff()?" AND user_id IN (SELECT customer_id FROM negotiations UNION SELECT customer_id FROM schedules WHERE schedule_id IN (SELECT schedule_id FROM staff_assignments WHERE staff_id=$uid))":' AND user_id=?')).' ORDER BY user_id');
    $clients->execute($admin||is_staff()?[]:[$uid]);$clients=$clients->fetchAll();
    foreach($clients as &$c){$c['id']=(int)$c['id'];$c['contact']=$c['contact'] ?: $c['name'];} unset($c);
    $inventory=$pdo->query("SELECT product_id AS id,sku,product_name AS name,category,stock_quantity AS quantity,unit,price,minimum_stock AS minStock FROM products WHERE status='active' ORDER BY product_id")->fetchAll();
    foreach($inventory as &$p){foreach(['id','quantity','price','minStock'] as $key)$p[$key]+=0;} unset($p);
    if($admin){$planning=inventory_planning($pdo);foreach($inventory as &$p)$p['planning']=$planning[$p['id']] ?? null;unset($p);}
    $orders=$pdo->prepare("SELECT o.*,u.full_name AS client FROM orders o JOIN users u ON u.user_id=o.customer_id".($admin?'':(is_staff()?" WHERE (o.order_id IN (SELECT order_id FROM negotiations) OR o.order_id IN (SELECT s.order_id FROM schedules s JOIN staff_assignments a ON a.schedule_id=s.schedule_id WHERE a.staff_id=$uid))":' WHERE o.customer_id=?')).' ORDER BY o.order_date DESC,o.order_id DESC');$orders->execute($admin||is_staff()?[]:[$uid]);
    $transactions=[];$byOrder=[];$orderRows=[];
    foreach($orders as $o){$orderRows[$o['order_id']]=$o;$byOrder[$o['order_id']]=count($transactions);$transactions[]=['id'=>$o['order_number'],'clientId'=>(int)$o['customer_id'],'client'=>$o['client'],'date'=>$o['requested_date']??substr($o['order_date'],0,10),'orderId'=>(int)$o['order_id'],'kind'=>$o['order_kind']??'Order','status'=>$o['status']==='Cancelled'?'Cancelled':'Pending','orderStatus'=>$o['status'],'demoSeed'=>(bool)($o['demo_seed']??0),'amount'=>(float)$o['total_amount'],'notes'=>$o['notes'] ?? '', 'items'=>[],'product'=>'','quantity'=>0,'unitPrice'=>0,'paymentMethod'=>'','stockReserved'=>(bool)$o['stock_reserved']];}
    // Separate reads avoid multiplying lines and payments in a joined aggregate.
    $lines=$pdo->prepare('SELECT oi.*,p.product_name,p.unit,p.category FROM order_items oi JOIN products p ON p.product_id=oi.product_id JOIN orders o ON o.order_id=oi.order_id'.($admin?'':(is_staff()?" WHERE (o.order_id IN (SELECT order_id FROM negotiations) OR o.order_id IN (SELECT s.order_id FROM schedules s JOIN staff_assignments a ON a.schedule_id=s.schedule_id WHERE a.staff_id=$uid))":' WHERE o.customer_id=?')).' ORDER BY oi.order_item_id');$lines->execute($admin||is_staff()?[]:[$uid]);
    foreach($lines as $i){if(!isset($byOrder[$i['order_id']]))continue;$transactions[$byOrder[$i['order_id']]]['items'][]=['productId'=>(int)$i['product_id'],'product'=>$i['product_name'],'quantity'=>(float)$i['quantity'],'unitPrice'=>(float)$i['unit_price'],'unit'=>$i['unit'],'category'=>$i['category']];}
    $payments=$pdo->prepare('SELECT p.* FROM payments p JOIN orders o ON o.order_id=p.order_id'.($admin?'':(is_staff()?" WHERE (o.order_id IN (SELECT order_id FROM negotiations) OR o.order_id IN (SELECT s.order_id FROM schedules s JOIN staff_assignments a ON a.schedule_id=s.schedule_id WHERE a.staff_id=$uid))":' WHERE o.customer_id=?')).' ORDER BY p.payment_id');$payments->execute($admin||is_staff()?[]:[$uid]);$paid=[];
    foreach($payments as $p){$id=$p['order_id'];if(!isset($byOrder[$id]))continue;$t=&$transactions[$byOrder[$id]];$t['paymentMethod']=$p['payment_method'];$paid[$id][]=$p;if($t['status']!=='Cancelled' && $p['status']==='Overdue')$t['status']='Overdue';unset($t);}
    foreach($transactions as &$t){$t['product']=implode(', ',array_column($t['items'],'product'));$t['quantity']=array_sum(array_column($t['items'],'quantity'));$t['unitPrice']=count($t['items'])===1?$t['items'][0]['unitPrice']:0;}unset($t);
    foreach($byOrder as $id=>$index){$o=$orderRows[$id];$f=order_financials($o,$paid[$id]??[]);$transactions[$index]['finance']=$f;$transactions[$index]['payments']=array_map(fn($p)=>['reference'=>$p['payment_reference'],'amount'=>(float)$p['amount'],'status'=>$p['status'],'date'=>$p['payment_date']],$paid[$id]??[]);if($transactions[$index]['status']!=='Cancelled')$transactions[$index]['status']=$f['paymentStatus']==='Fully Paid'?'Paid':($f['paymentStatus']==='Partially Paid'?'Partially Paid':$transactions[$index]['status']);}
    $s=$pdo->prepare("SELECT s.schedule_id AS id,s.customer_id AS clientId,u.full_name AS client,s.service_type AS service,DATE_FORMAT(s.schedule_date,'%Y-%m-%d') AS date,TIME_FORMAT(s.schedule_time,'%H:%i') AS time,s.status,s.notes,s.address FROM schedules s JOIN users u ON u.user_id=s.customer_id".($admin?'':(is_staff()?" WHERE s.schedule_id IN (SELECT schedule_id FROM staff_assignments WHERE staff_id=$uid)":' WHERE s.customer_id=?')).' ORDER BY s.schedule_date,s.schedule_time');$s->execute($admin||is_staff()?[]:[$uid]);$schedules=$s->fetchAll();foreach($schedules as &$row){$row['id']=(int)$row['id'];$row['clientId']=(int)$row['clientId'];}unset($row);
    $n=$pdo->prepare('SELECT n.negotiation_id AS id,n.customer_id AS clientId,u.full_name AS client,o.order_number AS relatedOrder,n.subject,n.client_offer AS clientOffer,n.admin_offer AS adminOffer,n.quantity,n.message,n.status,n.last_by AS lastBy,n.updated_at AS updated,n.expires_at AS expiresAt FROM negotiations n JOIN users u ON u.user_id=n.customer_id JOIN orders o ON o.order_id=n.order_id'.($admin||is_staff()?'':' WHERE n.customer_id=?').' ORDER BY n.updated_at DESC');$n->execute($admin||is_staff()?[]:[$uid]);$negotiations=$n->fetchAll();foreach($negotiations as &$row){foreach(['clientId','clientOffer','adminOffer','quantity'] as $key)if($row[$key]!==null)$row[$key]+=0;$row['updated']=str_replace(' ','T',$row['updated']).'+08:00';}unset($row);
    foreach($negotiations as &$row){$row['proposedTotal']=money_cents($row['lastBy']==='Admin'?$row['adminOffer']:$row['clientOffer'])*(int)$row['quantity']/100;$row['expired']=$row['expiresAt']<=date('Y-m-d H:i:s');$row['expiringSoon']=!$row['expired']&&$row['expiresAt']<=date('Y-m-d H:i:s',time()+172800);$row['expiresAt']=str_replace(' ','T',$row['expiresAt']).'+08:00';}unset($row);
    $data=compact('clients','inventory','transactions','schedules','negotiations');
    if($admin)$data['financial']=financial_metrics($pdo);
    $data['reviews']=reviews_snapshot($pdo);
    return v2_snapshot($pdo,$data);
}

require_once __DIR__.'/v2.php';
require_once __DIR__.'/public-owner-actions.php';
require_once __DIR__.'/inventory-planning-lib.php';
require_once __DIR__.'/financial-metrics.php';
require_once __DIR__.'/negotiation-pricing.php';
require_once __DIR__.'/workflow-undo.php';
require_once __DIR__.'/reviews-lib.php';
require_once __DIR__.'/business-events.php';
