var assert = require('assert'),
    fs = require('fs'),
    dot = require('../src/graph/dotparser.js');

fs.readFile('test/dot.txt', function (err, data) {
    data = String(data);

    var graph = dot.parseDOT(data);

    assert.deepEqual(graph, {
        "type": "digraph",
        "id": "test_graph",
        "attr": {
            "rankdir": "LR",
            "size": "8,5",
            "font": "arial",
            "attr1": "another\" attr"
        },
        "nodes": {
            "6": {
                "id": "6",
                "attr": {
                    "shape": "circle"
                }
            },
            "node1": {
                "id": "node1",
                "attr": {
                    "shape": "doublecircle"
                }
            },
            "node2": {
                "id": "node2",
                "attr": {
                    "shape": "doublecircle"
                }
            },
            "node3": {
                "id": "node3",
                "attr": {
                    "shape": "doublecircle"
                }
            },
            "node4": {
                "id": "node4",
                "attr": {
                    "color": "red",
                    "shape": "circle"
                }
            },
            "node5": {
                "id": "node5",
                "attr": {
                    "color": "blue",
                    "shape": "circle",
                    "width": 3
                }
            }
        },
        "edges": [
            {
                "from": "node1",
                "to": "node1",
                "type": "->",
                "attr": {
                    "label": "a",
                    "length": 170,
                    "fontSize": 12
                }
            },
            {
                "from": "node2",
                "to": "node3",
                "type": "->",
                "attr": {
                    "label": "b",
                    "length": 170,
                    "fontSize": 12
                }
            },
            {
                "from": "node1",
                "to": "node4",
                "type": "--",
                "attr": {
                    "label": "c",
                    "length": 170,
                    "fontSize": 12
                }
            },
            {
                "from": "node3",
                "to": "node4",
                "type": "->",
                "attr": {
                    "label": "d",
                    "length": 170,
                    "fontSize": 12
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
                "to": "6",
                "type": "->",
                "attr": {
                    "length": 170,
                    "fontSize": 12
                }
            }
        ]
    });
});

