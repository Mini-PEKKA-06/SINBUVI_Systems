<?php
require_once __DIR__.'/order-financials.php';
function proportional_cents(int $amount,int $weight,int $denominator): int {
    $quotient=0;$remainder=0;foreach(str_split((string)$amount) as $digit){$next=$remainder*10+$weight*(int)$digit;$quotient=$quotient*10+intdiv($next,$denominator);$remainder=$next%$denominator;}return $quotient;
}
function financial_metrics(PDO $pdo,?DateTimeImmutable $asOf=null): array {
    $asOf=($asOf??new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->setTimezone(new DateTimeZone('Asia/Manila'));
    $payments=[];foreach($pdo->query('SELECT * FROM payments ORDER BY payment_date,payment_id') as $p)$payments[$p['order_id']][]=$p;
    $monthly=[];$demoMonthly=[];$recognized=[];$outstanding=0;$undated=0;$years=[(int)$asOf->format('Y')];
    foreach($pdo->query('SELECT * FROM orders ORDER BY order_id') as $o){$years[]=(int)substr($o['order_date'],0,4);$f=order_financials($o,$payments[$o['order_id']]??[],$asOf);$undated+=$f['undatedPaidPayments'];$outstanding+=money_cents($f['outstanding']);if(!$f['recognizedAt'])continue;
        $month=substr($f['recognizedAt'],0,7);$amount=money_cents($o['total_amount']);$years[]=(int)substr($month,0,4);$monthly[$month]=($monthly[$month]??0)+$amount;if(!empty($o['demo_seed']))$demoMonthly[$month]=($demoMonthly[$month]??0)+$amount;$recognized[(int)$o['order_id']]=['id'=>(int)$o['order_id'],'month'=>$month,'recognizedAt'=>str_replace(' ','T',$f['recognizedAt']).'+08:00','amount'=>$amount/100,'demoSeed'=>(bool)($o['demo_seed']??false)];
    }
    ksort($monthly);$demoMonthly=array_map(static fn($v)=>$v/100,$demoMonthly);$monthly=array_map(static fn($v)=>$v/100,$monthly);$weights=[];
    foreach($pdo->query('SELECT i.order_id,p.category,ROUND(i.quantity*i.unit_price,2) line_amount FROM order_items i JOIN products p ON p.product_id=i.product_id ORDER BY i.order_id,p.category') as $line){if(isset($recognized[$line['order_id']]))$weights[$line['order_id']][$line['category']]=($weights[$line['order_id']][$line['category']]??0)+money_cents($line['line_amount']);}
    $categories=[];foreach($recognized as $id=>$row){$parts=$weights[$id]??['Uncategorized'=>1];$denominator=array_sum($parts);$remaining=money_cents($row['amount']);$last=array_key_last($parts);foreach($parts as $category=>$weight){$share=$category===$last?$remaining:proportional_cents(money_cents($row['amount']),$weight,max(1,$denominator));$remaining-=$share;$categories[$row['month']][$category]=($categories[$row['month']][$category]??0)+$share;}}
    foreach($categories as &$items)$items=array_map(static fn($v)=>$v/100,$items);unset($items);$years=array_values(array_unique($years));sort($years);
    return ['asOf'=>$asOf->format(DateTimeInterface::ATOM),'year'=>(int)$asOf->format('Y'),'month'=>(int)$asOf->format('n'),'years'=>$years,'monthly'=>$monthly,'demoMonthly'=>$demoMonthly,'recognized'=>array_values($recognized),'categories'=>$categories,'outstanding'=>$outstanding/100,'undatedPaidPayments'=>$undated,'forecast'=>revenue_forecast($monthly,$asOf)];
}

function revenue_forecast(array $monthly,DateTimeImmutable $asOf): array {
    $end=$asOf->modify('first day of this month')->setTime(0,0);
    $start=$end->modify('-12 months');
    $keys=array_keys($monthly);sort($keys);
    if($keys&&$keys[0]>$start->format('Y-m'))$start=new DateTimeImmutable($keys[0].'-01',new DateTimeZone('Asia/Manila'));
    $history=[];
    for($cursor=$start;$cursor<$end;$cursor=$cursor->modify('+1 month'))$history[$cursor->format('Y-m')]=(float)($monthly[$cursor->format('Y-m')] ?? 0);
    $values=array_values($history);$count=count($values);$estimate=null;$spread=null;$capped=0;
    if($count>=3){
        $sorted=$values;sort($sorted);$median=$sorted[(int)floor(($count-1)/2)];
        // Cap exceptional spikes only in model inputs; actual financial totals stay exact.
        $ceiling=$count>=5&&$median>0?3*$median:INF;
        $model=array_map(static function($value)use($ceiling,&$capped){if($value>$ceiling)$capped++;return min($value,$ceiling);},$values);
        $recent=array_slice($model,-3);$estimate=round(($recent[0]+2*$recent[1]+3*$recent[2])/6,2);
        $errors=[];for($i=3;$i<count($model);$i++)$errors[]=abs($model[$i]-($model[$i-3]+2*$model[$i-2]+3*$model[$i-1])/6);
        if(!$errors)$errors=array_map(static fn($value)=>abs($value-$estimate),$recent);
        $spread=round(1.96*array_sum($errors)/count($errors),2);
    }
    return ['months'=>$history,'monthCount'=>$count,'partialMonth'=>$end->format('Y-m'),'forecastMonth'=>$end->modify('+1 month')->format('Y-m'),'next'=>$estimate,'lower'=>$estimate===null?null:max(0,round($estimate-$spread,2)),'upper'=>$estimate===null?null:round($estimate+$spread,2),'cappedMonths'=>$capped,'average'=>$count?round(array_sum($values)/$count,2):0,'method'=>'Next calendar month level estimate from the last three complete months, weights 1:2:3; assumes the recent level continues. Missing months after first recorded revenue are zero. Current partial-month actual is displayed separately and excluded from model weights. With at least five months, model-only spikes are capped at three times the historical median. Range is an indicative 1.96 × historical mean absolute forecast error, not a calibrated confidence interval. At least three complete months are required.'];
}
