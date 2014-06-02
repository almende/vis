<?php

header('Content-type: text/plain');

// initialize flushing without buffer
@apache_setenv('no-gzip', 1);
@ini_set('zlib.output_compression', 0);
@ini_set('implicit_flush', 1);
for ($i = 0; $i < ob_get_level(); $i++) { ob_end_flush(); }
ob_implicit_flush(1);
ob_start();

// create labels once?
//echo '"id", "x", "y", "z", "Color"' . "\n";

while (true) {
  // retrieve current time
  $time = time();
  $hour = date('h', $time) * 1;
  $min = date('i', $time) * 1;
  $sec = date('s', $time) * 1;

  $secAngle = $sec / 60.0 * 2.0*pi();
  $minAngle = ($min + $sec/60.0) / 60.0 * 2.0*pi();
  $hourAngle = ($hour + $min / 60.0 + $sec/60.0/60.0) / 12.0 * 2.0*pi();

  $id = 0;

  // create circle as clock
  for ($h = 0; $h < 12; $h += 1) {
    $r = $h / 12 * 2 * pi();
    echo 
      $id . ', ' .
      round(sin($r), 2) . ', ' .  
      round(cos($r), 2) . ', ' .  
      0 . ', ' . 
      0 . "\n";
    $id++;
  }
  echo "$id, 0, 0, 0, 0\n";
  $id++;

  // create hour, minute, second pointers
  for ($r = 0.1; $r < 0.4; $r += 0.1) {
    echo 
      $id . ', ' .
      round($r * sin($hourAngle), 2) . ', ' .  
      round($r * cos($hourAngle), 2) . ', ' .  
      0 .  ', ' . 
      2.5 . "\n";
    $id++;
  }
  for ($r = 0.1; $r < 0.7; $r += 0.1) {
    echo 
      $id . ', ' .
      round($r * sin($minAngle), 2) . ', ' .  
      round($r * cos($minAngle), 2) . ', ' .  
      0 .  ', ' . 
      1.5 . "\n";
    $id++;
  }
  for ($r = 0.1; $r < 0.9; $r += 0.1) {
    echo 
      $id . ', ' .
      round($r * sin($secAngle), 2) . ', ' .  
      round($r * cos($secAngle), 2) . ', ' .  
      0 .  ', ' . 
      3 . "\n";
    $id++;
  }

  // flush, send the new output to the client now
  ob_flush();
  flush();

  sleep(1);
}

?>
