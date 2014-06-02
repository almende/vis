<?php

/**
This file can read data from an external csv source and output the same
data in Google DataTable JSON format

Note that it supposes that each data column contains numbers 

*/

header('Content-type: text/plain');

// datasource url. This can be an external source
//$datasourceUrl = "http://demo.almende.com/links/graph3d/js/examples/datasource_csv.php";
$path = dirname("http://" . $_SERVER["SERVER_NAME"] . $_SERVER["REQUEST_URI"]) . '/';
$dataSourceUrl = $path . "datasource_csv.php";

$reqId = getReqId();
$data = file_get_contents($dataSourceUrl);


$rows = split("\n", $data);

// output the header part of the response
echo "google.visualization.Query.setResponse({
  version:'0.6',
  reqId:'$reqId',
  status:'ok',
  table:{
    cols:[
";

// output the column names
$cols = split(",", $rows[0]);
$colCount = count($cols);
$colFirst = true;
foreach($cols as $col) {
  if ($colFirst == true) 
    $colFirst = false;
  else 
    echo ",\n"; // end of previous label

  $colStr = trim(str_replace('"', '', $col)); // TODO: bad way to remove enclosing quotes

  echo "      {id:'$colStr', label:'$colStr', type:'number'}";
}

unset($rows[0]); // remove the first row with headers from the array

// output the part between cols and rows
echo "
    ],
    rows:[
";



// output the data
$firstRow = true;
foreach ($rows as $row) {
  $cols = split(",", $row);

  if (count($cols) == $colCount) {
    if ($firstRow == true) 
      $firstRow = false;
    else
      echo ",\n"; // end of previous line

    echo "      {c:[";  // start of the row

    $firstCol = true;
    foreach ($cols as $col) {
      if ($firstCol == true)
        $firstCol = false; 
      else
        echo ", ";  // end of previous value

      echo "{v:" . $col . "}";
    }

    echo "]}";  // end of the row
  }
}


// output the end part of the response
echo "      
    ]
  }
});
";



/**
 * Retrieve the request id from the get/post data
 * @return {number} $reqId       The request id, or 0 if not found
 */ 
function getReqId() {
  $reqId = 0;

  foreach ($_REQUEST as $req) {
    if (substr($req, 0,6) == "reqId:") {
      $reqId = substr($req, 6);
    }
  }

  return $reqId;
}



?>
