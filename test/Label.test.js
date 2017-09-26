/**
 * TODO - add tests for:
 * ====
 *
 * - html unclosed or unopened tags
 * - html tag combinations with no font defined (e.g. bold within mono) 
 */
var assert = require('assert')
var Label = require('../lib/network/modules/components/shared/Label').default;
var NodesHandler = require('../lib/network/modules/NodesHandler').default;
var util = require('../lib/util');
var jsdom_global = require('jsdom-global');
var vis = require('../dist/vis');
var Network = vis.network;


/**************************************************************
 * Dummy class definitions for minimal required functionality.
 **************************************************************/

class DummyContext {
  measureText(text) {
    return {
      width:  12*text.length,
      height: 14
    };
  }
}


class DummyLayoutEngine {
	positionInitially() {}
}

/**************************************************************
 * End Dummy class definitions
 **************************************************************/


describe('Network Label', function() {

  /**
   * Retrieve options object from a NodesHandler instance
   *
   * NOTE: these are options at the node-level
   */
  function getOptions(options = {}) {
    var body = {
      functions: {},
      emitter: {
        on: function() {}
      }
    }

    var nodesHandler = new NodesHandler(body, {}, options, new DummyLayoutEngine() );
    //console.log(JSON.stringify(nodesHandler.options, null, 2));

    return nodesHandler.options;
  }


  /**
   * Check if the returned lines and blocks are as expected.
   *
   * All width/height fields and font info are ignored.
   * Within blocks, only the text is compared
   */
  function checkBlocks(returned, expected) {
    let showBlocks = () => {
      return '\nreturned: ' + JSON.stringify(returned, null, 2) + '\n' +
               'expected: ' + JSON.stringify(expected, null, 2);
		}

    assert.equal(expected.lines.length, returned.lines.length, 'Number of lines does not match, ' + showBlocks());

    for (let i = 0; i < returned.lines.length; ++i) {
      let retLine = returned.lines[i];
      let expLine = expected.lines[i];

      assert(retLine.blocks.length === expLine.blocks.length, 'Number of blocks does not match, ' + showBlocks());
      for (let j = 0; j < retLine.blocks.length; ++j) {
        let retBlock = retLine.blocks[j];
        let expBlock = expLine.blocks[j];

        assert(retBlock.text === expBlock.text, 'Text does not match, ' + showBlocks());

        assert(retBlock.mod !== undefined);
        if (retBlock.mod === 'normal' || retBlock.mod === '') {
         assert(expBlock.mod === undefined || expBlock.mod === 'normal' || expBlock === '',
           'No mod field expected in returned, ' + showBlocks());
        } else {
         assert(retBlock.mod === expBlock.mod, 'Mod fields do not match, line: ' + i + ', block: ' + j +
           '; ret: ' + retBlock.mod + ', exp: ' + expBlock.mod + '\n' + showBlocks());
        }
      }
    }
  }


  function checkProcessedLabels(label, text, expected) {   
    var ctx = new DummyContext();

    for (var i in text) {
      var ret = label._processLabelText(ctx, false, false, text[i]);
      //console.log(JSON.stringify(ret, null, 2));
      checkBlocks(ret, expected[i]);
    }
  }


/**************************************************************
 * Test data
 **************************************************************/

  var normal_text = [
    "label text",
    "label\nwith\nnewlines",
    "OnereallylongwordthatshouldgooverwidthConstraint.maximumifdefined",
    "One really long sentence that should go over widthConstraint.maximum if defined",
    "Reallyoneenormouslylargelabel withtwobigwordsgoingoverwayovermax"
	]

  var html_text = [
    "label <b>with</b> <code>some</code> <i>multi <b>tags</b></i>",
    "label <b>with</b> <code>some</code> \n <i>multi <b>tags</b></i>\n and newlines" // NB spaces around \n's
  ];

  var markdown_text = [
    "label *with* `some` _multi *tags*_",
    "label *with* `some` \n _multi *tags*_\n and newlines" // NB spaces around \n's
  ];



/**************************************************************
 * Expected Results
 **************************************************************/


  var normal_expected = [{
    // In first item, width/height kept in for reference
    width: 120,
    height: 14,
    lines: [{
      width: 120,
      height: 14,
      blocks: [{
        text: "label text",
        width: 120,
        height: 14,
      }]
    }]
  }, {
    lines: [{
      blocks: [{text: "label"}]
    }, {
      blocks: [{text: "with"}]
    }, {
      blocks: [{text: "newlines"}]
    }]
  }, {
    // From here onward, changes width max width set
    lines: [{
      blocks: [{text: "OnereallylongwordthatshouldgooverwidthConstraint.maximumifdefined"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "One really long sentence that should go over widthConstraint.maximum if defined"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "Reallyoneenormouslylargelabel withtwobigwordsgoingoverwayovermax"}]
    }]
  }];

  const indexWidthConstrained = 2;  // index of first item that will be different with max width set

  var normal_widthConstraint_expected = normal_expected.slice(0, indexWidthConstrained);
  Array.prototype.push.apply(normal_widthConstraint_expected, [{
    lines: [{
      blocks: [{text: "Onereallylongwordthatshoul"}]
    }, {
      blocks: [{text: "dgooverwidthConstraint.max"}]
    }, {
      blocks: [{text: "imumifdefined"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "One really long"}]
    }, {
      blocks: [{text: "sentence that should"}]
    }, {
      blocks: [{text: "go over"}]
    }, {
      blocks: [{text: "widthConstraint.maximum"}]
    }, {
      blocks: [{text: "if defined"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "Reallyoneenormouslylargela"}]
    }, {
      blocks: [{text: "bel"}]
    }, {
      blocks: [{text: "withtwobigwordsgoingoverwa"}]
    }, {
      blocks: [{text: "yovermax"}]
    }]
  }]);


  var html_unchanged_expected = [{
    lines: [{
      blocks: [{text: "label <b>with</b> <code>some</code> <i>multi <b>tags</b></i>"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label <b>with</b> <code>some</code> "}]
    }, {
      blocks: [{text: " <i>multi <b>tags</b></i>"}]
    }, {
      blocks: [{text: " and newlines"}]
    }]
  }];

  var html_widthConstraint_unchanged = [{
    lines: [{
      blocks: [{text: "label <b>with</b>"}]
    }, {
      blocks: [{text: "<code>some</code>"}]
    }, {
      blocks: [{text: "<i>multi"}]
    }, {
      blocks: [{text: "<b>tags</b></i>"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label <b>with</b>"}]
    }, {
      blocks: [{text: "<code>some</code> "}]
    }, {
      blocks: [{text: " <i>multi"}]
    }, {
      blocks: [{text: "<b>tags</b></i>"}]
    }, {
      blocks: [{text: " and newlines"}]
    }]
  }];


  var markdown_unchanged_expected = [{
    lines: [{
      blocks: [{text: "label *with* `some` _multi *tags*_"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label *with* `some` "}]
    }, {
      blocks: [{text: " _multi *tags*_"}]
    }, {
      blocks: [{text: " and newlines"}]
    }]
  }];


  var markdown_widthConstraint_expected= [{
    lines: [{
      blocks: [{text: "label *with* `some`"}]
    }, {
      blocks: [{text: "_multi *tags*_"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label *with* `some` "}]
    }, {
      blocks: [{text: " _multi *tags*_"}]
    }, {
      blocks: [{text: " and newlines"}]
    }]
  }];


  var multi_expected = [{
    lines: [{
      blocks: [
        {text: "label "},
        {text: "with"  , mod: 'bold'},
        {text: " "},
        {text: "some"  , mod: 'mono'},
        {text: " "},
        {text: "multi ", mod: 'ital'},
        {text: "tags"  , mod: 'boldital'}
      ]
    }]
  }, {
    lines: [{
      blocks: [
        {text: "label "},
        {text: "with"  , mod: 'bold'},
        {text: " "},
        {text: "some"  , mod: 'mono'},
        {text: " "}
      ]
    }, {
      blocks: [
        {text: " "},
        {text: "multi ", mod: 'ital'},
        {text: "tags"  , mod: 'boldital'}
      ]
    }, {
      blocks: [{text: " and newlines"}]
    }]
  }];



/**************************************************************
 * End Expected Results
 **************************************************************/

  before(function() {
    this.jsdom_global = jsdom_global(
      "<div id='mynetwork'></div>",
      { skipWindowCheck: true}
    );
    this.container = document.getElementById('mynetwork');
  });


  after(function() {
    this.jsdom_global();
  });


  it('parses normal text labels', function (done) {
    var label = new Label({}, getOptions());

    checkProcessedLabels(label, normal_text  , normal_expected);
    checkProcessedLabels(label, html_text    , html_unchanged_expected);     // html unchanged
    checkProcessedLabels(label, markdown_text, markdown_unchanged_expected); // markdown unchanged

    done();
  });


  it('parses html labels', function (done) {
    var options = getOptions(options);
    options.font.multi = true;   // TODO: also test 'html', also test illegal value here

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_expected);             // normal as usual
    checkProcessedLabels(label, html_text    , multi_expected);
    checkProcessedLabels(label, markdown_text, markdown_unchanged_expected); // markdown unchanged

    done();
  });


  it('parses markdown labels', function (done) {
    var options = getOptions(options);
    options.font.multi = 'markdown';   // TODO: also test 'md', also test illegal value here

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_expected);             // normal as usual
    checkProcessedLabels(label, html_text    , html_unchanged_expected);     // html unchanged
    checkProcessedLabels(label, markdown_text, multi_expected);

    done();
  });


  it('handles normal text with widthConstraint.maximum', function (done) {
    var options = getOptions(options);

    //
    // What the user would set:
    //
    //   options.widthConstraint = { minimum: 100, maximum: 200};
    //
    // No sense in adding minWdt, not used when splitting labels into lines
    //
    // This comment also applies to the usage of maxWdt in the test cases below
    //
    options.font.maxWdt = 300;

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_widthConstraint_expected);
    checkProcessedLabels(label, html_text    , html_widthConstraint_unchanged);    // html unchanged

    // Following is an unlucky selection, because the first line broken on the final character (space)
    // So we cheat a bit here
    options.font.maxWdt = 320;
    label = new Label({}, options);
    checkProcessedLabels(label, markdown_text, markdown_widthConstraint_expected); // markdown unchanged

    done();
  });


  it('handles html tags with widthConstraint.maximum', function (done) {
    var options = getOptions(options);
    options.font.multi = true;
    options.font.maxWdt = 300;

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_widthConstraint_expected);
    checkProcessedLabels(label, html_text    , multi_expected); 

    // Following is an unlucky selection, because the first line broken on the final character (space)
    // So we cheat a bit here
    options.font.maxWdt = 320;
    label = new Label({}, options);
    checkProcessedLabels(label, markdown_text, markdown_widthConstraint_expected);

    done();
  });


  it('handles markdown tags with widthConstraint.maximum', function (done) {
    var options = getOptions(options);
    options.font.multi = 'markdown';
    options.font.maxWdt = 300;

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_widthConstraint_expected);
    checkProcessedLabels(label, html_text    , html_widthConstraint_unchanged); 
    checkProcessedLabels(label, markdown_text, multi_expected);

    done();
  });


  /**
   * Check that setting options for multi-font works as expected
   *
   * - using multi-font 'bold' for test, the rest should work analogously
   * - using multi-font option 'color' for test, the rest should work analogously
   */
  it('sets the multi-font options according to precedence for node labels', function (done) {

    /**
     * Helper function for easily accessing font options in a node
     */
    var fontOption = (index) => {
      var nodes = network.body.nodes;
      return nodes[index].labelModule.fontOptions;
    };


    /**
     * Helper function for easily accessing bold options in a node
     */
    var modBold = (index) => {
      return fontOption(index).bold;
    };


    var dataNodes = [
      {id: 0, label: '<b>0</b>'},
      {id: 1, label: '<b>1</b>'},
      {id: 2, label: '<b>2</b>', group: 'group1'},
      {id: 3, label: '<b>3</b>',
        font: {
          bold: { color: 'green' },
        }
      },
      {id: 4, label: '<b>4</b>', group: 'group1',
        font: {
          bold: { color: 'green' },
        }
      },
    ];
  
    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: new vis.DataSet(dataNodes),
        edges: []
    };
  
    var options = {
      nodes: {
        font: {
          multi: true
        }
      },
      groups: {
        group1: {
          font: { color: 'red' },
        },
        group2: {
          font: { color: 'white' },
        },
      },
    };
  
    var network = new vis.Network(container, data, options);


    assert.equal(modBold(0).color, '#343434');  // Default value
    assert.equal(modBold(1).color, '#343434');  // Default value
    assert.equal(modBold(2).color, 'red');      // Group value overrides default
    assert.equal(modBold(3).color, 'green');    // Local value overrides default
    assert.equal(modBold(4).color, 'green');    // Local value overrides group


    //
    // Change some node values dynamically
    //
    data.nodes.update([
      {id: 1, group: 'group2'},
      {id: 4, font: { bold: { color: 'orange'}}},
    ]);

    assert.equal(modBold(0).color, '#343434');  // unchanged
    assert.equal(modBold(1).color, 'white');    // new group value
    assert.equal(modBold(3).color, 'green');    // unchanged
    assert.equal(modBold(4).color, 'orange');   // new local value

    //
    // Change group options dynamically
    //
    network.setOptions({
      groups: {
        group1: {
          font: { color: 'brown' },
        },
      },
    });


    assert.equal(modBold(0).color, '#343434');  // unchanged
    assert.equal(modBold(1).color, 'white');    // Unchanged
    assert.equal(modBold(2).color, 'brown');    // New group values
    assert.equal(modBold(3).color, 'green');    // unchanged
    assert.equal(modBold(4).color, 'orange');   // unchanged


    network.setOptions({
      nodes: {
        font: {
          multi: true,
          bold: {
            color: 'black'
          }
        }
      },
    });

    assert.equal(modBold(0).color, 'black');    // nodes default
    assert.equal(modBold(1).color, 'black');    // more specific bold value overrides group value
    assert.equal(modBold(2).color, 'black');    // idem
    assert.equal(modBold(3).color, 'green');    // unchanged
    assert.equal(modBold(4).color, 'orange');   // unchanged


    network.setOptions({
      groups: {
        group1: {
          font: { bold: {color: 'brown'} },
        },
      },
    });

    assert.equal(modBold(0).color, 'black');    // nodes default
    assert.equal(modBold(1).color, 'black');    // more specific bold value overrides group value
    assert.equal(modBold(2).color, 'brown');    // bold group value overrides bold node value
    assert.equal(modBold(3).color, 'green');    // unchanged
    assert.equal(modBold(4).color, 'orange');   // unchanged


    //
    // Same initialization as previous with a color set for the default node font
    //
    data.nodes = new vis.DataSet(dataNodes);  // Need to reset nodes, changed in previous
    options.nodes.font.color = 'purple';
    network = new vis.Network(container, data, options);

    assert.equal(modBold(0).color, 'purple');   // Nodes value
    assert.equal(modBold(1).color, 'purple');   // Nodes value
    assert.equal(modBold(2).color, 'red');      // Group value overrides nodes
    assert.equal(modBold(3).color, 'green');    // Local value overrides all
    assert.equal(modBold(4).color, 'green');    // Idem


    //
    // Same initialization as previous with a color in the node options,
    // this should override the default *and* the font value
    //
    options.nodes.font.bold = { color: 'yellow'};
    options.groups.group1  = {font: { bold: { color: 'red' }}};

    // console.log(options);
    // console.log("==============");
    // console.log(options.nodes.font);
    // console.log("==============");

    assert(options.nodes.font.multi);
    network = new vis.Network(container, data, options);

    //console.log(fontOption(2));
    assert.equal(modBold(0).color, 'yellow');   // bold value
    assert.equal(modBold(1).color, 'yellow');   // bold value
    assert.equal(modBold(2).color, 'red');      // Group value overrides nodes
    assert.equal(modBold(3).color, 'green');    // Local value overrides all
    assert.equal(modBold(4).color, 'green');    // Idem

    done();
  });


  /**
   * Check that setting options for multi-font works as expected
   *
   * - using multi-font 'bold' for test, the rest should work analogously
   * - using multi-font option 'color' for test, the rest should work analogously
   * - edges have no groups
   */
  it('sets the multi-font options according to precedence for edge labels', function (done) {

    /**
     * Helper function for easily accessing font options in an edge
     */
    var fontOption = (index) => {
      var edge = network.body.edges;
      return edge[index].labelModule.fontOptions;
    };


    /**
     * Helper function for easily accessing bold options in an edge
     */
    var modBold = (index) => {
      return fontOption(index).bold;
    };


    var dataNodes = [
      {id: 1, label: '1'},
      {id: 2, label: '2'},
      {id: 3, label: '3'},
      {id: 4, label: '4'},
    ];

    var dataEdges = [
      {id: 1, from: 1, to: 2, label: '<b>1</b>'},
      {id: 2, from: 1, to: 4, label: '<b>2</b>',
        font: {
          bold: { color: 'green' },
        }
      },
      {id: 3, from: 2, to: 3, label: '<b>3</b>',
        font: {
          bold: { color: 'green' },
        }
      },
    ];
  
    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: new vis.DataSet(dataNodes),
        edges: new vis.DataSet(dataEdges),
    };
  
    var options = {
      edges: {
        font: {
          multi: true
        }
      },
    };
  
    var network = new vis.Network(container, data, options);

    assert.equal(modBold(1).color, '#343434');  // Default value
    assert.equal(modBold(2).color, 'green');    // Local value overrides default
    assert.equal(modBold(3).color, 'green');    // Local value overrides group


    //
    // Change edge node values dynamically
    //
    data.edges.update([
      {id: 3, font: { bold: { color: 'orange'}}},
    ]);

    assert.equal(modBold(1).color, '#343434');  // unchanged
    assert.equal(modBold(2).color, 'green');    // unchanged
    assert.equal(modBold(3).color, 'orange');   // new local value


    network.setOptions({
      edges: {
        font: {
          multi: true,
          bold: {
            color: 'black'
          }
        }
      },
    });

    assert.equal(modBold(1).color, 'black');    // more specific bold value overrides group value
    assert.equal(modBold(2).color, 'green');    // unchanged
    assert.equal(modBold(3).color, 'orange');   // unchanged


    //
    // Same initialization as previous with a color set for the default node font
    //
    data.edges = new vis.DataSet(dataEdges);  // Need to reset nodes, changed in previous
    options.edges.font.color = 'purple';
    network = new vis.Network(container, data, options);

    assert.equal(modBold(1).color, 'purple');   // Nodes value
    assert.equal(modBold(2).color, 'green');    // Local value overrides all
    assert.equal(modBold(3).color, 'green');    // Idem

    done();
  });


  /**
   * TODO: Unit test for bad font shorthands.
   *       Currently, only "size[px] name color" is valid, always 3 items with this exact spacing.
   *       All other combinations should either be rejected as error or handled gracefully.
   */
  it('handles shorthand string fonts correctly', function (done) {
    /**
     * Helper function for easily accessing font options
     */
    var fontOption = (index) => {
      var node = network.body.nodes;
      return node[index].labelModule.fontOptions;
    };


    /**
     * Helper function for easily accessing bold options
     */
    var modBold = (index) => {
      return fontOption(index).bold;
    };


    var dataNodes = [
      {id: 1, label: '1'},
      {id: 2, label: '2', group: 'group1'},
      {id: 3, label: '3', group: 'group2'},
      {id: 4, label: '4', font: '5px Font5 #050505'},
    ];

    var dataEdges = [];

    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: new vis.DataSet(dataNodes),
        edges: new vis.DataSet(dataEdges),
    };

    var options = {
      nodes: {
        font: {
          multi: true,
          bold: '1 Font1 #010101',
          ital: '2 Font2 #020202',
        }
      },
      groups: {
        group1: {
          font: '3 Font3 #030303'
        },
        group2: {
          font: {
            bold: '4 Font4 #040404'
          }
        }
      }
    };
  
    var network = new vis.Network(container, data, options);

    var testFonts = {
      'default': {color: '#343434', face: 'arial'    , size: 14},
      'monodef': {color: '#343434', face: 'monospace', size: 15},
      'font1'  : {color: '#010101', face: 'Font1'    , size:  1},
      'font2'  : {color: '#020202', face: 'Font2'    , size:  2},
      'font3'  : {color: '#030303', face: 'Font3'    , size:  3},
      'font4'  : {color: '#040404', face: 'Font4'    , size:  4},
      'font5'  : {color: '#050505', face: 'Font5'    , size:  5},
      'font6'  : {color: '#060606', face: 'Font6'    , size:  6},
      'font7'  : {color: '#070707', face: 'Font7'    , size:  7},
    }

    var checkFont = (opt, expectedLabel) => {
      var expected = testFonts[expectedLabel];
   
      util.forEach(expected, (item, key) => {
        assert.equal(opt[key], item);
      } );
    };

    // NOTE: 'mono' has its own global default font and size, which will
    //       trump any other font values set.

    var opt = fontOption(1); 
    checkFont(opt, 'default');
    checkFont(opt.bold, 'font1');
    checkFont(opt.ital, 'font2');
    checkFont(opt.mono, 'monodef');           // Mono should have defaults

    // Node 2 should be using group1 options
    opt = fontOption(2); 
    checkFont(opt, 'font3');
    checkFont(opt.bold, 'font1');             // bold retains nodes default options
    checkFont(opt.ital, 'font2');             // ital retains nodes default options
    assert.equal(opt.mono.color, '#030303');  // New color
    assert.equal(opt.mono.face, 'monospace'); // own global default font
    assert.equal(opt.mono.size, 15);          // Own global default size

    // Node 3 should be using group2 options
    opt = fontOption(3); 
    checkFont(opt, 'default');
    checkFont(opt.bold, 'font4');
    checkFont(opt.ital, 'font2');
    checkFont(opt.mono, 'monodef'); // Mono should have defaults

    // Node 4 has its own base font definition
    opt = fontOption(4); 
    checkFont(opt, 'font5');
    checkFont(opt.bold, 'font1');
    checkFont(opt.ital, 'font2');
    assert.equal(opt.mono.color, '#050505');  // New color
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);


    //
    // Dynamic update: add new shorthand at every level
    //
    data.nodes.update([
      {id: 1, font: '5 Font5 #050505'},
      {id: 4, font: { bold: '6 Font6 #060606'} },  // kills node instance base font
    ]);

    network.setOptions({
      nodes: {
        font: {
          multi: true,
          ital: '4 Font4 #040404',
        }
      },
      groups: {
        group1: {
          font: {
            bold: '7 Font7 #070707'  // Kills node instance base font
          }
        },
        group2: {
          font: '6 Font6 #060606'  // Note: 'bold' removed by this
        }
      }
    });

    //console.log(fontOption(1));
    opt = fontOption(1); 
    checkFont(opt, 'font5');                  // New base font
    checkFont(opt.bold, 'font1');
    checkFont(opt.ital, 'font4');             // New global node default
    assert.equal(opt.mono.color, '#050505');  // New color
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

    opt = fontOption(2); 
    checkFont(opt, 'default');
    checkFont(opt.bold, 'font7');
    checkFont(opt.ital, 'font4');             // New global node default
    checkFont(opt.mono, 'monodef');           // Mono should have defaults again

    opt = fontOption(3); 
    checkFont(opt, 'font6');                  // New base font
    checkFont(opt.bold, 'font1');             // group bold option removed, using global default node
    checkFont(opt.ital, 'font4');             // New global node default
    assert.equal(opt.mono.color, '#060606');  // New color
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

    opt = fontOption(4); 
    checkFont(opt, 'default');
    checkFont(opt.bold, 'font6');
    checkFont(opt.ital, 'font4');
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

     
    // Dynamic change of global node default
    // Doing it separate, otherwise we couldn't test the global node multi-font settings
    network.setOptions({
      nodes: {
        font: '7 Font7 #070707'  // Note: this kills the font.multi, bold and ital settings!
      }
    });

    opt = fontOption(1); 
    checkFont(opt, 'font5');                  // Node instance value
    checkFont(opt.bold, 'font5');             // bold def removed from global default node 
    checkFont(opt.ital, 'font5');             // idem
    assert.equal(opt.mono.color, '#050505');  // New color
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

    opt = fontOption(2); 
    checkFont(opt, 'font7');                  // global node default applies for all settings
    checkFont(opt.bold, 'font7');
    checkFont(opt.ital, 'font7');
    assert.equal(opt.mono.color, '#070707');
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

    opt = fontOption(3); 
    checkFont(opt, 'font6');                  // Group base font
    checkFont(opt.bold, 'font6');             // idem
    checkFont(opt.ital, 'font6');             // idem
    assert.equal(opt.mono.color, '#060606');  // idem
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);

    opt = fontOption(4); 
    checkFont(opt, 'font7');                  // global node default
    checkFont(opt.bold, 'font6');             // node instance bold
    checkFont(opt.ital, 'font7');             // global node default
    assert.equal(opt.mono.color, '#070707');  // idem
    assert.equal(opt.mono.face, 'monospace');
    assert.equal(opt.mono.size, 15);


    //
    // Dynamic update: remove or delete shorthand at every level
    //
    data.nodes.update([
      {id: 1, font: null},
      {id: 4, font: { bold: null}},
    ]);


/*
    // Interesting: following flagged as error in options parsing, avoiding it for that reason
    network.setOptions({
      nodes: {
        font: {
          multi: true,
          ital: null,
        }
      },
    });
*/

    network.setOptions({
      groups: {
        group1: {
          font: {
            bold: null
          }
        },
        group2: {
          font: null
        }
      }
    });

    // global defaults for all
    for (let n = 1; n <= 4; ++ n) { 
      opt = fontOption(n); 
      checkFont(opt, 'font7');
      checkFont(opt.bold, 'font7');
      checkFont(opt.ital, 'font7');
      assert.equal(opt.mono.color, '#070707');
      assert.equal(opt.mono.face, 'monospace');
      assert.equal(opt.mono.size, 15);
    }

/*
    // Not testing following because it is an error in options parsing
    network.setOptions({
      nodes: {
        font: null
      },
    });
*/

    done();
  });


  it('sets and uses font.multi in group options', function (done) {

    /**
     * Helper function for easily accessing font options in a node
     */
    var fontOption = (index) => {
      var nodes = network.body.nodes;
      return nodes[index].labelModule.fontOptions;
    };


    /**
     * Helper function for easily accessing bold options in a node
     */
    var modBold = (index) => {
      return fontOption(index).bold;
    };


    var dataNodes = [
      {id: 1, label: '<b>1</b>', group: 'group1'},
      {
        // From example 1 in #3408
        id: 6, 
        label: '<i>\uf286</i> <b>\uf2cd</b> colored glyph icon',
        shape: 'icon',
        group: 'colored',
        icon : { color: 'blue' },
        font:
        {
          bold : { color : 'blue' },
          ital : { color : 'green' }
        }
      },
    ];
  
    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: new vis.DataSet(dataNodes),
        edges: []
    };
  
    var options = {
      groups: {
        group1: {
          font: {
            multi: true,
            color: 'red'
          },
        },
        colored :
        {
          // From example 1 in 3408
          icon :
          {
            face : 'FontAwesome',
            code : '\uf2b5',
          },
          font:
          {
            face : 'FontAwesome',
            multi: true,
            bold : { mod : '' },
            ital : { mod : '' }
          }
        },
      },
    };
  
    var network = new vis.Network(container, data, options);

    assert.equal(modBold(1).color, 'red');  // Group value
    assert(fontOption(1).multi);            // Group value
    assert.equal(modBold(6).color, 'blue'); // node instance value
    assert(fontOption(6).multi);            // Group value


    network.setOptions({
      groups: {
        group1: {
          //font: { color: 'brown' },  // Can not just change one field, entire font object is reset
          font: {
            multi: true,
            color: 'brown'
          },
        },
      },
    });

    assert.equal(modBold(1).color, 'brown'); // New value
    assert(fontOption(1).multi);             // Group value
    assert.equal(modBold(6).color, 'blue');  // unchanged
    assert(fontOption(6).multi);             // unchanged


    network.setOptions({
      groups: {
        group1: {
          font: null,   // Remove font from group
        },
      },
    });

    // console.log("===============");
    // console.log(fontOption(1));

    assert.equal(modBold(1).color, '#343434');  // Reverts to default 
    assert(!fontOption(1).multi);               // idem 
    assert.equal(modBold(6).color, 'blue');     // unchanged
    assert(fontOption(6).multi);                // unchanged

    done();
  });


  it('compresses spaces in multifont', function (done) {
    var options = getOptions(options);

    var text = [
      "Too  many    spaces     here!",
      "one two  three   four    five     six      .",
      "This thing:\n  - could be\n  - a kind\n  - of list",  // multifont: 2 spaces at start line reduced to 1
    ];


    //
    // multifont disabled: spaces are preserved
    //
    var label = new Label({}, options);

    var expected = [{
      lines: [{
        blocks: [{text: "Too  many    spaces     here!"}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "one two  three   four    five     six      ."}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "This thing:"}],
      }, {
        blocks: [{text: "  - could be"}],
      }, {
        blocks: [{text: "  - a kind"}],
      }, {
        blocks: [{text: "  - of list"}],
      }]
    }];

    checkProcessedLabels(label, text, expected);


    //
    // multifont disabled width maxwidth: spaces are preserved
    //
    options.font.maxWdt = 300;
    var label = new Label({}, options);

    var expected_maxwidth = [{
      lines: [{
          blocks: [{text: "Too  many    spaces"}],
        }, {
          blocks: [{text: "     here!"}],
      }]
    }, { 
      lines: [{
          blocks: [{text: "one two  three   "}],
        }, {
          blocks: [{text: "four    five     six"}],
        }, {
          blocks: [{text: "      ."}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "This thing:"}],
      }, {
        blocks: [{text: "  - could be"}],
      }, {
        blocks: [{text: "  - a kind"}],
      }, {
        blocks: [{text: "  - of list"}],
      }]
    }];

    checkProcessedLabels(label, text, expected_maxwidth);


    //
    // multifont enabled: spaces are compressed
    //
    options = getOptions(options);
    options.font.multi = true;
    var label = new Label({}, options);

    var expected_multifont = [{
      lines: [{
        blocks: [{text: "Too many spaces here!"}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "one two three four five six ."}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "This thing:"}],
      }, {
        blocks: [{text: " - could be"}],
      }, {
        blocks: [{text: " - a kind"}],
      }, {
        blocks: [{text: " - of list"}],
      }]
    }];

    checkProcessedLabels(label, text, expected_multifont);


    //
    // multifont enabled with max width: spaces are compressed
    //
    options.font.maxWdt = 300;
    var label = new Label({}, options);

    var expected_multifont_maxwidth = [{
      lines: [{
        blocks: [{text: "Too many spaces"}],
      }, {
        blocks: [{text: "here!"}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "one two three four"}],
      }, {
        blocks: [{text: "five six ."}],
      }]
    }, { 
      lines: [{
        blocks: [{text: "This thing:"}],
      }, {
        blocks: [{text: " - could be"}],
      }, {
        blocks: [{text: " - a kind"}],
      }, {
        blocks: [{text: " - of list"}],
      }]
    }];

    checkProcessedLabels(label, text, expected_multifont_maxwidth);

    done();
  });


  it('parses single huge word on line with preceding whitespace when max width set', function (done) {
    var options = getOptions(options);
    options.font.maxWdt = 300;
    assert.equal(options.font.multi, false);

    /**
     * Split a string at the given location, return either first or last part
     *
     * Allows negative indexing, counting from back (ruby style)
     */
    let splitAt = (text, pos, getFirst) => {
      if (pos < 0) pos = text.length + pos;

      if (getFirst) {
        return text.substring(0, pos);
      } else {
        return text.substring(pos);
      }
    };

    var label = new Label({}, options);
    var longWord = "asd;lkfja;lfkdj;alkjfd;alskfj";

    var text = [
      "Mind the space!\n " + longWord,
      "Mind the empty line!\n\n" + longWord,
      "Mind the dos empty line!\r\n\r\n" + longWord
    ];

    var expected = [{
      lines: [{
        blocks: [{text: "Mind the space!"}]
      }, {
        blocks: [{text: ""}]
      }, {
        blocks: [{text: splitAt(longWord, -3, true)}]
      }, {
        blocks: [{text: splitAt(longWord, -3, false)}]
      }]
    }, {
      lines: [{
        blocks: [{text: "Mind the empty"}]
      }, {
        blocks: [{text: "line!"}]
      }, {
        blocks: [{text: ""}]
      }, {
        blocks: [{text: splitAt(longWord, -3, true)}]
      }, {
        blocks: [{text: splitAt(longWord, -3, false)}]
      }]
    }, {
      lines: [{
        blocks: [{text: "Mind the dos empty"}]
      }, {
        blocks: [{text: "line!"}]
      }, {
        blocks: [{text: ""}]
      }, {
        blocks: [{text: splitAt(longWord, -3, true)}]
      }, {
        blocks: [{text: splitAt(longWord, -3, false)}]
      }]
    }];

    checkProcessedLabels(label, text, expected);


    //
    // Multi font enabled. For current case, output should be identical to no multi font
    //
    options.font.multi = true;
    var label = new Label({}, options);
    checkProcessedLabels(label, text, expected);

    done();
  });
});
