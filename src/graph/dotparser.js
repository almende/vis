(function(exports) {
    /**
     * Parse a text source containing data in DOT language into a JSON object.
     * The object contains two lists: one with nodes and one with edges.
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

    var graph = null;               // object with the graph to be build
    var nodeAttr = null;            // global node attributes
    var edgeAttr = null;            // global edge attributes

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
     * Add a node to the current graph object. If there is already a node with
     * the same id, their attributes will be merged.
     * @param {Object} node
     */
    function addNode(node) {
        if (!graph.nodes) {
            graph.nodes = {};
        }
        var current = graph.nodes[node.id];
        if (current) {
            // merge attributes
            if (node.attr) {
                current.attr = merge(current.attr, node.attr);
            }
        }
        else {
            // add
            graph.nodes[node.id] = node;
            if (nodeAttr) {
                var attr = merge({}, nodeAttr);     // clone global attributes
                node.attr = merge(attr, node.attr); // merge attributes
            }
        }
    }

    /**
     * Add an edge to the current graph obect
     * @param {Object} edge
     */
    function addEdge(edge) {
        if (!graph.edges) {
            graph.edges = [];
        }
        graph.edges.push(edge);
        if (edgeAttr) {
            var attr = merge({}, edgeAttr);     // clone global attributes
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
        while (c == ' ' || c == '\t' || c == '\n') {  // space, tab, enter
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
            while (c == ' ' || c == '\t' || c == '\n') {  // space, tab, enter
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
        graph = {};
        nodeAttr = null;
        edgeAttr = null;

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
        parseStatements();

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

        return graph;
    }

    /**
     * Parse a list with statements.
     */
    function parseStatements () {
        while (token !== '' && token != '}') {
            if (tokenType != TOKENTYPE.IDENTIFIER) {
                throw newSyntaxError('Identifier expected');
            }

            parseStatement();
            if (token == ';') {
                getToken();
            }
        }
    }

    /**
     * Parse a single statement. Can be a an attribute statement, node
     * statement, a series of node statements and edge statements, or a
     * parameter.
     */
    function parseStatement() {
        var attr;
        var id = token; // can be as string or a number
        getToken();

        // attribute statements
        if (id == 'node') {
            // node attributes
            attr = parseAttributes();
            if (attr) {
                nodeAttr = merge(nodeAttr, attr);
            }
        }
        else if (id == 'edge') {
            // edge attributes
            attr = parseAttributes();
            if (attr) {
                edgeAttr = merge(edgeAttr, attr);
            }
        }
        else if (id == 'graph') {
            // graph attributes
            attr = parseAttributes();
            if (attr) {
                graph.attr = merge(graph.attr, attr);
            }
        }
        else {
            if (token == '=') {
                // id statement
                getToken();
                if (!graph.attr) {
                    graph.attr = {};
                }
                graph.attr[id] = token;
                getToken();
            }
            else {
                // node statement
                var node = {
                    id: String(id)
                };
                attr = parseAttributes();
                if (attr) {
                    node.attr = attr;
                }
                addNode(node);

                // edge statements
                var from = id;
                while (token == '->' || token == '--') {
                    var type = token;
                    getToken();

                    var to = token;
                    addNode({
                        id: String(to)
                    });
                    getToken();
                    attr = parseAttributes();

                    // create edge
                    var edge = {
                        from: String(from),
                        to: String(to),
                        type: type
                    };
                    if (attr) {
                        edge.attr = attr;
                    }
                    addEdge(edge);

                    from = to;
                }
            }
        }
    }

    /**
     * Parse a set with attributes,
     * for example [label="1.000", shape=solid]
     * @return {Object | undefined} attr
     */
    function parseAttributes() {
        if (token == '[') {
            getToken();
            var attr = {};
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
                attr[name] = value;

                getToken();
                if (token ==',') {
                    getToken();
                }
            }
            getToken();

            return attr;
        }
        else {
            return undefined;
        }
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
            for (var id in dotData.nodes) {
                if (dotData.nodes.hasOwnProperty(id)) {
                    var node = {
                        id: id,
                        label: id
                    };
                    merge(node, dotData.nodes[id].attr);
                    if (node.image) {
                        node.shape = 'image';
                    }
                    graphData.nodes.push(node);
                }
            }
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
