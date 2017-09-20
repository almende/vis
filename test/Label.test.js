/**
 * TODO - add tests for:
 * ====
 *
 * - !!! good test case with the tags for max width
 * - pathological cases of spaces (and other whitespace!)
 * - html unclosed or unopened tags
 * - html tag combinations with no font defined (e.g. bold within mono) 
 */
var assert = require('assert')
var Label = require('../lib/network/modules/components/shared/Label').default;
var NodesHandler = require('../lib/network/modules/NodesHandler').default;

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
      blocks: [{text: "One really long sentence"}]
    }, {
      blocks: [{text: "that should go over"}]
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
      blocks: [{text: "<i>multi <b>tags</b></i>"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label <b>with</b>"}]
    }, {
      blocks: [{text: "<code>some</code> "}]
    }, {
      blocks: [{text: " <i>multi <b>tags</b></i>"}]
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


  var markdown_widthConstraint_expected = [{
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


  it('compresses spaces in multifont', function (done) {
    var options = getOptions(options);

    var text = [
      "Too  many    spaces     here!",
      "This thing:\n  - could be\n  - a kind\n  - of list",  // multifont: 2 spaces at start line reduced to 1
    ];


    //
    // multifont disabled: spaces are preserved
    //
    var label = new Label({}, options);

    var expected_no_multiline = [{
      lines: [{
        blocks: [{text: "Too  many    spaces     here!"}],
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

    checkProcessedLabels(label, text, expected_no_multiline);


    //
    // multifont enabled: spaces are compressed
    //
    options.font.multi = true;
    var label = new Label({}, options);

    var expected_multiline = [{
      lines: [{
        blocks: [{text: "Too many spaces here!"}],
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
    checkProcessedLabels(label, text, expected_multiline);

    done();
  });


  it('parses end of line followed by space and empty lines', function (done) {
    var options = getOptions(options);
    options.font.maxWdt = 300;
    assert.equal(options.font.multi, false);

    var label = new Label({}, options);
    var longWord = "asd;lkfja;lfkdj;alkjfd;alskfj";

    var text = [
      "Mind the space!\n " + longWord,
      "Mind the empty line!\n\n" + longWord,
      "Mind the dos empty line!\r\n\r\n" + longWord
    ];

    var expected_no_multiline = [{
      lines: [{
        blocks: [{text: "Mind the space!"}]
      }, {
        blocks: [{text: " "}]  // space retained!
      }, {
        blocks: [{text: "asd;lkfja;lfkdj;alkjfd;als"}]
      }, {
        blocks: [{text: "kfj"}]
      }]
    }, {
      lines: [{
        blocks: [{text: "Mind the empty line!"}]  // Note that empty line disappears
      }, {
        blocks: [{text: ""}]  // empty line!
      }, {
        blocks: [{text: "asd;lkfja;lfkdj;alkjfd;als"}]
      }, {
        blocks: [{text: "kfj"}]
      }]
    }, {
      lines: [{
        blocks: [{text: "Mind the dos empty line!"}]  // This should succeed; empty line  disappears
      }, {
        blocks: [{text: ""}]  // empty line!
      }, {
        blocks: [{text: "asd;lkfja;lfkdj;alkjfd;als"}]
      }, {
        blocks: [{text: "kfj"}]
      }]
    }];

    checkProcessedLabels(label, text, expected_no_multiline);
    done();
  });
});
