var assert = require('assert'),
    fs = require('fs'),
    dot = require('../lib/network/dotparser.js');

describe('dotparser', function () {

  it('should parse a DOT file into JSON', function (done) {
    fs.readFile('test/dot.txt', function (err, data) {
      data = String(data);

      var graph = dot.parseDOT(data);

      assert.deepEqual(graph, {
        "type": "digraph",
        "id": "test_graph",
        "rankdir": "LR",
        "size": "8,5",
        "font": "arial",
        "nodes": [
          {
            "id": "node1",
            "attr": {
              "shape": "doublecircle"
            }
          },
          {
            "id": "node2",
            "attr": {
              "shape": "doublecircle"
            }
          },
          {
            "id": "node3",
            "attr": {
              "shape": "doublecircle"
            }
          },
          {
            "id": "node4",
            "attr": {
              "shape": "diamond",
              "color": "red"
            }
          },
          {
            "id": "node5",
            "attr": {
              "shape": "square",
              "color": "blue",
              "width": 3
            }
          },
          {
            "id": 6,
            "attr": {
              "shape": "circle"
            }
          },
          {
            "id": "A",
            "attr": {
              "shape": "circle"
            }
          },
          {
            "id": "B",
            "attr": {
              "shape": "circle"
            }
          },
          {
            "id": "C",
            "attr": {
              "shape": "circle"
            }
          }
        ],
        "edges": [
          {
            "from": "node1",
            "to": "node1",
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12,
              "label": "a"
            }
          },
          {
            "from": "node2",
            "to": "node3",
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12,
              "label": "b"
            }
          },
          {
            "from": "node1",
            "to": "node4",
            "type": "--",
            "attr": {
              "length": 170,
              "fontSize": 12,
              "label": "c"
            }
          },
          {
            "from": "node3",
            "to": "node4",
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12,
              "label": "d"
            }
          },
          {
            "from": "node4",
            "to": "node5",
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12
            }
          },
          {
            "from": "node5",
            "to": 6,
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12
            }
          },
          {
            "from": "A",
            "to": {
              "nodes": [
                {
                  "id": "B",
                  "attr": {
                    "shape": "circle"
                  }
                },
                {
                  "id": "C",
                  "attr": {
                    "shape": "circle"
                  }
                }
              ]
            },
            "type": "->",
            "attr": {
              "length": 170,
              "fontSize": 12
            }
          }
        ],
        "subgraphs": [
          {
            "nodes": [
              {
                "id": "B",
                "attr": {
                  "shape": "circle"
                }
              },
              {
                "id": "C",
                "attr": {
                  "shape": "circle"
                }
              }
            ]
          }
        ]
      });

      done();
    });
  });


  /**
   * DOT-format examples taken from #3015
   */
  it('properly handles newline escape sequences in strings', function (done) {
		var data = 'dinetwork {1 [label="new\\nline"];}';

    data = String(data);

    var graph = dot.parseDOT(data);

    assert.deepEqual(graph, {
      "id": "dinetwork",
      "nodes": [
        {
          "id": 1,
          "attr": {
            "label": "new\nline",         // And not "new\\nline"
          }
        }
      ]
    });


    // Note the double backslashes
		var data2 = 'digraph {' + "\n" +
'	3 [color="#0d2b7c", label="query:1230:add_q\\n0.005283\\n6.83%\\n(0.0001)\\n(0.13%)\\n17×"];' + "\n" +
'	3 -> 7 [color="#0d2a7b", fontcolor="#0d2a7b", label="0.005128\\n6.63%\\n17×"];' + "\n" +
'	5 [color="#0d1976", label="urlresolvers:537:reverse\\n0.00219\\n2.83%\\n(0.000193)\\n(0.25%)\\n29×"];' + "\n" +
"}"

    data2 = String(data2);

    var graph2 = dot.parseDOT(data2);
    //console.log(JSON.stringify(graph, null, 2));

    assert.deepEqual(graph2, {
      "type": "digraph",
      "nodes": [
        {
          "id": 3,
          "attr": {
            "color": "#0d2b7c",
            "label": "query:1230:add_q\n0.005283\n6.83%\n(0.0001)\n(0.13%)\n17×"
          }
        },
        {
          "id": 7
        },
        {
          "id": 5,
          "attr": {
            "color": "#0d1976",
            "label": "urlresolvers:537:reverse\n0.00219\n2.83%\n(0.000193)\n(0.25%)\n29×"
          }
        }
      ],
      "edges": [
        {
          "from": 3,
          "to": 7,
          "type": "->",
          "attr": {
            "color": "#0d2a7b",
            "fontcolor": "#0d2a7b",
            "label": "0.005128\n6.63%\n17×"
          }
        }
      ]
    });

    done();
  });

});
