<?php

header('Content-type: text/plain');

// retrieve current time
$time = time();
$hour = date('h', $time) * 1;
$min = date('i', $time) * 1;
$sec = date('s', $time) * 1;

$secAngle = $sec / 60.0 * 2.0*pi();
$minAngle = ($min + $sec/60.0) / 60.0 * 2.0*pi();
$hourAngle = ($hour + $min / 60.0 + $sec/60.0/60.0) / 12.0 * 2.0*pi();


// create labels 
echo '"x", "y", "z", "' . date('H:i:s', $time) . '"' . "\n";

// create circle as clock
for ($h = 0; $h < 12; $h += 1) {
  $r = $h / 12 * 2 * pi();
  echo 
    round(sin($r), 2) . ', ' .  
    round(cos($r), 2) . ', ' .  
    0 . ', ' . 
    0 . "\n";
}
echo "0, 0, 0, 0\n";


// create hour, minute, second pointers
for ($r = 0.1; $r < 0.4; $r += 0.1) {
  echo 
    round($r * sin($hourAngle), 2) . ', ' .  
    round($r * cos($hourAngle), 2) . ', ' .  
    0 .  ', ' . 
    2.5 . "\n";
}
for ($r = 0.1; $r < 0.7; $r += 0.1) {
  echo 
    round($r * sin($minAngle), 2) . ', ' .  
    round($r * cos($minAngle), 2) . ', ' .  
    0 .  ', ' . 
    1.5 . "\n";
}
for ($r = 0.1; $r < 0.9; $r += 0.1) {
  echo 
    round($r * sin($secAngle), 2) . ', ' .  
    round($r * cos($secAngle), 2) . ', ' .  
    0 .  ', ' . 
    3 . "\n";
}

?>
