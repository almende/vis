
var query = null;


function load() {
    selectDataType();

    loadCsvExample();
    loadJsonExample();
    loadJavascriptExample();
    loadGooglespreadsheetExample();
    loadDatasourceExample();

    draw();
}



/**
 * Upate the UI based on the currently selected datatype
 */
function selectDataType() {
    var datatype = getDataType();

    document.getElementById("csv").style.overflow = "hidden";
    document.getElementById("json").style.overflow = "hidden";
    document.getElementById("javascript").style.overflow = "hidden";
    document.getElementById("googlespreadsheet").style.overflow = "hidden";
    document.getElementById("datasource").style.overflow = "hidden";

    document.getElementById("csv").style.visibility               = (datatype == "csv") ? "" : "hidden";
    document.getElementById("json").style.visibility              = (datatype == "json") ? "" : "hidden";
    document.getElementById("javascript").style.visibility        = (datatype == "javascript") ? "" : "hidden";
    document.getElementById("googlespreadsheet").style.visibility = (datatype == "googlespreadsheet") ? "" : "hidden";
    document.getElementById("datasource").style.visibility        = (datatype == "datasource") ? "" : "hidden";

    document.getElementById("csv").style.height               = (datatype == "csv") ? "auto" : "0px";
    document.getElementById("json").style.height              = (datatype == "json") ? "auto" : "0px";
    document.getElementById("javascript").style.height        = (datatype == "javascript") ? "auto" : "0px";
    document.getElementById("googlespreadsheet").style.height = (datatype == "googlespreadsheet") ? "auto" : "0px";
    document.getElementById("datasource").style.height        = (datatype == "datasource") ? "auto" : "0px";
}


function round(value, decimals) {
    return parseFloat(value.toFixed(decimals));
}

function loadCsvExample() {
    var csv = "";

    // headers
    csv += '"x", "y", "value"\n';

    // create some nice looking data with sin/cos
    var steps = 30;
    var axisMax = 314;
    var axisStep = axisMax / steps;
    for (var x = 0; x < axisMax; x+=axisStep) {
        for (var y = 0; y < axisMax; y+=axisStep) {
            var value = Math.sin(x/50) * Math.cos(y/50) * 50 + 50;

            csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(value, 2) + '\n';
        }
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "surface";
    document.getElementById("verticalRatio").value = "0.5";
}


function loadCsvAnimationExample() {
    var csv = "";

    // headers
    csv += '"x", "y", "value", "time"\n';

    // create some nice looking data with sin/cos
    var steps = 20;
    var axisMax = 314;
    var tMax = 31;
    var axisStep = axisMax / steps;
    for (var t = 0; t < tMax; t++) {
        for (var x = 0; x < axisMax; x+=axisStep) {
            for (var y = 0; y < axisMax; y+=axisStep) {
                var value = Math.sin(x/50 + t/10) * Math.cos(y/50 + t/10) * 50 + 50;
                csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(value, 2) + ', ' + t + '\n';
            }
        }
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "surface";
    document.getElementById("verticalRatio").value = "0.5";
    document.getElementById("animationInterval").value = 100;

}


function loadCsvLineExample() {
    var csv = "";

    // headers
    csv += '"sin(t)", "cos(t)", "t"\n';

    // create some nice looking data with sin/cos
    var steps = 100;
    var axisMax = 314;
    var tmax = 4 * 2 * Math.PI;
    var axisStep = axisMax / steps;
    for (t = 0; t < tmax; t += tmax / steps) {
        var r = 1;
        var x = r * Math.sin(t);
        var y = r * Math.cos(t);
        var z = t;
        csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + '\n';
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "line";
    document.getElementById("verticalRatio").value = "1.0";
    document.getElementById("showPerspective").checked = false;
}

function loadCsvMovingDotsExample() {
    var csv = "";

    // headers
    csv += '"x", "y", "z", "color value", "time"\n';

    // create some shortcuts to math functions
    var sin = Math.sin;
    var cos = Math.cos;
    var pi = Math.PI;

    // create the animation data
    var tmax = 2.0 * pi;
    var tstep = tmax / 75;
    var dotCount = 1;  // set this to 1, 2, 3, 4, ...
    for (var t = 0; t < tmax; t += tstep) {
        var tgroup = parseFloat(t.toFixed(2));
        var value = t;

        // a dot in the center
        var x = 0;
        var y = 0;
        var z = 0;
        csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

        // one or multiple dots moving around the center
        for (var dot = 0; dot < dotCount; dot++) {
            var tdot = t + 2*pi * dot / dotCount;
            //data.addRow([sin(tdot),  cos(tdot), sin(tdot), value, tgroup]);
            //data.addRow([sin(tdot), -cos(tdot), sin(tdot + tmax*1/2), value, tgroup]);

            var x = sin(tdot);
            var y = cos(tdot);
            var z = sin(tdot);
            csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

            var x = sin(tdot);
            var y = -cos(tdot);
            var z = sin(tdot + tmax*1/2);
            csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

        }
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "dot-color";
    document.getElementById("verticalRatio").value = "1.0";
    document.getElementById("animationInterval").value = "35";
    document.getElementById("animationAutoStart").checked = true;
    document.getElementById("showPerspective").checked = true;
}

function loadCsvColoredDotsExample() {
    var csv = "";

    // headers
    csv += '"x", "y", "z", "distance"\n';

    // create some shortcuts to math functions
    var sqrt = Math.sqrt;
    var pow = Math.pow;
    var random = Math.random;

    // create the animation data
    var imax = 200;
    for (var i = 0; i < imax; i++) {
        var x = pow(random(), 2);
        var y = pow(random(), 2);
        var z = pow(random(), 2);
        var dist = sqrt(pow(x, 2) + pow(y, 2) + pow(z, 2));

        csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2)  + ', ' + round(dist, 2)+ '\n';
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "dot-color";
    document.getElementById("verticalRatio").value = "1.0";
    document.getElementById("showPerspective").checked = true;
}

function loadCsvSizedDotsExample() {
    var csv = "";

    // headers
    csv += '"x", "y", "z", "range"\n';

    // create some shortcuts to math functions
    var sqrt = Math.sqrt;
    var pow = Math.pow;
    var random = Math.random;

    // create the animation data
    var imax = 200;
    for (var i = 0; i < imax; i++) {
        var x = pow(random(), 2);
        var y = pow(random(), 2);
        var z = pow(random(), 2);
        var dist = sqrt(pow(x, 2) + pow(y, 2) + pow(z, 2));
        var range = sqrt(2) - dist;

        csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2)  + ', ' + round(range, 2)+ '\n';
    }

    document.getElementById("csvTextarea").innerHTML = csv;

    // also adjust some settings
    document.getElementById("style").value = "dot-size";
    document.getElementById("verticalRatio").value = "1.0";
    document.getElementById("showPerspective").checked = true;
}


function loadJsonExample() {
    var json = "";
    // TODO: get json working

    // headers
    json +=
        '{\n' +
        '  "cols":[\n' +
        '    {"id":"x",\n' +
        '     "label":"x",\n' +
        '     "type":"number"},\n' +
        '    {"id":"y",\n' +
        '     "label":"y",\n' +
        '     "type":"number"},\n' +
        '    {"id":"value",\n' +
        '     "label":"value",\n' +
        '     "type":"number"}\n' +
        '  ],\n' +
        '  "rows":[';

    // create some nice looking data with sin/cos
    var steps = 20;
    var axisMax = 314;
    var first = true;
    var axisStep = axisMax / steps;
    for (var x = 0; x < axisMax; x+=axisStep) {
        for (var y = 0; y < axisMax; y+=axisStep) {
            var value = Math.sin(x/50) * Math.cos(y/50) * 50 + 50;
            if (first) {
                json += '\n';
                first = false;
            }
            else {
                json += ',\n';
            }

            json += '    {"c":[{"v":' + round(x, 2) + '}, {"v":' + round(y, 2) + '}, {"v":' + round(value, 2) + '}]}';
        }
    }

    // end of the table
    json +=
        '\n' +
        '  ]\n' +
        '}\n';

    document.getElementById("jsonTextarea").innerHTML = json;

    document.getElementById("verticalRatio").value = "0.5";
}


function loadJavascriptExample() {
    var js =
        'data = new google.visualization.DataTable();\n' +
        'data.addColumn("number", "x");\n' +
        'data.addColumn("number", "y");\n' +
        'data.addColumn("number", "value");\n' +
        '\n';

    js += '// insert data\n';

    var axisStep = 7;
    for (var x = -100; x < 100; x += axisStep) {
        for (var y = -100; y < 300; y += axisStep) {
            //var value = Math.sin(x/50) * Math.cos(y/50) * 50 + 50;

            var d = Math.sqrt(Math.pow(x/100, 2) + Math.pow(y/100, 2));
            var value = 50 * Math.exp(-5 * d / 10) * Math.sin(d*5)

            js += 'data.addRow([' + round(x, 2) + ', ' + round(y,2) + ', ' + round(value, 2) + ']);\n';
        }
    }

    document.getElementById("javascriptTextarea").innerHTML = js;

    document.getElementById("verticalRatio").value = "0.5";
}

function loadJavascriptFunctionExample() {
    var js =
        'data = new google.visualization.DataTable();\n' +
        'data.addColumn("number", "x");\n' +
        'data.addColumn("number", "y");\n' +
        'data.addColumn("number", "value");\n' +
        '\n' +
        '// create some nice looking data with sin/cos\n' +
        'var steps = 50;\n' +
        'var axisMax = 314;\n' +
        'axisStep = axisMax / steps;\n' +
        'for (var x = 0; x < axisMax; x+=axisStep) {\n' +
        '  for (var y = 0; y < axisMax; y+=axisStep) {\n' +
        '    var value = Math.sin(x/50) * Math.cos(y/50) * 50 + 50;\n' +
        '    data.addRow([x, y, value]);\n' +
        '  }\n' +
        '}';

    document.getElementById("javascriptTextarea").innerHTML = js;

    document.getElementById("verticalRatio").value = "0.5";
}

function loadGooglespreadsheetExample() {
    var url =
        "https://spreadsheets.google.com/a/almende.org/ccc?key=tJ6gaeq2Ldy82VVMr5dPQoA&hl=en#gid=0";

    document.getElementById("googlespreadsheetText").value = url;

    document.getElementById("verticalRatio").value = "0.5";
}


function loadDatasourceExample() {
    var url = "datasource.php";

    document.getElementById("datasourceText").value = url;

    document.getElementById("verticalRatio").value = "0.5";
}



/**
 * Retrieve teh currently selected datatype
 * @return {string} datatype
 */
function getDataType() {
    if (document.getElementById("datatypeCsv").checked) return "csv";
    if (document.getElementById("datatypeJson").checked) return "json";
    if (document.getElementById("datatypeJavascript").checked) return "javascript";
    if (document.getElementById("datatypeDatasource").checked) return "datasource";
    if (document.getElementById("datatypeGooglespreadsheet").checked) return "googlespreadsheet";
}


/**
 * Retrieve the datatable from the entered contents of the csv text
 * @return {Google DataTable}
 */
function getDataCsv() {
    var csv = document.getElementById("csvTextarea").value;

    // parse the csv content
    var csvArray = csv2array(csv);

    // the first line of the csv file contains the column names
    var data = new google.visualization.DataTable();
    var columnTypes = [];
    var row = 0;
    for (var col = 0; col < csvArray[row].length; col++) {
        var label = csvArray[row][col];
        var columnType = "number";

        if (col >= 4) {
            if (csvArray.length > 1) {
                var value = csvArray[1][3];
                if (value) {
                    columnType = typeof(value);
                }
            }
            else {
                columnType = "string";
            }
        }
        columnTypes[col] = columnType;

        data.addColumn(columnType, label);
    }

    // read all data
    var colCount = data.getNumberOfColumns();
    for (var row = 1; row < csvArray.length; row++) {
        var rowData = csvArray[row];
        if (rowData.length == colCount) {
            data.addRow();

            for (var col = 0; col < csvArray[row].length; col++) {
                if (columnTypes[col] == 'number') {
                    var value = parseFloat(csvArray[row][col]);
                }
                else {
                    var value = trim(csvArray[row][col]);
                }
                //alert(value)
                data.setValue(row-1, col, value);
            }
        }
    }

    return data;
}

/**
 * remove leading and trailing spaces
 */
function trim(text) {
    while (text.length && text.charAt(0) == ' ')
        text = text.substr(1);

    while (text.length && text.charAt(text.length-1) == ' ')
        text = text.substr(0, text.length-1);

    return text;
}

/**
 * Retrieve the datatable from the entered contents of the javascript text
 * @return {Google DataTable}
 */
function getDataJson() {
    var json = document.getElementById("jsonTextarea").value;
    var data = new google.visualization.DataTable(json);

    return data;
}


/**
 * Retrieve the datatable from the entered contents of the javascript text
 * @return {Google DataTable}
 */
function getDataJavascript() {
    var js = document.getElementById("javascriptTextarea").value;

    eval(js);

    return data;
}


/**
 * Retrieve the datatable from the entered contents of the datasource text
 * @return {Google DataTable}
 */
function getDataDatasource() {
    // TODO

    throw "Sorry, datasource is not yet implemented...";
}

/**
 * Retrieve a JSON object with all options
 */
function getOptions() {
    return {
        width:              document.getElementById("width").value,
        height:             document.getElementById("height").value,
        style:              document.getElementById("style").value,
        showAnimationControls: (document.getElementById("showAnimationControls").checked != false),
        showGrid:          (document.getElementById("showGrid").checked != false),
        showPerspective:   (document.getElementById("showPerspective").checked != false),
        showShadow:        (document.getElementById("showShadow").checked != false),
        keepAspectRatio:   (document.getElementById("keepAspectRatio").checked != false),
        verticalRatio:      document.getElementById("verticalRatio").value,
        animationInterval:  document.getElementById("animationInterval").value,
        animationPreload:  (document.getElementById("animationPreload").checked != false),
        animationAutoStart:(document.getElementById("animationAutoStart").checked != false),

        xCenter:           Number(document.getElementById("xCenter").value) || undefined,
        yCenter:           Number(document.getElementById("yCenter").value) || undefined,

        xMin:              Number(document.getElementById("xMin").value) || undefined,
        xMax:              Number(document.getElementById("xMax").value) || undefined,
        xStep:             Number(document.getElementById("xStep").value) || undefined,
        yMin:              Number(document.getElementById("yMin").value) || undefined,
        yMax:              Number(document.getElementById("yMax").value) || undefined,
        yStep:             Number(document.getElementById("yStep").value) || undefined,
        zMin:              Number(document.getElementById("zMin").value) || undefined,
        zMax:              Number(document.getElementById("zMax").value) || undefined,
        zStep:             Number(document.getElementById("zStep").value) || undefined,

        valueMin:          Number(document.getElementById("valueMin").value) || undefined,
        valueMax:          Number(document.getElementById("valueMax").value) || undefined,

        xBarWidth:         Number(document.getElementById("xBarWidth").value) || undefined,
        yBarWidth:         Number(document.getElementById("yBarWidth").value) || undefined
    };
}

/**
 * Redraw the graph with the entered data and options
 */
function draw() {
    try {
        var datatype = getDataType();

        switch (datatype) {
            case "csv":               return drawCsv();
            case "json":              return drawJson();
            case "javascript":        return drawJavascript();
            case "googlespreadsheet": return drawGooglespreadsheet();
            case "datasource":        return drawDatasource();
            default:                  throw "Error: no data type specified";
        }
    }
    catch (error) {
        document.getElementById('graph').innerHTML =
            "<span style='color: red; font-weight: bold;'>" + error + "</span>";
    }
}

function drawCsv() {
    // Instantiate our graph object.
    var graph = new links.Graph3d(document.getElementById('graph'));

    // retrieve data and options
    var data = getDataCsv();
    var options = getOptions();

    // Draw our graph with the created data and options
    graph.draw(data, options);
}

function drawJson() {
    // Instantiate our graph object.
    var graph = new links.Graph3d(document.getElementById('graph'));

    // retrieve data and options
    var data = getDataJson();
    var options = getOptions();

    // Draw our graph with the created data and options
    graph.draw(data, options);
}

function drawJavascript() {
    // Instantiate our graph object.
    var graph = new links.Graph3d(document.getElementById('graph'));

    // retrieve data and options
    var data = getDataJavascript();
    var options = getOptions();

    // Draw our graph with the created data and options
    graph.draw(data, options);
}


function drawGooglespreadsheet() {
    // Instantiate our graph object.
    drawGraph = function(response) {
        document.getElementById("draw").disabled = "";

        if (response.isError()) {
            error = 'Error: ' + response.getMessage();
            document.getElementById('graph').innerHTML =
                "<span style='color: red; font-weight: bold;'>" + error + "</span>"; ;
        }

        // retrieve the data from the query response
        data = response.getDataTable();

        // specify options
        options = getOptions();

        // Instantiate our graph object.
        var graph = new links.Graph3d(document.getElementById('graph'));

        // Draw our graph with the created data and options
        graph.draw(data, options);
    }

    url = document.getElementById("googlespreadsheetText").value;
    document.getElementById("draw").disabled = "disabled";

    // send the request
    query && query.abort();
    query = new google.visualization.Query(url);
    query.send(drawGraph);
}


function drawDatasource() {
    // Instantiate our graph object.
    drawGraph = function(response) {
        document.getElementById("draw").disabled = "";

        if (response.isError()) {
            error = 'Error: ' + response.getMessage();
            document.getElementById('graph').innerHTML =
                "<span style='color: red; font-weight: bold;'>" + error + "</span>"; ;
        }

        // retrieve the data from the query response
        data = response.getDataTable();

        // specify options
        options = getOptions();

        // Instantiate our graph object.
        var graph = new links.Graph3d(document.getElementById('graph'));

        // Draw our graph with the created data and options
        graph.draw(data, options);
    };

    url = document.getElementById("datasourceText").value;
    document.getElementById("draw").disabled = "disabled";

    // if the entered url is a google spreadsheet url, replace the part
    // "/ccc?" with "/tq?" in order to retrieve a neat data query result
    if (url.indexOf("/ccc?")) {
        url.replace("/ccc?", "/tq?");
    }

    // send the request
    query && query.abort();
    query = new google.visualization.Query(url);
    query.send(drawGraph);
}
