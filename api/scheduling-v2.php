<?php
require_once __DIR__.'/working-hours.php';
function time_value(mixed $value): string {
    if(!is_string($value)||!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/',$value))throw new InvalidArgumentException('Enter a valid time.');return $value;
}
function lock_staff(PDO $pdo,int $id,bool $active=true): void {
    $q=$pdo->prepare("SELECT user_id FROM users WHERE user_id=? AND role IN ('admin','staff')".($active?" AND status='active'":'').' FOR UPDATE');$q->execute([$id]);if(!$q->fetch())throw new InvalidArgumentException('Choose active Owner/Staff personnel.');
}
function assignment_check(PDO $pdo,int $staff,string $date,string $start,string $end,int $exclude=0,int $excludeSchedule=0): void {
    if($end<=$start)throw new InvalidArgumentException('End time must follow start time on the same date.');
    $covered=false;foreach(working_periods($pdo,$staff,$date) as $period)if(substr($period['start_time'],0,5)<=$start&&substr($period['end_time'],0,5)>=$end)$covered=true;
    if(!$covered)throw new InvalidArgumentException('Assignment must fall within a recorded working availability period.');
    $q=$pdo->prepare("SELECT availability_id FROM staff_availability WHERE staff_id=? AND work_date=? AND availability_type='Unavailable' AND start_time<? AND end_time>? FOR UPDATE");$q->execute([$staff,$date,$end,$start]);if($q->fetch())throw new InvalidArgumentException('Staff is unavailable during this period.');
    $q=$pdo->prepare("SELECT a.assignment_id FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND s.schedule_date=? AND a.status='Assigned' AND s.status NOT IN ('Cancelled','Completed') AND a.start_time<? AND a.end_time>? AND a.assignment_id<>? AND a.schedule_id<>? FOR UPDATE");$q->execute([$staff,$date,$end,$start,$exclude,$excludeSchedule]);if($q->fetch())throw new InvalidArgumentException('This assignment overlaps another job.');
}
require_once __DIR__.'/scheduling-team.php';
function scheduling_action(PDO $pdo,string $action,array $input): ?array {
    if($action==='saveWeeklyHours')return save_weekly_hours($pdo,$input);
    if($action==='assignTeam')return assign_team($pdo,$input);
    if($action==='saveAvailability'){
        $staff=availability_person($pdo,$input);$date=date_value($input['date'] ?? null);$start=time_value($input['start'] ?? null);$end=time_value($input['end'] ?? null);$type=enum_value($input['type'] ?? null,['Available','Unavailable'],'availability type');
        $availabilityId=filter_var($input['id'] ?? 0,FILTER_VALIDATE_INT);if($availabilityId===false||$availabilityId<0)throw new InvalidArgumentException('Invalid availability record.');
        if($availabilityId){$q=$pdo->prepare('SELECT staff_id FROM staff_availability WHERE availability_id=? FOR UPDATE');$q->execute([$availabilityId]);if((int)$q->fetchColumn()!==$staff)throw new InvalidArgumentException('Availability does not belong to this person.');}
        if($date.' '.$start<date('Y-m-d H:i')||$end<=$start)throw new InvalidArgumentException('Use a future period with end after start.');
        if($type==='Unavailable'){$q=$pdo->prepare("SELECT a.assignment_id FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND s.schedule_date=? AND a.status='Assigned' AND s.status NOT IN ('Cancelled','Completed') AND a.start_time<? AND a.end_time>? FOR UPDATE");$q->execute([$staff,$date,$end,$start]);if($q->fetch())throw new InvalidArgumentException('Reassign conflicting jobs before recording time off.');}
        if($availabilityId){
            $q=$pdo->prepare('UPDATE staff_availability SET work_date=?,start_time=?,end_time=?,availability_type=?,reason=? WHERE availability_id=?');$q->execute([$date,$start,$end,$type,optional_text($input,'reason',1000),$availabilityId]);
            $q=$pdo->prepare("SELECT a.*,s.schedule_date FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND a.status='Assigned' AND s.status NOT IN ('Cancelled','Completed') FOR UPDATE");$q->execute([$staff]);
            foreach($q->fetchAll() as $a)assignment_check($pdo,$staff,$a['schedule_date'],substr($a['start_time'],0,5),substr($a['end_time'],0,5),(int)$a['assignment_id']);
        }else{$q=$pdo->prepare('INSERT INTO staff_availability(staff_id,work_date,start_time,end_time,availability_type,reason) VALUES (?,?,?,?,?,?)');$q->execute([$staff,$date,$start,$end,$type,optional_text($input,'reason',1000)]);$availabilityId=(int)$pdo->lastInsertId();}
        check_person_jobs($pdo,$staff);
        return ['id'=>$availabilityId,'staffId'=>$staff];
    }
    if($action==='deleteAvailability'){
        require_account();$q=$pdo->prepare('SELECT * FROM staff_availability WHERE availability_id=?');$q->execute([(int)($input['id'] ?? 0)]);$row=$q->fetch();if(!$row)throw new InvalidArgumentException('Availability not found.');availability_person($pdo,['staffId'=>(int)$row['staff_id']]);
        $q=$pdo->prepare('DELETE FROM staff_availability WHERE availability_id=?');$q->execute([$row['availability_id']]);
        $q=$pdo->prepare("SELECT a.* FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND s.schedule_date=? AND a.status='Assigned' AND s.status NOT IN ('Completed','Cancelled') FOR UPDATE");$q->execute([$row['staff_id'],$row['work_date']]);foreach($q->fetchAll() as $a)assignment_check($pdo,(int)$a['staff_id'],$row['work_date'],substr($a['start_time'],0,5),substr($a['end_time'],0,5),(int)$a['assignment_id']);
        return ['id'=>(int)$row['availability_id'],'staffId'=>(int)$row['staff_id']];
    }
    if($action==='assignStaff'){
        require_account(true);$sid=(int)($input['scheduleId'] ?? 0);$q=$pdo->prepare('SELECT * FROM schedules WHERE schedule_id=? FOR UPDATE');$q->execute([$sid]);$schedule=$q->fetch();if(!$schedule)throw new InvalidArgumentException('Schedule not found.');
        if(in_array($schedule['status'],['Cancelled','Completed'],true))throw new InvalidArgumentException('Cannot assign a closed schedule.');
        $staff=(int)($input['staffId'] ?? 0);$oldId=(int)($input['id'] ?? 0);$old=null;
        if($oldId){$q=$pdo->prepare('SELECT * FROM staff_assignments WHERE assignment_id=? AND schedule_id=? FOR UPDATE');$q->execute([$oldId,$sid]);$old=$q->fetch();if(!$old)throw new InvalidArgumentException('Assignment not found.');}
        $locks=array_unique([$staff,$old?(int)$old['staff_id']:$staff]);sort($locks);foreach($locks as $id)lock_staff($pdo,$id);
        $start=time_value($input['start'] ?? null);$end=time_value($input['end'] ?? null);if($schedule['schedule_date'].' '.$start<date('Y-m-d H:i'))throw new InvalidArgumentException('Cannot assign a past job.');
        if($start!==substr($schedule['schedule_time'],0,5))throw new InvalidArgumentException('Assignment start must match the job start. Update the schedule first.');
        if($schedule['end_time']!==null&&$end!==substr($schedule['end_time'],0,5))throw new InvalidArgumentException('Assignment end must match the job end. Update the schedule first.');
        $status=enum_value($input['status'] ?? 'Assigned',['Assigned','Completed','Cancelled'],'assignment status');
        $q=$pdo->prepare("SELECT staff_id FROM staff_assignments WHERE schedule_id=? AND status<>'Cancelled' AND assignment_id<>? FOR UPDATE");$q->execute([$sid,$oldId]);$team=array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));if($status!=='Cancelled')$team[]=$staff;
        if(count(array_unique($team))>3)throw new InvalidArgumentException('A job permits at most three assigned personnel, including the Owner.');
        if(!$team)throw new InvalidArgumentException('Keep at least one person assigned, or cancel the booking.');
        if($status==='Assigned')assignment_check($pdo,$staff,$schedule['schedule_date'],$start,$end,$oldId);
        if($old&&(int)$old['staff_id']!==$staff){
            $q=$pdo->prepare("UPDATE staff_assignments SET status='Cancelled',updated_at=NOW(6) WHERE assignment_id=?");$q->execute([$oldId]);
            $q=$pdo->prepare('INSERT INTO staff_assignments(schedule_id,staff_id,start_time,end_time,status,assigned_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time),end_time=VALUES(end_time),status=VALUES(status),assigned_by=VALUES(assigned_by),updated_at=NOW(6)');$q->execute([$sid,$staff,$start,$end,$status,require_account()]);
            $q=$pdo->prepare('SELECT assignment_id FROM staff_assignments WHERE schedule_id=? AND staff_id=?');$q->execute([$sid,$staff]);$id=(int)$q->fetchColumn();
        }
        elseif($old){$q=$pdo->prepare('UPDATE staff_assignments SET staff_id=?,start_time=?,end_time=?,status=?,assigned_by=?,updated_at=NOW(6) WHERE assignment_id=?');$q->execute([$staff,$start,$end,$status,require_account(),$oldId]);$id=$oldId;}
        else{$q=$pdo->prepare('INSERT INTO staff_assignments(schedule_id,staff_id,start_time,end_time,status,assigned_by) VALUES (?,?,?,?,?,?)');$q->execute([$sid,$staff,$start,$end,$status,require_account()]);$id=(int)$pdo->lastInsertId();}
        $q=$pdo->prepare('UPDATE schedules SET end_time=? WHERE schedule_id=?');$q->execute([$end,$sid]);return ['id'=>$id,'staffId'=>$staff,'oldStaffId'=>$old?(int)$old['staff_id']:null,'scheduleId'=>$sid];
    }
    if($action==='updateSchedule'){
        require_account(true);$id=(int)($input['id'] ?? 0);$q=$pdo->prepare('SELECT * FROM schedules WHERE schedule_id=? FOR UPDATE');$q->execute([$id]);$old=$q->fetch();if(!$old)throw new InvalidArgumentException('Schedule not found.');
        $date=date_value($input['date'] ?? null);$start=time_value($input['time'] ?? null);$end=isset($input['end'])&&$input['end']!==''?time_value($input['end']):($old['end_time']?substr($old['end_time'],0,5):null);$status=enum_value($input['status'] ?? null,['Pending','Confirmed','Completed','Cancelled'],'schedule status');
        if(($date!==$old['schedule_date']||$start!==substr($old['schedule_time'],0,5))&&$date.' '.$start<date('Y-m-d H:i'))throw new InvalidArgumentException('Choose a future appointment time.');if($end&&$end<=$start)throw new InvalidArgumentException('End must follow start.');
        $q=$pdo->prepare("SELECT * FROM staff_assignments WHERE schedule_id=? ORDER BY staff_id FOR UPDATE");$q->execute([$id]);$assignments=$q->fetchAll();
        foreach($assignments as $a){if($a['status']==='Cancelled'||$a['staff_id']===null)continue;lock_staff($pdo,(int)$a['staff_id'],!in_array($status,['Cancelled','Completed'],true));if(!$end)throw new InvalidArgumentException('Assigned jobs require an end time.');if(!in_array($status,['Cancelled','Completed'],true))assignment_check($pdo,(int)$a['staff_id'],$date,$start,$end,(int)$a['assignment_id']);}
        if($status!=='Cancelled'){$q=$pdo->prepare("SELECT schedule_id FROM schedules WHERE customer_id=? AND schedule_date=? AND schedule_time=? AND status<>'Cancelled' AND schedule_id<>? FOR UPDATE");$q->execute([$old['customer_id'],$date,$start,$id]);if($q->fetch())throw new InvalidArgumentException('The client already has an appointment at this time.');}
        $q=$pdo->prepare('UPDATE schedules SET schedule_date=?,schedule_time=?,end_time=?,status=?,address=?,notes=? WHERE schedule_id=?');$q->execute([$date,$start,$end,$status,text_value($input,'address',255),optional_text($input,'notes',5000),$id]);
        $q=$pdo->prepare("UPDATE staff_assignments SET start_time=?,end_time=COALESCE(?,end_time),status=CASE WHEN ?='Cancelled' THEN 'Cancelled' WHEN ?='Completed' THEN 'Completed' ELSE status END,updated_at=NOW(6) WHERE schedule_id=? AND status<>'Cancelled'");$q->execute([$start,$end,$status,$status,$id]);return ['id'=>$id];
    }
    return null;
}
