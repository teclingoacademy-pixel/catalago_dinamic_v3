<?php
// proxy.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/pdf');

if (isset($_GET['id'])) {
    $fileId = $_GET['id'];
    $url = "https://drive.google.com/uc?export=download&id=" . $fileId;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $data = curl_exec($ch);
    curl_close($ch);
    
    echo $data;
} else {
    echo "Falta el ID";
}
?>