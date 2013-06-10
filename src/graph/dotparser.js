(function(exports) {
    /**
     * Parse a text source containing data in DOT language into a JSON object.
     * The object contains two lists: one with nodes and one with edges.
     *
     * DOT language reference: http://www.graphviz.org/doc/info/lang.html
     *
     * @param {String} data     Text containing a graph in DOT-notation
     * @return {Object} graph   An object containing two parameters:
     *                          {Object[]} nodes
     *                          {Object[]} edges
     */
    function parseDOT (data) {
        dot = data;
        return parseGraph();
    }

    // token types enumeration
    var TOKENTYPE = {
        NULL : 0,
        DELIMITER : 1,
        IDENTIFIER: 2,
        UNKNOWN : 3
    };

    // map with all delimiters
    var DELIMITERS = {
        '{': true,
        '}': true,
        '[': true,
        ']': true,
        ';': true,
        '=': true,
        ',': true,

        '->': true,
        '--': true
    };

    var dot = '';                   // current dot file
    var index = 0;                  // current index in dot file
    var c = '';                     // current token character in expr
    var token = '';                 // current token
    var tokenType = TOKENTYPE.NULL; // type of the token

    /**
     * Get the first character from the dot file.
     * The character is stored into the char c. If the end of the dot file is
     * reached, the function puts an empty string in c.
     */
    function first() {
        index = 0;
        c = dot.charAt(0);
    }

    /**
     * Get the next character from the dot file.
     * The character is stored into the char c. If the end of the dot file is
     * reached, the function puts an empty string in c.
     */
    function next() {
        index++;
        c = dot.charAt(index);
    }

    /**
     * Preview the next character from the dot file.
     * @return {String} cNext
     */
    function nextPreview() {
        return dot.charAt(index + 1);
    }

    /**
     * Test whether given character is alphabetic or numeric
     * @param {String} c
     * @return {Boolean} isAlphaNumeric
     */
    var regexAlphaNumeric = /[a-zA-Z_0-9.#]/;
    function isAlphaNumeric(c) {
        return regexAlphaNumeric.test(c);
    }

    /**
     * Merge all properties of object b into object b
     * @param {Object} a
     * @param {Object} b
     * @return {Object} a
     */
    function merge (a, b) {
        if (!a) {
            a = {};
        }

        if (b) {
            for (var name in b) {
                if (b.hasOwnProperty(name)) {
                    a[name] = b[name];
                }
            }
        }
        return a;
    }

    /**
     * Set a value in an object, where the provided parameter name can be a
     * path with nested parameters. For example:
     *
     *     var obj = {a: 2};
     *     setValue(obj, 'b.c', 3);     // obj = {a: 2, b: {c: 3}}
     *
     * @param {Object} obj
     * @param {String} path  A parameter name or dot-separated parameter path,
     *                      like "color.highlight.border".
     * @param {*} value
     */
    function setValue(obj, path, value) {
        var keys = path.split('.');
        var o = obj;
        while (keys.length) {
            var key = keys.shift();
            if (keys.length) {
                // this isn't the end point
                if (!o[key]) {
                    o[key] = {};
                }
                o = o[key];
            }
            else {
                // this is the end point
                o[key] = value;
            }
        }
    }

    /**
     * Add a node to a graph object. If there is already a node with
     * the same id, their attributes will be merged.
     * @param {Object} graph
     * @param {Object} node
     */
    function addNode(graph, node) {
        var nodes = graph.nodes;
        if (!nodes) {
            nodes = [];
            graph.nodes = nodes;
        }

        // find existing node
        var current = null;
        for (var i = 0, len = nodes.length; i < len; i++) {
            if (node.id === nodes[i].id) {
                current = nodes[i];
                break;
            }
        }

        if (current) {
            // merge attributes
            if (node.attr) {
                current.attr = merge(current.attr, node.attr);
            }
        }
        else {
            // add
            graph.nodes.push(node);
            if (graph.node) {
                var attr = merge({}, graph.node);   // clone global attributes
                node.attr = merge(attr, node.attr); // merge attributes
            }
        }
    }

    /**
     * Add an edge to a graph object
     * @param {Object} graph
     * @param {Object} edge
     */
    function addEdge(graph, edge) {
        if (!graph.edges) {
            graph.edges = [];
        }
        graph.edges.push(edge);
        if (graph.edge) {
            var attr = merge({}, graph.edge);     // clone global attributes
            edge.attr = merge(attr, edge.attr); // merge attributes
        }
    }

    /**
     * Get next token in the current dot file.
     * The token and token type are available as token and tokenType
     */
    function getToken() {
        tokenType = TOKENTYPE.NULL;
        token = '';

        // skip over whitespaces
        while (c == ' ' || c == '\t' || c == '\n' || c == '\r') {  // space, tab, enter
            next();
        }

        do {
            var isComment = false;

            // skip comment
            if (c == '#') {
                // find the previous non-space character
                var i = index - 1;
                while (dot.charAt(i) == ' ' || dot.charAt(i) == '\t') {
                    i--;
                }
                if (dot.charAt(i) == '\n' || dot.charAt(i) == '') {
                    // the # is at the start of a line, this is indeed a line comment
                    while (c != '' && c != '\n') {
                        next();
                    }
                    isComment = true;
                }
            }
            if (c == '/' && nextPreview() == '/') {
                // skip line comment
                while (c != '' && c != '\n') {
                    next();
                }
                isComment = true;
            }
            if (c == '/' && nextPreview() == '*') {
                // skip block comment
                while (c != '') {
                    if (c == '*' && nextPreview() == '/') {
                        // end of block comment found. skip these last two characters
                        next();
                        next();
                        break;
                    }
                    else {
                        next();
                    }
                }
                isComment = true;
            }

            // skip over whitespaces
            while (c == ' ' || c == '\t' || c == '\n' || c == '\r') {  // space, tab, enter
                next();
            }
        }
        while (isComment);

        // check for end of dot file
        if (c == '') {
            // token is still empty
            tokenType = TOKENTYPE.DELIMITER;
            return;
        }

        // check for delimiters consisting of 2 characters
        var c2 = c + nextPreview();
        if (DELIMITERS[c2]) {
            tokenType = TOKENTYPE.DELIMITER;
            token = c2;
            next();
            next();
            return;
        }

        // check for delimiters consisting of 1 character
        if (DELIMITERS[c]) {
            tokenType = TOKENTYPE.DELIMITER;
            token = c;
            next();
            return;
        }

        // check for an identifier (number or string)
        // TODO: more precise parsing of numbers/strings
        if (isAlphaNumeric(c) || c == '-') {
            token += c;
            next();

            while (isAlphaNumeric(c)) {
                token += c;
                next();
            }
            if (token == 'false') {
                token = false;   // cast to boolean
            }
            else if (token == 'true') {
                token = true;   // cast to boolean
            }
            else if (!isNaN(Number(token))) {
                token = Number(token); // cast to number
            }
            tokenType = TOKENTYPE.IDENTIFIER;
            return;
        }

        // check for a string enclosed by double quotes
        if (c == '"') {
            next();
            while (c != '' && (c != '"' || (c == '"' && nextPreview() == '"'))) {
                token += c;
                if (c == '"') { // skip the escape character
                    next();
                }
                next();
            }
            if (c != '"') {
                throw newSyntaxError('End of string " expected');
            }
            next();
            tokenType = TOKENTYPE.IDENTIFIER;
            return;
        }

        // something unknown is found, wrong characters, a syntax error
        tokenType = TOKENTYPE.UNKNOWN;
        while (c != '') {
            token += c;
            next();
        }
        throw new SyntaxError('Syntax error in part "' + chop(token, 30) + '"');
    }

    /**
     * Parse a graph.
     * @returns {Object} graph
     */
    function parseGraph() {
        var graph = {};

        first();
        getToken();

        // optional strict keyword
        if (token == 'strict') {
            graph.strict = true;
            getToken();
        }

        // graph or digraph keyword
        if (token == 'graph' || token == 'digraph') {
            graph.type = token;
            getToken();
        }

        // graph id
        if (tokenType == TOKENTYPE.IDENTIFIER) {
            graph.id = token;
            getToken();
        }

        // open angle bracket
        if (token != '{') {
            throw newSyntaxError('Angle bracket { expected');
        }
        getToken();

        // statements
        parseStatements(graph);

        // close angle bracket
        if (token != '}') {
            throw newSyntaxError('Angle bracket } expected');
        }
        getToken();

        // end of file
        if (token !== '') {
            throw newSyntaxError('End of file expected');
        }
        getToken();

        // remove temporary global properties
        delete graph.node;
        delete graph.edge;

        return graph;
    }

    /**
     * Parse a list with statements.
     * @param {Object} graph
     */
    function parseStatements (graph) {
        while (token !== '' && token != '}') {
            if (tokenType != TOKENTYPE.IDENTIFIER) {
                throw newSyntaxError('Identifier expected');
            }

            parseStatement(graph);
            if (token == ';') {
                getToken();
            }
        }
    }

    /**
     * Parse a single statement. Can be a an attribute statement, node
     * statement, a series of node statements and edge statements, or a
     * parameter.
     * @param {Object} graph
     */
    function parseStatement(graph) {
        // TODO: parse subgraph

        // parse an attribute statement
        var attr = parseAttributeStatement(graph);
        if (attr) {
            return;
        }

        // parse node
        var id = token; // id can be a string or a number
        getToken();

        if (token == '=') {
            // id statement
            getToken();
            graph[id] = token;
            getToken();
        }
        else {
            parseNodeStatement(graph, id);
        }
    }

    /**
     * parse an attribute statement like "node [shape=circle fontSize=16]".
     * Available keywords are 'node', 'edge', 'graph'
     * @param {Object} graph
     * @returns {Object | null} attr
     */
    function parseAttributeStatement (graph) {
        var attr = null;

        // attribute statements
        if (token == 'node') {
            getToken();

            // node attributes
            attr = parseAttributeList();
            if (attr) {
                graph.node = merge(graph.node, attr);
            }
        }
        else if (token == 'edge') {
            getToken();

            // edge attributes
            attr = parseAttributeList();
            if (attr) {
                graph.edge = merge(graph.edge, attr);
            }
        }
        else if (token == 'graph') {
            getToken();

            // graph attributes
            attr = parseAttributeList();
            if (attr) {
                graph.attr = merge(graph.attr, attr);
            }
        }

        return attr;
    }

    /**
     * parse a node statement
     * @param {Object} graph
     * @param {String | Number} id
     */
    function parseNodeStatement(graph, id) {
        // node statement
        var node = {
            id: id
        };
        var attr = parseAttributeList();
        if (attr) {
            node.attr = attr;
        }
        addNode(graph, node);

        // edge statements
        parseEdge(graph, id);
    }

    /**
     * Parse an edge or a series of edges
     * @param {Object} graph
     * @param {String | Number} from        Id of the from node
     */
    function parseEdge(graph, from) {
        while (token == '->' || token == '--') {
            var type = token;
            getToken();

            if (token == '{') {
                // parse a set of nodes, like "node1 -> {node2, node3}"
                parseEdgeSet(graph, from, type);
                break;
            }
            else {
                // parse a single edge, like "node1 -> node2 -> node3"
                var to = token;
                addNode(graph, {
                    id: to
                });
                getToken();
                var attr = parseAttributeList();

                // create edge
                var edge = {
                    from: from,
                    to: to,
                    type: type
                };
                if (attr) {
                    edge.attr = attr;
                }
                addEdge(graph, edge);

                from = to;
            }
        }
    }

    /**
     * Parse a set of nodes, like "{node1; node2; node3}"
     * @param {Object} graph
     * @param {String | Number} from    Id of the from node
     * @param {String} type             Edge type, '--' or '->'
     * @return {Node[] | null} nodes
     */
    function parseEdgeSet(graph, from, type) {
        var nodes = null;

        if (token == '{') {
            getToken();

            while (token !== '' && token != '}') {
                // create to node
                if (tokenType != TOKENTYPE.IDENTIFIER) {
                    throw newSyntaxError('Identifier expected');
                }
                var to = token;
                addNode(graph, {
                    id: to
                });
                getToken();

                // create edge
                var edge = {
                    from: from,
                    to: to,
                    type: type
                };
                var attr = parseAttributeList();
                if (attr) {
                    edge.attr = attr;
                }
                addEdge(graph, edge);

                // separator
                if (token == ';') {
                    getToken();
                }
            }

            // closing bracket
            if (token != '}') {
                throw newSyntaxError('bracket } expected');
            }
            getToken();
        }

        return nodes;
    }

    /**
     * Parse a set with attributes,
     * for example [label="1.000", shape=solid]
     * @return {Object | null} attr
     */
    function parseAttributeList() {
        var attr = null;

        while (token == '[') {
            getToken();
            attr = {};
            while (token !== '' && token != ']') {
                if (tokenType != TOKENTYPE.IDENTIFIER) {
                    throw newSyntaxError('Attribute name expected');
                }
                var name = token;

                getToken();
                if (token != '=') {
                    throw newSyntaxError('Equal sign = expected');
                }
                getToken();

                if (tokenType != TOKENTYPE.IDENTIFIER) {
                    throw newSyntaxError('Attribute value expected');
                }
                var value = token;
                setValue(attr, name, value); // name can be a path

                getToken();
                if (token ==',') {
                    getToken();
                }
            }

            if (token != ']') {
                throw newSyntaxError('Bracket ] expected');
            }
            getToken();
        }

        return attr;
    }

    /**
     * Create a syntax error with extra information on current token and index.
     * @param {String} message
     * @returns {SyntaxError} err
     */
    function newSyntaxError(message) {
        return new SyntaxError(message + ', got "' + chop(token, 30) + '" (char ' + index + ')');
    }

    /**
     * Chop off text after a maximum length
     * @param {String} text
     * @param {Number} maxLength
     * @returns {String}
     */
    function chop (text, maxLength) {
        return (text.length <= maxLength) ? text : (text.substr(0, 27) + '...');
    }

    /**
     * Convert a string containing a graph in DOT language into a map containing
     * with nodes and edges in the format of graph.
     * @param {String} data         Text containing a graph in DOT-notation
     * @return {Object} graphData
     */
    function DOTToGraph (data) {
        // parse the DOT file
        var dotData = parseDOT(data);
        var graphData = {
            nodes: [],
            edges: [],
            options: {}
        };

        // copy the nodes
        if (dotData.nodes) {
            dotData.nodes.forEach(function (dotNode) {
                var graphNode = {
                    id: dotNode.id,
                    label: String(dotNode.label || dotNode.id)
                };
                merge(graphNode, dotNode.attr);
                if (graphNode.image) {
                    graphNode.shape = 'image';
                }
                graphData.nodes.push(graphNode);
            });
        }

        // copy the edges
        if (dotData.edges) {
            dotData.edges.forEach(function (dotEdge) {
                var graphEdge = {
                    from: dotEdge.from,
                    to: dotEdge.to
                };
                merge(graphEdge, dotEdge.attr);
                graphEdge.style = (dotEdge.type == '->') ? 'arrow' : 'line';
                graphData.edges.push(graphEdge);
            });
        }

        // copy the options
        if (dotData.attr) {
            graphData.options = dotData.attr;
        }

        return graphData;
    }

    // exports
    exports.parseDOT = parseDOT;
    exports.DOTToGraph = DOTToGraph;

})(typeof util !== 'undefined' ? util : exports);
