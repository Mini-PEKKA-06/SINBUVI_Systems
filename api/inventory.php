<?php
require_once __DIR__.'/common.php';
require_account();

$stmt = $pdo->query("
    SELECT
        product_id AS id,
        sku,
        product_name AS name,
        category,
        stock_quantity AS quantity,
        unit,
        price,
        minimum_stock AS minStock
    FROM products
    WHERE status = 'active'
    ORDER BY product_id
");

$inventory=$stmt->fetchAll();
if(is_admin()){
    $planning=inventory_planning($pdo);
    foreach($inventory as &$item)$item['planning']=$planning[(int)$item['id']]??null;
    unset($item);
}
echo json_encode([
    'success' => true,
    'inventory' => $inventory
]);
