
/**
 * Parse a text source containing data in DOT language into a JSON object.
 * The object contains two lists: one with nodes and one with edges.
 * @param {String} data     Text containing a graph in DOT-notation
 * @return {Object} json    An object containing two parameters:
 *                          {Object[]} nodes
 *                          {Object[]} edges
 */
util.parseDOT = function (data) {
    /**
     * Test whether given character is a whitespace character
     * @param {String} c
     * @return {Boolean} isWhitespace
     */
    function isWhitespace(c) {
        return c == ' ' || c == '\t' || c == '\n' || c == '\r';
    }

    /**
     * Test whether given character is a delimeter
     * @param {String} c
     * @return {Boolean} isDelimeter
     */
    function isDelimeter(c) {
        return '[]{}();,=->'.indexOf(c) != -1;
    }

    var i = -1;  // current index in the data
    var c = '';  // current character in the data

    /**
     * Read the next character from the data
     */
    function next() {
        i++;
        c = data[i];
    }

    /**
     * Preview the next character in the data
     * @returns {String} nextChar
     */
    function previewNext () {
        return data[i + 1];
    }

    /**
     * Preview the next character in the data
     * @returns {String} nextChar
     */
    function previewPrevious () {
        return data[i + 1];
    }

    /**
     * Get a text description of the the current index in the data
     * @return {String} desc
     */
    function pos() {
        return '(char ' + i + ')';
    }

    /**
     * Skip whitespace and comments
     */
    function parseWhitespace() {
        // skip whitespace
        while (c && isWhitespace(c)) {
            next();
        }

        // test for comment
        var cNext = data[i + 1];
        var cPrev = data[i - 1];
        var c2 = c + cNext;
        if (c2 == '/*') {
            // block comment. skip until the block is closed
            while (c && !(c == '*' && data[i + 1] == '/')) {
                next();
            }
            next();
            next();

            parseWhitespace();
        }
        else if (c2 == '//' || (c == '#' && cPrev == '\n')) {
            // line comment. skip until the next return
            while (c && c != '\n') {
                next();
            }
            next();
            parseWhitespace();
        }
    }

    /**
     * Parse a string
     * The string may be enclosed by double quotes
     * @return {String | undefined} value
     */
    function parseString() {
        parseWhitespace();

        var name = '';
        if (c == '"') {
            next();
            while (c && c != '"') {
                name += c;
                next();
            }
            next(); // skip the closing quote
        }
        else {
            while (c && !isWhitespace(c) && !isDelimeter(c)) {
                name += c;
                next();
            }

            // cast string to number or boolean
            if (name.length) {
                var number = Number(name);
                if (!isNaN(number)) {
                    name = number;
                }
                else if (name == 'true') {
                    name = true;
                }
                else if (name == 'false') {
                    name = false;
                }
                else if (name == 'null') {
                    name = null;
                }
            }
        }

        return name;
    }

    /**
     * Parse a value, can be a string, number, or boolean.
     * The value may be enclosed by double quotes
     * @return {String | Number | Boolean | undefined} value
     */
    function parseValue() {
        parseWhitespace();

        if (c == '"') {
            return parseString();
        }
        else {
            var value = parseString();
            if (value != undefined) {
                // cast string to number or boolean
                var number = Number(value);
                if (!isNaN(number)) {
                    value = number;
                }
                else if (value == 'true') {
                    value = true;
                }
                else if (value == 'false') {
                    value = false;
                }
                else if (value == 'null') {
                    value = null;
                }
            }
            return value;
        }
    }

    /**
     * Parse a set with attributes,
     * for example [label="1.000", shape=solid]
     * @return {Object | undefined} attr
     */
    function parseAttributes() {
        parseWhitespace();

        if (c == '[') {
            next();
            var attr = {};
            while (c && c != ']') {
                parseWhitespace();

                var name = parseString();
                if (!name) {
                    throw new SyntaxError('Attribute name expected ' + pos());
                }

                parseWhitespace();
                if (c != '=') {
                    throw new SyntaxError('Equal sign = expected ' + pos());
                }
                next();

                var value = parseValue();
                if (!value) {
                    throw new SyntaxError('Attribute value expected ' + pos());
                }
                attr[name] = value;

                parseWhitespace();

                if (c ==',') {
                    next();
                }
            }
            next();

            return attr;
        }
        else {
            return undefined;
        }
    }

    /**
     * Parse a directed or undirected arrow '->' or '--'
     * @return {String | undefined} arrow
     */
    function parseArrow() {
        parseWhitespace();

        if (c == '-') {
            next();
            if (c == '>' || c == '-') {
                var arrow = '-' + c;
                next();
                return arrow;
            }
            else {
                throw new SyntaxError('Arrow "->" or "--" expected ' + pos());
            }
        }

        return undefined;
    }

    /**
     * Parse a line separator ';'
     * @return {String | undefined} separator
     */
    function parseSeparator() {
        parseWhitespace();

        if (c == ';') {
            next();
            return ';';
        }

        return undefined;
    }

    /**
     * Merge all properties of object b into object b
     * @param {Object} a
     * @param {Object} b
     */
    function merge (a, b) {
        if (a && b) {
            for (var name in b) {
                if (b.hasOwnProperty(name)) {
                    a[name] = b[name];
                }
            }
        }
    }

    var nodeMap = {};
    var edgeList = [];

    /**
     * Register a node with attributes
     * @param {String} id
     * @param {Object} [attr]
     */
    function addNode(id, attr) {
        var node = {
            id: String(id),
            attr: attr || {}
        };
        if (!nodeMap[id]) {
            nodeMap[id] = node;
        }
        else {
            merge(nodeMap[id].attr, node.attr);
        }
    }

    /**
     * Register an edge
     * @param {String} from
     * @param {String} to
     * @param {String} type    A string "->" or "--"
     * @param {Object} [attr]
     */
    function addEdge(from, to, type, attr) {
        edgeList.push({
            from: String(from),
            to: String(to),
            type: type,
            attr: attr || {}
        });
    }

    // find the opening curly bracket
    next();
    while (c && c != '{') {
        next();
    }
    if (c != '{') {
        throw new SyntaxError('Invalid data. Curly bracket { expected ' + pos())
    }
    next();

    // parse all data until a closing curly bracket is encountered
    while (c && c != '}') {
        // parse node id and optional node attributes
        var id = parseString();
        if (id == undefined || id === '') {
            throw new SyntaxError('String with id expected ' + pos());
        }
        var attr = parseAttributes();
        addNode(id, attr);

        // TODO: parse global attributes
        // TODO: parse global attributes "graph", "node", "edge"

        // parse arrow
        var type = parseArrow();
        while (type) {
            // parse node id
            var prevId = id;
            id = parseString();
            if (id == undefined) {
                throw new SyntaxError('String with id expected ' + pos());
            }
            addNode(id);

            // parse edge attributes and register edge
            attr = parseAttributes();
            addEdge(prevId, id, type, attr);

            // parse next arrow (optional)
            type = parseArrow();
        }

        // parse separator (optional)
        parseSeparator();

        parseWhitespace();
    }
    if (c != '}') {
        throw new SyntaxError('Invalid data. Curly bracket } expected');
    }

    // crop data between the curly brackets
    var start = data.indexOf('{');
    var end = data.indexOf('}', start);
    var text = (start != -1 && end != -1) ? data.substring(start + 1, end) : undefined;

    if (!text) {
        throw new Error('Invalid data. no curly brackets containing data found');
    }

    // return the results
    var nodeList = [];
    for (id in nodeMap) {
        if (nodeMap.hasOwnProperty(id)) {
            nodeList.push(nodeMap[id]);
        }
    }
    return {
        nodes: nodeList,
        edges: edgeList
    }
};

/**
 * Convert a string containing a graph in DOT language into a map containing
 * with nodes and edges in the format of graph.
 * @param {String} data         Text containing a graph in DOT-notation
 * @return {Object} graphData
 */
util.DOTToGraph = function (data) {
    // parse the DOT file
    var dotData = util.parseDOT(data);
    var graphData = {
        nodes: [],
        edges: [],
        options: {
            nodes: {},
            edges: {}
        }
    };

    /**
     * Merge the properties of object b into object a, and replace non-supported
     * attributes with supported properties.
     * @param {Object} a
     * @param {Object} b
     * @param {Array} [ignore]   Optional array with property names to be ignored
     */
    function merge (a, b, ignore) {
        for (var prop in b) {
            if (b.hasOwnProperty(prop) && (!ignore || ignore.indexOf(prop) == -1)) {
                a[prop] = b[prop];
            }
        }

        // TODO: Convert non supported attributes to properties supported by Graph
    }

    dotData.nodes.forEach(function (node) {
        if (node.id.toLowerCase() == 'graph') {
            merge(graphData.options, node.attr);
        }
        else if (node.id.toLowerCase() == 'node') {
            merge(graphData.options.nodes, node.attr);
        }
        else if (node.id.toLowerCase() == 'edge') {
            merge(graphData.options.edges, node.attr);
        }
        else {
            var graphNode = {};
            graphNode.id = node.id;
            graphNode.label = node.id;
            merge(graphNode, node.attr);
            graphData.nodes.push(graphNode);
        }
    });

    dotData.edges.forEach(function (edge) {
        var graphEdge = {};
        graphEdge.from = edge.from;
        graphEdge.to = edge.to;
        graphEdge.label = edge.id;
        graphEdge.style = (edge.type == '->') ? 'arrow-end' : 'line';
        merge(graphEdge, edge.attr);
        graphData.edges.push(graphEdge);
    });

    return graphData;
};
