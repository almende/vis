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
  function getOptions() {
    var options = {};
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
      return 'returned: ' + JSON.stringify(returned, null, 2) + '\n' +
             'expected: ' + JSON.stringify(expected, null, 2);
		}

    assert(returned.lines.length === expected.lines.length, 'Number of lines does not match, ' + showBlocks());

    for (let i = 0; i < returned.lines.length; ++i) {
      let retLine = returned.lines[i];
      let expLine = expected.lines[i];

      assert(retLine.blocks.length === expLine.blocks.length, 'Number of blocks does not match, ' + showBlocks());
      for (let j = 0; j < retLine.blocks.length; ++j) {
        let retBlock = retLine.blocks[j];
        let expBlock = expLine.blocks[j];

        assert(retBlock.text === expBlock.text, 'Text does not match, ' + showBlocks());

        assert(retBlock.mod !== undefined);
        if (retBlock.mod === 'normal') {
         assert(expBlock.mod === undefined || expBlock.mod === 'normal',
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
    "OnereallylongwordthatshouldgooverwidthConstraint.maximumifdefined",
    "label\nwith\nnewlines"
	]

  var html_text = [
    "label <b>with</b> <code>some</code> <i>multi <b>tags</b></i>",

    // Note funky spaces around \n's in following
    "label <b>with</b> <code>some</code> \n <i>multi <b>tags</b></i>\n and newlines"
  ];

  var markdown_text = [
    "label *with* `some` _multi *tags*_",

    // Note funky spaces around \n's in following
    "label *with* `some` \n _multi *tags*_\n and newlines"
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
  },
  {
    lines: [{
      blocks: [{text: "OnereallylongwordthatshouldgooverwidthConstraint.maximumifdefined"}]
    }]
  }, {
    lines: [{
      blocks: [{text: "label"}]
    }, {
      blocks: [{text: "with"}]
    }, {
      blocks: [{text: "newlines"}]
    }]
  }]


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
  }]


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
  }]


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

  it('parses regular text labels', function (done) {
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

    // normal should pass through unchanged
    checkProcessedLabels(label, normal_text  , normal_expected);             // normal unchanged
    checkProcessedLabels(label, html_text    , multi_expected);
    checkProcessedLabels(label, markdown_text, markdown_unchanged_expected); // markdown unchanged

    done();
  });


  it('parses markdown labels', function (done) {
    var options = getOptions(options);
    options.font.multi = 'markdown';   // TODO: also test 'md', also test illegal value here

    var label = new Label({}, options);

    checkProcessedLabels(label, normal_text  , normal_expected);             // normal unchanged
    checkProcessedLabels(label, html_text    , html_unchanged_expected);     // html unchanged
    checkProcessedLabels(label, markdown_text, multi_expected);

    done();
  });
});
