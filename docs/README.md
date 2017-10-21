# Command line usage example

```
jsdoc -c jsdoc.json -r -t docs -d gen/docs lib
```

- `-c`: use this config file for `jsdoc`
- `-r`: Recurse into subdirectories of the specified source directories
- `-t`: Use template in path `docs`
- `-d`: Generated html files put in `gen/docs`
- Source files to parse are taken from directory `lib`


## Notes

The template generation is set up so that:

  - Files ending in `.tmpl` are skipped
  - All non-html files are plain copied
  - html-files *can* contain `<?js ?>` tags, but this is not required


## Intention

The `docs` directory is treated as a `jsdoc` template, in which the html-files are the template files. This allows for a gradual adaptation of the html-files to templates; unchanged html-files will pass through `jsdoc` unchanged.

The added value of using `jsdoc` for documentation generation, is that the complete documentation information, as collected by `jsdoc` from the source, is available for usage. This way, it's possible to insert technical notes from the source code into the documentation.

----

# Usage of and Notes on Source Code

This section contains notes on the usage of `jsdoc` functionality, to aid with the handling of its generated data.


## Parameters of `publish()`

### Parameter `taffyData`

  A table containing *all* data collected from the source code, related to jsdoc generation. See below for more info and example outputs.

### Parameter `opt`

Example of `opt` variable:

```js
{
  "_":["../github/vis/lib/network/"],
  "configure":"jsdoc.json",
  "recurse":true,
  "template":"/home/wim/projects/jsdoc/default",
  "destination":"./out/",
  "encoding":"utf8"
}
```

### Parameter `tutorial`

This does not appear to be of use for the generation of `vis.js` documentation.

Example of `tutorial` variable:

```js
{
  "longname":"",
  "name":"",
  "title":"",
  "content":"",
  "parent":null,
  "children":[],
  "_tutorials":{}
}
```

## Global variable `env`

This contains addition info for the current execution of `jsdoc`. Example of `env` variable:

```js
{
  "run":{"start":"2017-09-16T05:06:45.621Z","finish":null},
  "args":["-c","jsdoc.json","-r","-t","default","../github/vis/lib/network/"],
  "conf":{
    "plugins":["/usr/lib/node_modules/jsdoc/plugins/markdown.js"],
    "recurseDepth":10,
    "source":{"includePattern":".+\\.js(doc|x)?$","excludePattern":""},
    "sourceType":"module",
    "tags":{"allowUnknownTags":true,"dictionaries":["jsdoc","closure"]},
    "templates":{"monospaceLinks":false,"cleverLinks":false}
  },
  "dirname":"/usr/lib/node_modules/jsdoc",
  "pwd":"/home/wim/projects/jsdoc",
  "opts":{ <<same as parameter 'opt' above>> },
  "sourceFiles":[ <<list of full path names of all js-source files used as input>> ],
  "version":{"number":"3.5.4","revision":"Fri, 04 Aug 2017 22:05:27 GMT"}
}
```


## taffyData

This is a parameter to `publish()`. It's a table containing *all* data collected from the source code, related to jsdoc generation.

I can't find any way to return a list of fields for the data items in the taffyDB docs, therefore below there are examples of items, for better understanding of usage.

Example usage:

```js
  var data = taffyData;
  var tmp = data().filter({name:'Label'}).get();
```

Returns an array with all items with `name === 'Label'`. Example output of one of these items, for a class:

*In these examples, block comment endings are redacted to ' * /'*

```js
{
  "comment":"/**\n * A Label to be used for Nodes or Edges.\n * /",
  "meta":{
    "range":[3770,41303],
    "filename":"Label.js",
    "lineno":167,
    "columnno":0,
    "path":"/home/wim/projects/github/vis/lib/network/modules/components/shared",
    "code":{
      "id":"astnode100065034",
      "name":"Label",
      "type":"ClassDeclaration",
      "paramnames":["body","options","edgelabel"]
    }
  },
  "classdesc":"
A Label to be used for Nodes or Edges.

",
  "name":"Label",
  "longname":"Label",
  "kind":"class",
  "scope":"global",
  "params":[
    {"type":{"names":["Object"]},"name":"body"},
    {"type":{"names":["Object"]},"name":"options"},
    {"type":{"names":["boolean"]},"optional":true,"defaultvalue":false,"name":"edgelabel"}
  ],
  "___id":"T000002R005289",
  "___s":true
}
```

Example of item for an instance method:

```js
  var tmp = data().filter({name:'_drawText'}).get();
```

Full output returned:

```js
[{
  "comment":"/**\n *\n * @param {CanvasRenderingContext2D} ctx\n * @param {boolean} selected\n * @param {boolean} hover\n * @param {number} x\n * @param {number} y\n * @param {string} [baseline='middle']\n * @private\n * /",
  "meta":{
    "range":[20060,22269],
    "filename":"Label.js",
    "lineno":652,
    "columnno":2,
    "path":"/home/wim/projects/github/vis/lib/network/modules/components/shared",
    "code":{
      "id":"astnode100066427",
      "name":"Label#_drawText",
      "type":"MethodDefinition",
      "paramnames":["ctx","selected","hover","x","y","baseline"]
    },
    "vars":{"":null}
  },
  "params":[
    {"type":{"names":["CanvasRenderingContext2D"]},"name":"ctx"},
    {"type":{"names":["boolean"]},"name":"selected"},
    {"type":{"names":["boolean"]},"name":"hover"},
    {"type":{"names":["number"]},"name":"x"},
    {"type":{"names":["number"]},"name":"y"},
    {"type":{"names":["string"]},"optional":true,"defaultvalue":"'middle'","name":"baseline"}
  ],
  "access":"private",
  "name":"_drawText",
  "longname":"Label#_drawText",
  "kind":"function",
  "memberof":"Label",
  "scope":"instance",
  "___id":"T000002R005388",
  "___s":true
}]
```

## `jsdoc` template rendering

See `function createRenderer(fromDir, data)` in code for usage.

There are two calls for rendering templates:
 
  - `var html = renderer.render(inFile, docData);`
  - `var html = renderer.partial(inFile, docData);`
 
The difference is that `render()` will use a default layout template, if present, which will encapsulate all html. This can be set by:
 
```js
  renderer.layout = 'path/to/default/layout.tmpl'; 
```
 
Parameter `docData` is a hash which is used to pass parameters into a template. The standard way of using this appear to be:

```
<?js
  var data = obj;   // Whatever docData is
  var self = this;
?>
```
 
But it also appear to be possible to use the elements of docData directly:

```js
var docData = {
  myTitle: 'Hello, pussycat!'
};
```
 
Within the template:

```
  <?js= myTitle ?>
```
