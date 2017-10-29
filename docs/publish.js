/*==============================================================================
  Demo template, showing how documentation can be generated for `vis.js`.

  ------------------------------------------------------------------------------
  ## Notes on `jsdoc` code

  // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
  // doesn't try to hand them out later
  indexUrl = helper.getUniqueFilename('index');
  // don't call registerLink() on this one! 'index' is also a valid longname

  globalUrl = helper.getUniqueFilename('global');
  helper.registerLink('global', globalUrl);

  ============================================================================== */
'use strict';
//var taffy = require('taffydb').taffy;  // not really required here, left for reference

// Internal modules of `jsdoc` are available here.
// This is not the complete list, there may be more useful stuff in jsdoc
// For all modules scan in: '/usr/lib/node_modules/jsdoc/lib/jsdoc/' (or similar on your system)
var fs = require('jsdoc/fs');
var path = require('jsdoc/path');
var template = require('jsdoc/template');


/**
 * Set up the template rendering engine.
 */
function createRenderer(fromDir, data) {
  var renderer = new template.Template(fromDir);  // Param is the template source directory.
                                                  // All template files are relative to this directory!
  /**
   * Example helper method
   * 
   * This can be called from within a template as follows:
   * 
   * ```
   * <?js
   *  var self = this;
   * ?>
   * ... 
   * <?js= self.helper('hello!') ?>
   * ```
   * 
   * /
  renderer.helper = function(val) {
    return 'this is a helper! ' + val;
	};
  */

  /**
   * Retrieves jsdoc info for the passed instance method.
   */
  renderer.getComment = function(methodName) {
    var tmp = data().filter({longname: methodName}).get()[0];

    if (tmp === undefined) {
      throw new Error('Could not find jsdoc for: ' + methodName);
    }

    // NOTE: Following does not show up with `gulp docs`, need to do call directly
	  // console.log(JSON.stringify(tmp, null, 2));

    // Some restructuring, to adapt it to the docs layout
    // This needs some work to make it handle 0 and > 1 parameters
    var paramText = "";
    if (tmp.params !== undefined && tmp.params.length > 0) {
      let param = tmp.params[0];
      let tmpText = param.type.names.join('|') + ' ' + param.name;
      if (param.optional === true) {
        tmpText = '[' + tmpText + ']';
      }
      paramText = '<code>' + tmpText + '</code>';
    }
    var prototype = tmp.name + '(' + paramText + ')';

    var returns = 'none';
    if (tmp.returns !== undefined && tmp.returns.length > 0) {
      let name = tmp.returns[0].type.names[0];
      if (name !== "undefined") {
        returns = name;
      }
    }

    return {
      name: tmp.name,
      prototype: prototype,
      returns: returns,
      description: tmp.description
    }
	};

  return renderer;
}


/**
  Entry point for the template.

  This is called from `jsdoc` during execution

    @param {TAFFY} taffyData See <http://taffydb.com/>.
    @param {object} opts
    @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
  //console.log(JSON.stringify(opts, null, 2));

  var fromDir = path.resolve(opts.template);
  var toDir = path.join(opts.destination);
  var renderer = createRenderer(fromDir, taffyData);

  var docFiles = fs.ls(fromDir, 3);
  docFiles.forEach(function(fileName) {
    // Template filenames need to be relative to template source dir
    var relName = path.relative(fromDir, fileName);
    var outFile = path.join(toDir, relName);

    if (/publish.js$/.test(fileName)) return;   // Skip self
    if (/README.md$/.test(fileName)) return;   // Skip own README
    if (/\.tmpl$/.test(fileName)) return;       // Skip .tmpl files; these are used as partials only

    if (!/\.html$/.test(fileName)) {
      // Just plain copy over non-html files
      var tmpDir = fs.toDir(outFile);
      fs.mkPath(tmpDir);
      fs.copyFileSync(fileName, tmpDir);
      return;
    }
   
    // Render html files as templates 
    //console.log(relName);
    var html = renderer.partial(relName, {});
    fs.mkPath(fs.toDir(outFile));
    fs.writeFileSync(outFile, html, 'utf8');
  });

  //console.log(JSON.stringify(env, null, 2));
};
