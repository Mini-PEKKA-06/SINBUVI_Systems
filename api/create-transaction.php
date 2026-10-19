<?php
require_once __DIR__.'/actions.php';
$input=input_json();dispatch_action('createTransaction',$input);
