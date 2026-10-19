<?php
// Called within dispatch_action's transaction; the booking lock serializes team size.
function assign_team(PDO $pdo,array $input): array {
    require_account(true);
    $ids=$input['personnelIds'] ?? null;
    if(!is_array($ids)||!array_is_list($ids)||count($ids)<1||count($ids)>3)throw new InvalidArgumentException('Select between one and three personnel, including the Owner if needed.');
    foreach($ids as &$id){$id=filter_var($id,FILTER_VALIDATE_INT);if(!$id||$id<1)throw new InvalidArgumentException('Select valid personnel.');}unset($id);
    if(count(array_unique($ids))!==count($ids))throw new InvalidArgumentException('Each person can be selected only once.');
    sort($ids,SORT_NUMERIC);
    $sid=filter_var($input['scheduleId'] ?? null,FILTER_VALIDATE_INT);
    $q=$pdo->prepare('SELECT * FROM schedules WHERE schedule_id=? FOR UPDATE');$q->execute([$sid]);$s=$q->fetch();
    if(!$s)throw new InvalidArgumentException('Schedule not found.');
    if(in_array($s['status'],['Cancelled','Completed'],true))throw new InvalidArgumentException('Cannot assign a closed schedule.');
    $start=time_value($input['start'] ?? null);$end=time_value($input['end'] ?? null);
    if($s['schedule_date'].' '.$start<date('Y-m-d H:i'))throw new InvalidArgumentException('Cannot assign a past job.');
    if($start!==substr($s['schedule_time'],0,5)||($s['end_time']!==null&&$end!==substr($s['end_time'],0,5)))throw new InvalidArgumentException('Team times must match the booking. Update the booking first.');
    $q=$pdo->prepare('SELECT staff_id FROM staff_assignments WHERE schedule_id=? ORDER BY staff_id FOR UPDATE');$q->execute([$sid]);$oldIds=array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));
    $locks=array_filter(array_unique(array_merge($oldIds,$ids)),static fn($id)=>$id>0);sort($locks,SORT_NUMERIC);
    foreach($locks as $id)lock_staff($pdo,$id,in_array($id,$ids,true));
    foreach($ids as $id)assignment_check($pdo,$id,$s['schedule_date'],$start,$end,0,(int)$sid);
    // Retain former team rows, including historical identities, instead of deleting.
    $q=$pdo->prepare("UPDATE staff_assignments SET status='Cancelled',updated_at=NOW(6) WHERE schedule_id=? AND status<>'Cancelled'");$q->execute([$sid]);
    $q=$pdo->prepare("INSERT INTO staff_assignments(schedule_id,staff_id,start_time,end_time,status,assigned_by) VALUES (?,?,?,?,'Assigned',?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time),end_time=VALUES(end_time),status='Assigned',assigned_by=VALUES(assigned_by),updated_at=NOW(6)");
    foreach($ids as $id)$q->execute([$sid,$id,$start,$end,require_account()]);
    $q=$pdo->prepare('UPDATE schedules SET end_time=? WHERE schedule_id=?');$q->execute([$end,$sid]);
    return ['id'=>(int)$sid,'scheduleId'=>(int)$sid,'personnelIds'=>$ids];
}
