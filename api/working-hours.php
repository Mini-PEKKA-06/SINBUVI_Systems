<?php
// A dated Available record overrides the weekly default; time off always wins.
function weekly_hours_ready(PDO $pdo): bool {
    $q=$pdo->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personnel_weekly_hours'");return (bool)$q->fetchColumn();
}
function initialize_weekly_hours(PDO $pdo,int $id): void {
    if(!weekly_hours_ready($pdo))return; // Legacy database remains usable until its additive migration.
    $q=$pdo->prepare('INSERT IGNORE INTO personnel_weekly_hours(user_id,weekday,working,start_time,end_time) VALUES (?,?,?,?,?)');
    for($day=0;$day<7;$day++)$q->execute([$id,$day,(int)($day!==0),$day===0?null:'08:00',$day===0?null:'17:00']);
}
function working_periods(PDO $pdo,int $staff,string $date): array {
    $q=$pdo->prepare("SELECT start_time,end_time FROM staff_availability WHERE staff_id=? AND work_date=? AND availability_type='Available' FOR UPDATE");$q->execute([$staff,$date]);$rows=$q->fetchAll();
    if(!$rows&&weekly_hours_ready($pdo)){$q=$pdo->prepare('SELECT start_time,end_time FROM personnel_weekly_hours WHERE user_id=? AND weekday=? AND working=1 FOR UPDATE');$q->execute([$staff,(int)(new DateTimeImmutable($date))->format('w')]);$rows=$q->fetchAll();}
    return $rows;
}
function check_person_jobs(PDO $pdo,int $staff): void {
    $q=$pdo->prepare("SELECT a.*,s.schedule_date FROM staff_assignments a JOIN schedules s ON s.schedule_id=a.schedule_id WHERE a.staff_id=? AND a.status='Assigned' AND s.status NOT IN ('Completed','Cancelled') AND s.schedule_date>=CURDATE() FOR UPDATE");$q->execute([$staff]);
    foreach($q->fetchAll() as $a)assignment_check($pdo,$staff,$a['schedule_date'],substr($a['start_time'],0,5),substr($a['end_time'],0,5),(int)$a['assignment_id']);
}
function availability_person(PDO $pdo,array $input): int {
    $actor=require_account();if(!is_admin()&&!is_staff())fail_request('Personnel access required.',403);
    $staff=filter_var($input['staffId']??$actor,FILTER_VALIDATE_INT);if(!$staff)throw new InvalidArgumentException('Choose personnel.');
    if(!is_admin()&&$staff!==$actor)fail_request('You may only edit your own availability.',403);
    lock_staff($pdo,$staff);return $staff;
}
function save_weekly_hours(PDO $pdo,array $input): array {
    $staff=availability_person($pdo,$input);$days=$input['days']??null;
    if(!is_array($days)||!array_is_list($days)||count($days)!==7)throw new InvalidArgumentException('Supply all seven working days.');
    $q=$pdo->prepare('INSERT INTO personnel_weekly_hours(user_id,weekday,working,start_time,end_time) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE working=VALUES(working),start_time=VALUES(start_time),end_time=VALUES(end_time)');
    foreach($days as $day=>$row){if(!is_array($row)||!in_array($row['working']??null,[true,false,0,1],true))throw new InvalidArgumentException('Choose working or nonworking for each day.');$on=(bool)$row['working'];$start=$on?time_value($row['start']??null):null;$end=$on?time_value($row['end']??null):null;if($on&&$end<=$start)throw new InvalidArgumentException('End must follow start on the same day.');$q->execute([$staff,$day,(int)$on,$start,$end]);}
    check_person_jobs($pdo,$staff);
    notify_users($pdo,array_merge([$staff],role_ids($pdo,['admin'])),'weekly-hours:'.$staff,'Working hours updated','Weekly working hours were updated.','Profile',(string)$staff);
    return ['id'=>$staff,'staffId'=>$staff];
}
function allocate_order_number(PDO $pdo,int $year): string {
    // Called inside the same transaction as order, stock and payment changes.
    $q=$pdo->prepare('INSERT IGNORE INTO order_sequences(order_year,last_number) SELECT ?,COALESCE(MAX(CAST(SUBSTRING_INDEX(order_number,\'-\',-1) AS UNSIGNED)),0) FROM orders WHERE order_number REGEXP ?');$q->execute([$year,'^ORD-'.$year.'-[0-9]+$']);
    $q=$pdo->prepare('SELECT last_number FROM order_sequences WHERE order_year=? FOR UPDATE');$q->execute([$year]);$next=(int)$q->fetchColumn()+1;
    $q=$pdo->prepare('UPDATE order_sequences SET last_number=? WHERE order_year=?');$q->execute([$next,$year]);
    return sprintf('ORD-%04d-%04d',$year,$next);
}
