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

});
