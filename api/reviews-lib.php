<?php
function reviews_available(PDO $pdo):bool{
    static $ready=[];$key=spl_object_id($pdo);
    if(!array_key_exists($key,$ready))$ready[$key]=(bool)$pdo->query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='client_reviews'")->fetchColumn();
    return $ready[$key];
}
function reviews_snapshot(PDO $pdo,?int $reviewId=null):array{
    if(is_staff()||!reviews_available($pdo))return [];
    $where=[];$params=[];
    if(!is_admin()){$where[]='r.client_id=?';$params[]=require_account();}
    if($reviewId!==null){$where[]='r.review_id=?';$params[]=$reviewId;}
    $q=$pdo->prepare("SELECT r.review_id AS id,r.client_id AS clientId,u.full_name AS client,r.rating,r.review_text AS text,r.status,r.moderation_reason AS reason,r.demo_seed AS demoSeed,r.version,r.created_at AS createdAt,r.updated_at AS updatedAt FROM client_reviews r JOIN users u ON u.user_id=r.client_id".($where?' WHERE '.implode(' AND ',$where):'')." ORDER BY r.updated_at DESC,r.review_id DESC LIMIT 200");$q->execute($params);
    return $q->fetchAll();
}
function review_action(PDO $pdo,string $action,array $input):?array{
    if(!in_array($action,['saveReview','deleteReview','moderateReview'],true))return null;
    if(!reviews_available($pdo))throw new InvalidArgumentException('Apply the V7 database migration to enable reviews.');
    $actor=require_account();$id=filter_var($input['id']??0,FILTER_VALIDATE_INT);
    if($id===false||$id<0)throw new InvalidArgumentException('Invalid review ID.');
    if($action==='moderateReview')require_account(true);
    elseif(is_admin()||is_staff())fail_request('Only clients submit or delete their own reviews.',403);
    $old=null;
    if($id){
        $q=$pdo->prepare('SELECT * FROM client_reviews WHERE review_id=? FOR UPDATE');$q->execute([$id]);$old=$q->fetch();
        if(!$old||(!is_admin()&&(int)$old['client_id']!==$actor))fail_request('Review not found or not owned by your account.',403);
        if((int)($input['version']??0)!==(int)$old['version'])throw new InvalidArgumentException('This review changed. Refresh and reopen it.');
        if($old['status']==='Deleted')throw new InvalidArgumentException('A deleted review cannot be changed.');
    }elseif($action!=='saveReview')throw new InvalidArgumentException('Select a review.');
    $reason=null;
    if($action==='saveReview'){
        if(isset($input['clientId'])&&(int)$input['clientId']!==$actor)fail_request('You may only submit your own review.',403);
        $rating=filter_var($input['rating']??null,FILTER_VALIDATE_INT);if($rating===false||$rating<1||$rating>5)throw new InvalidArgumentException('Choose a whole rating between 1 and 5.');
        $text=text_value($input,'text',2000);if(mb_strlen($text)<10)throw new InvalidArgumentException('Please write at least 10 characters of feedback.');
        $status='Pending';
        if($old&&$old['status']==='Pending'&&(int)$old['rating']===$rating&&$old['review_text']===$text)return ['id'=>$id];
        if($old){$q=$pdo->prepare("UPDATE client_reviews SET rating=?,review_text=?,status='Pending',moderation_reason=NULL,version=version+1 WHERE review_id=?");$q->execute([$rating,$text,$id]);}
        else{$q=$pdo->prepare('INSERT INTO client_reviews(client_id,rating,review_text) VALUES (?,?,?)');$q->execute([$actor,$rating,$text]);$id=(int)$pdo->lastInsertId();}
    }else{
        $rating=(int)$old['rating'];$text=$old['review_text'];
        $status=$action==='deleteReview'?'Deleted':enum_value($input['status']??null,['Published','Hidden','Rejected'],'moderation status');
        $reason=$action==='moderateReview'?optional_text($input,'reason',1000):null;
        if($old['status']===$status&&$old['moderation_reason']===$reason)return ['id'=>$id];
        $q=$pdo->prepare('UPDATE client_reviews SET status=?,moderation_reason=?,version=version+1 WHERE review_id=?');$q->execute([$status,$reason,$id]);
    }
    $q=$pdo->prepare('INSERT INTO review_history(review_id,actor_id,action,prior_status,new_status,rating,review_text,reason) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$id,$actor,$action,$old['status']??null,$status,$rating,$text,$reason]);
    $recipients=$action==='moderateReview'?[(int)$old['client_id']]:role_ids($pdo,['admin']);
    notify_users($pdo,array_diff($recipients,[$actor]),$action.':'.$id,$action==='moderateReview'?'Review '.strtolower($status):($action==='deleteReview'?'Client review withdrawn':'Client review awaiting moderation'),'Review #'.$id.' · '.$status,'Reviews',(string)$id);
    return ['id'=>$id];
}
