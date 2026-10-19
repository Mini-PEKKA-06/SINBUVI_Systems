<?php
// Calendar-month material demand, not revenue or repeated movement-log deductions.
function inventory_planning(PDO $pdo,?DateTimeImmutable $asOf=null): array {
 $asOf=$asOf ?? new DateTimeImmutable('today',new DateTimeZone('Asia/Manila'));
 $end=$asOf->modify('first day of this month')->setTime(0,0);
 $start=$end->modify('-3 months');$days=(int)$start->diff($end)->days;
 $products=$pdo->query("SELECT p.product_id,p.stock_quantity,p.unit,p.minimum_stock,COALESCE(ip.lead_days,7) lead_days,COALESCE(ip.safety_percent,25) safety_percent,COALESCE(ip.review_days,30) review_days,COALESCE(ip.slow_days,90) slow_days FROM products p LEFT JOIN inventory_policies ip USING(product_id) WHERE p.status='active'")->fetchAll(PDO::FETCH_ASSOC);
 $q=$pdo->prepare("SELECT oi.product_id,DATE_FORMAT(o.order_date,'%Y-%m') month_key,SUM(oi.quantity) qty FROM order_items oi JOIN orders o USING(order_id) WHERE o.status<>'Cancelled' AND o.stock_reserved=1 AND o.order_date>=? AND o.order_date<? GROUP BY oi.product_id,month_key");$q->execute([$start->format('Y-m-d'),$end->format('Y-m-d')]);$demand=[];foreach($q as $row)$demand[$row['product_id']][$row['month_key']]=(float)$row['qty'];
 $q=$pdo->prepare("SELECT oi.product_id,MAX(o.order_date) last_demand FROM order_items oi JOIN orders o USING(order_id) WHERE o.status<>'Cancelled' AND o.stock_reserved=1 AND o.order_date<? GROUP BY oi.product_id");$q->execute([$asOf->modify('+1 day')->format('Y-m-d')]);$last=[];foreach($q as $row)$last[$row['product_id']]=$row['last_demand'];
 $q=$pdo->prepare('SELECT MIN(order_date) FROM orders WHERE order_date<?');$q->execute([$end->format('Y-m-d')]);$first=$q->fetchColumn();$coverageStart=$first?max($start->format('Y-m-d'),substr($first,0,10)):$end->format('Y-m-d');
 $observed=max(0,(int)(new DateTimeImmutable($coverageStart,$asOf->getTimezone()))->diff($end)->days);$enough=$observed>=30;
 $result=[];foreach($products as $p){$id=(int)$p['product_id'];$months=[];for($m=0;$m<3;$m++){$key=$start->modify("+$m months")->format('Y-m');$months[$key]=$demand[$id][$key] ?? 0;}
  $total=array_sum($months);$daily=$observed?$total/$observed:0;$lead=(int)$p['lead_days'];$buffer=(float)$p['safety_percent'];$review=(int)$p['review_days'];$slow=(int)$p['slow_days'];$stock=(float)$p['stock_quantity'];
  $roundUp=static fn(float $n):float=>ceil(max(0,$n)*($p['unit']==='sq.m'?100:1)-0.00000001)/($p['unit']==='sq.m'?100:1);
  $mode=$enough?'Demand-based':'Manual fallback';$safety=$daily*$lead*$buffer/100;$rop=$enough?$roundUp($daily*$lead+$safety):(float)$p['minimum_stock'];$target=$enough?$roundUp($daily*($lead+$review)+$safety):$rop;
  $cover=$daily>0?$stock/$daily:null;$lastDate=isset($last[$id])?substr($last[$id],0,10):null;$idleDays=$lastDate?(int)(new DateTimeImmutable($lastDate,$asOf->getTimezone()))->diff($asOf)->days:null;
  $slowLabel=$stock<=0?'None':($total<=0?($enough?'No recent demand':'Insufficient history'):($cover>$slow?'Excess cover':($idleDays!==null&&$idleDays>=$slow?'No recent activity':'None')));
  $status=$stock<=0?'Out of Stock':($rop>0&&$stock<=$rop?'Low Stock':'In Stock');
  $result[$id]=['mode'=>$mode,'windowStart'=>$start->format('Y-m-d'),'windowEnd'=>$end->modify('-1 day')->format('Y-m-d'),'asOf'=>$asOf->format('Y-m-d'),'calendarDays'=>$days,'observedDays'=>$observed,'months'=>$months,'demand'=>$total,'dailyDemand'=>$daily,'leadDays'=>$lead,'safetyPercent'=>$buffer,'reviewDays'=>$review,'slowDays'=>$slow,'safetyStock'=>round($safety,4),'reorderPoint'=>$rop,'targetStock'=>$target,'daysCover'=>$cover===null?null:round($cover,1),'lastDemand'=>$lastDate,'slowStatus'=>$slowLabel,'status'=>$status,'suggestedOrder'=>$enough&&$total>0&&$status!=='In Stock'?$roundUp(max(0,$target-$stock)):0];
 }
 return $result;
}
function inventory_policy_action(PDO $pdo,array $input): array {
 require_account(true);$id=filter_var($input['id'] ?? null,FILTER_VALIDATE_INT);if(!$id)throw new InvalidArgumentException('Select a product.');
 $q=$pdo->prepare("SELECT product_id FROM products WHERE product_id=? AND status='active' FOR UPDATE");$q->execute([$id]);if(!$q->fetchColumn())throw new InvalidArgumentException('Active product not found.');
 $values=[];foreach(['leadDays'=>365,'safetyPercent'=>100,'reviewDays'=>365,'slowDays'=>730] as $key=>$max){$v=number_value($input[$key] ?? null,$key,$key==='safetyPercent'?0:1,$max);if($key!=='safetyPercent'&&floor($v)!==$v)throw new InvalidArgumentException('Day settings must be whole numbers.');$values[]=$v;}
 $q=$pdo->prepare('INSERT INTO inventory_policies(product_id,lead_days,safety_percent,review_days,slow_days) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE lead_days=VALUES(lead_days),safety_percent=VALUES(safety_percent),review_days=VALUES(review_days),slow_days=VALUES(slow_days)');$q->execute(array_merge([$id],$values));return ['id'=>$id];
}
