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
                "id": "B"
            },
            {
                "id": "C"
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
                    "type": "subgraph",
                    "nodes": [
                        {
                            "id": "B"
                        },
                        {
                            "id": "C"
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
        "subgraphs" : [
            {
                "type": "subgraph",
                "nodes": [
                    {
                        "id": "B"
                    },
                    {
                        "id": "C"
                    }
                ]
            }
        ]
    });
});

