<?php
require_once __DIR__.'/common.php';
$uid=require_account();$query=$_GET['q'] ?? '';if(!is_string($query)||!mb_check_encoding($query,'UTF-8'))fail_request('Enter a valid search query.');$query=trim($query);
if(strlen($query)>100)fail_request('Search is limited to 100 characters.');
if(mb_strlen($query)<2)client_json_response(200,['success'=>true,'groups'=>[]]);
// Boolean full-text terms are built from letters/digits only, never user operators.
preg_match_all('/[\p{L}\p{N}]{2,}/u',$query,$matches);$words=array_slice($matches[0],0,8);$indexedWords=array_values(array_filter($words,fn($word)=>mb_strlen($word)>=3));
// Two-letter exact tokens are not indexed by InnoDB's default tokenizer. Do not
// let an initial such as "UI" suppress a useful multiword search for "verification".
if($indexedWords)$words=$indexedWords;$terms=implode(' ',array_map(fn($w)=>'+'.$w.'*',$words));
$prefix=str_replace(['!','%','_'],['!!','!%','!_'],$query).'%';$groups=[];
$add=function(string $group,string $sql,array $params,string $kind,string $page)use($pdo,&$groups){$q=$pdo->prepare($sql.' LIMIT 5');$q->execute($params);$rows=$q->fetchAll();if($rows)$groups[]=['label'=>$group,'items'=>array_map(fn($r)=>['id'=>(string)$r['id'],'title'=>$r['title'],'detail'=>$r['detail'],'kind'=>$kind==='person'&&$r['role']==='staff'?'staff':$kind,'page'=>$kind==='person'&&$r['role']==='staff'?'User Management':$page],$rows)];};
$orderScope=is_admin()?'1=1':(is_staff()?'(o.order_id IN (SELECT order_id FROM negotiations) OR o.order_id IN (SELECT s.order_id FROM schedules s JOIN staff_assignments a ON a.schedule_id=s.schedule_id WHERE a.staff_id='.$uid.'))':'o.customer_id='.$uid);
$add('Orders',"SELECT o.order_number AS id,o.order_number AS title,CONCAT(u.full_name,' · ',o.status,' · PHP ',o.total_amount) AS detail FROM orders o JOIN users u ON u.user_id=o.customer_id WHERE $orderScope AND (o.order_number LIKE ? ESCAPE '!' OR MATCH(o.order_number,o.notes) AGAINST (? IN BOOLEAN MODE)) ORDER BY o.order_date DESC",[$prefix,$terms],'order',is_admin()||is_staff()?'Transactions':'My Transactions');
// Everyone can view the existing public catalog. Only owners can edit it.
$add('Inventory',"SELECT product_id AS id,product_name AS title,CONCAT(sku,' · ',stock_quantity,' ',unit,' · PHP ',price) AS detail FROM products WHERE status='active' AND (sku LIKE ? ESCAPE '!' OR MATCH(product_name,sku) AGAINST (? IN BOOLEAN MODE)) ORDER BY product_name",[$prefix,$terms],'product','Inventory');
if(is_admin()||is_staff()){
 $scope=is_admin()?"role IN ('customer','staff')":"(role='customer' AND (user_id IN (SELECT customer_id FROM negotiations) OR user_id IN (SELECT s.customer_id FROM schedules s JOIN staff_assignments a ON a.schedule_id=s.schedule_id WHERE a.staff_id=$uid)))";
 $add('People',"SELECT user_id AS id,full_name AS title,CONCAT(CASE WHEN role='staff' THEN 'Staff' ELSE 'Client' END,' · ',username) AS detail,role FROM users WHERE $scope AND status='active' AND MATCH(full_name,username,email) AGAINST (? IN BOOLEAN MODE) ORDER BY full_name",[$terms],'person','Clients');
}
$scope=is_admin()||is_staff()?'1=1':'n.customer_id='.$uid;
$add('Negotiations',"SELECT n.negotiation_id AS id,n.subject AS title,CONCAT(u.full_name,' · ',n.status,' · ',n.owner_decision) AS detail FROM negotiations n JOIN users u ON u.user_id=n.customer_id WHERE $scope AND (n.negotiation_id LIKE ? ESCAPE '!' OR MATCH(n.subject,n.message) AGAINST (? IN BOOLEAN MODE)) ORDER BY n.updated_at DESC",[$prefix,$terms],'negotiation','Negotiation');
$scope=is_admin()?'1=1':(is_staff()?'s.schedule_id IN (SELECT schedule_id FROM staff_assignments WHERE staff_id='.$uid.')':'s.customer_id='.$uid);
$add('Schedules',"SELECT s.schedule_id AS id,CONCAT(s.service_type,' · ',s.schedule_date) AS title,CONCAT(u.full_name,' · ',TIME_FORMAT(s.schedule_time,'%l:%i %p'),' · ',s.status) AS detail FROM schedules s JOIN users u ON u.user_id=s.customer_id WHERE $scope AND (s.service_type LIKE ? ESCAPE '!' OR CAST(s.schedule_date AS CHAR) LIKE ? ESCAPE '!' OR MATCH(u.full_name,u.username,u.email) AGAINST (? IN BOOLEAN MODE)) ORDER BY s.schedule_date DESC",[$prefix,$prefix,$terms],'schedule',is_admin()||is_staff()?'Staff Schedule':'My Schedule');
$add('Notifications',"SELECT notification_id AS id,title,CONCAT(DATE_FORMAT(created_at,'%b %d %l:%i %p'),' · ',IF(read_at IS NULL,'Unread','Read')) AS detail FROM notifications WHERE user_id=? AND MATCH(title,message) AGAINST (? IN BOOLEAN MODE) ORDER BY created_at DESC",[$uid,$terms],'notification','Notifications');
if(is_admin()){
 $add('Public portfolio',"SELECT project_id AS id,title,CONCAT(category,' · ',publication_status) AS detail FROM public_portfolio_projects WHERE MATCH(title,description) AGAINST (? IN BOOLEAN MODE) ORDER BY updated_at DESC",[$terms],'portfolio','Public Portfolio');
 $add('Website inquiries',"SELECT inquiry_id AS id,reference AS title,CONCAT(full_name,' · ',status) AS detail FROM public_inquiries WHERE reference LIKE ? ESCAPE '!' OR MATCH(full_name,email,message) AGAINST (? IN BOOLEAN MODE) ORDER BY created_at DESC",[$prefix,$terms],'inquiry','Website Inquiries');
 $add('Saved forecasts',"SELECT forecast_id AS id,CONCAT(model_name,' · ',forecast_month) AS title,CONCAT('PHP ',predicted_revenue) AS detail FROM forecast_snapshots WHERE MATCH(model_name) AGAINST (? IN BOOLEAN MODE) OR CAST(forecast_month AS CHAR) LIKE ? ESCAPE '!' ORDER BY generated_at DESC",[$terms,$prefix],'forecast','Forecast & Reports');
}
$pages=is_admin()?['Dashboard','Calendar','Staff Schedule','Transactions','Negotiation','Receipts','Inventory','Clients','User Management','Forecast & Reports','Reviews','Profile','Notifications','Public Portfolio','Website Inquiries']:(is_staff()?['Dashboard','Staff Schedule','Transactions','Negotiation','Profile','Notifications']:['Dashboard','My Transactions','Calendar','My Schedule','Negotiation','Reviews','Profile','Notifications']);
$modules=[];foreach($pages as $page)if(stripos($page,$query)!==false)$modules[]=['id'=>$page,'title'=>$page,'detail'=>'Open module','kind'=>'module','page'=>$page];if($modules)$groups[]=['label'=>'Modules','items'=>$modules];
client_json_response(200,['success'=>true,'groups'=>$groups]);
