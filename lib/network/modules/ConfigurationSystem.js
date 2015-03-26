/**
 * Created by Alex on 3/26/2015.
 */


var util = require('../../util');


class ConfigurationSystem {
  constructor(network) {
    this.network = network;

    this.possibleOptions = {
      nodesHandler: {
        borderWidth: 1,
        borderWidthSelected: 2,
        color: {
          border: 'color',
          background: 'color',
          highlight: {
            border: 'color',
            background: '#D2E5FF'
          },
          hover: {
            border: 'color',
            background: 'color'
          }
        },
        fixed: {
          x:false,
          y:false
        },
        font: {
          color: 'color',
          size: [14,0,100,1], // px
          face: ['arial','verdana','tahoma'],
          background: 'color',
          stroke: [0,0,50,1], // px
          strokeColor: 'color'
        },
        group: 'string',
        hidden: false,
        icon: {
          face: 'string',  //'FontAwesome',
          code: 'string',  //'\uf007',
          size: [50,0,200,1],  //50,
          color:'color'   //'#aa00ff'
        },
        image: 'string', // --> URL
        physics: true,
        scaling: {
          min: [10,0,200,1],
          max: [30,0,200,1],
          label: {
            enabled: true,
            min: [14,0,200,1],
            max: [30,0,200,1],
            maxVisible: [30,0,200,1],
            drawThreshold: [3,0,20,1]
          }
        },
        shape: ['ellipse','box','circle','circularImage','database','diamond','dot','icon','image','square','star','text','triangle','triangleDown'],
        size: [25,0,200,1]
      },
      edgesHandler: {
        arrows: {
          to:     {enabled: false, scaleFactor:[1,0,3,0.05]}, // boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
          middle: {enabled: false, scaleFactor:[1,0,3,0.05]},
          from:   {enabled: false, scaleFactor:[1,0,3,0.05]}
        },
        color: {
          color:'color',
          highlight:'color',
          hover: 'color',
          inherit: {
            enabled: true,
            source: ['from','to'], // from / to
            useGradients: false
          },
          opacity:[1,0,1,0.05]
        },
        dashes:{
          enabled: false,
          length: [5,0,50,1],
          gap: [5,0,50,1],
          altLength: [5,0,50,1]
        },
        font: {
          color: 'color',
          size: [14,0,100,1], // px
          face: ['arial','verdana','tahoma'],
          background: 'color',
          stroke: [0,0,50,1], // px
          strokeColor: 'color',
          align:['horizontal','top','middle','bottom']
        },
        hidden: false,
        hoverWidth: [1.5,0,10,0.1],
        physics: true,
        scaling: {
          min: [10,0,200,1],
          max: [30,0,200,1],
          label: {
            enabled: true,
            min: [14,0,200,1],
            max: [30,0,200,1],
            maxVisible: [30,0,200,1],
            drawThreshold: [3,0,20,1]
          }
        },
        selfReferenceSize:[20,0,200,1],
        smooth: {
          enabled: true,
          dynamic: true,
          type: ["continuous",'discrete','diagonalCross','straightCross','horizontal','vertical','curvedCW','curvedCCW'],
          roundness: [0.5,0,1,0.05]
        },
        width: [1,0,30,1],
        widthSelectionMultiplier: [2,0,5,0.1]
      },
      layout:{
        randomSeed: [0,0,500,1],
        hierarchical: {
          enabled:false,
          levelSeparation: [150,20,500,5],
          direction: ["UD",'DU','LR','RL'],   // UD, DU, LR, RL
          sortMethod: ["hubsize",'directed'] // hubsize, directed
        }
      },
      interaction: {
        dragNodes:true,
        dragView: true,
        zoomView: true,
        hoverEnabled: false,
        showNavigationIcons: false,
        tooltip: {
          delay: [300,0,1000,25],
          fontColor: 'color',
          fontSize: [14,0,40,1], // px
          fontFace: ['arial','verdana','tahoma'],
          color: {
            border: 'color',
            background: 'color'
          }
        },
        keyboard: {
          enabled: false,
          speed: {x: [10,0,40,1], y: [10,0,40,1], zoom: [0.02,0,0.1,0.005]},
          bindToWindow: true
        }
      },
      manipulation:{
        enabled: false,
        initiallyVisible: false,
        locale: ['en','nl'],
        functionality:{
          addNode: true,
          addEdge: true,
          editNode: true,
          editEdge: true,
          deleteNode: true,
          deleteEdge: true
        }
      },
      physics: {
        barnesHut: {
          theta: [0.5,0.1,1,0.05],
          gravitationalConstant: [-2000,-300000,0,50],
          centralGravity: [0.3,0,10,0.05],
          springLength: [95,0,500,5],
          springConstant: [0.04,0,5,0.005],
          damping: [0.09,0,1,0.01]
        },
        repulsion: {
          centralGravity: [0.2,0,10,0.05],
          springLength:  [200,0,500,5],
          springConstant: [0.05,0,5,0.005],
          nodeDistance:  [100,0,500,5],
          damping: [0.09,0,1,0.01]
        },
        hierarchicalRepulsion: {
          centralGravity: 0.2,
          springLength: [100,0,500,5],
          springConstant: [0.01,0,5,0.005],
          nodeDistance: [120,0,500,5],
          damping: [0.09,0,1,0.01]
        },
        maxVelocity: [50,0,150,1],
        minVelocity: [0.1,0.01,0.5,0.01],
        solver: ['BarnesHut','Repulsion','HierarchicalRepulsion'],
        timestep: [0.5,0,1,0.05]
      },
      selection:{
        select: true,
        selectConnectedEdges: true
      },
      renderer: {
        hideEdgesOnDrag: false,
        hideNodesOnDrag: false
      }
    }

    this.actualOptions = {};

    this.domElements = [];
  }

  setOptions(options) {
    if (options !== undefined) {
      util.deepExtend(this.actualOptions, options);

      if (options.configure !== undefined && options.configure !== false) {
        let config;
        if (options.configure instanceof Array) {
          config = options.configure.join();
        }
        else if (typeof options.configure === 'string') {
          config = options.configure;
        }
        else if (typeof options.configure === 'boolean') {
          config = options.configure;
        }
        else {
          this._clean();
          throw new Error("the option for configure has to be either a string, boolean or an array. Supplied:" + options.configure);
          return;
        }
        this._create(config);
      }
      else {
        this._clean();
      }
    }
  }

  /**
   *
   * @param {Boolean | String} config
   * @private
   */
  _create(config) {
    this._clean();

    for (let option in this.possibleOptions) {
      if (this.possibleOptions.hasOwnProperty(option)) {
        if (config === true || config.indexOf(option) !== -1) {
          let optionObj = this.possibleOptions[option];
          // a header for the category
          this._makeHeader(option);

          // get the suboptions
          for (let subOption in optionObj) {
            if (optionObj.hasOwnProperty(subOption)) {
              this._makeLabel(subOption);
              let subOptionObj = optionObj[subOption];
              if (subOptionObj instanceof Array) {
                this._handleArray(option, subOption, subOptionObj);
              }
              else if (subOptionObj instanceof Object) {
                this._handleObject(option, subOption, subOptionObj);
              }
              else if (typeof subOptionObj === 'string') {
                this._handleString(option, subOption, subOptionObj);
              }
              else if (typeof subOptionObj === 'boolean') {
                this._handleBoolean(option, subOption, subOptionObj);
              }
              else {
                console.error("dont know how to handle", subOptionObj);
              }
            }
          }
        }
      }
    }
  }

  _clean() {

  }

  _makeHeader(name) {
    console.log("header",name);
    //let div = document.createElement('div');
    //div.className = 'vis-network-configuration header';
    //div.innerHTML = name;
    //this.domElements.push(div);
  }

  _makeLabel(name) {
    console.log("label",name);
    //let div = document.createElement('div');
    //div.className = 'vis-network-configuration label';
    //div.innerHTML = name;
    //this.domElements.push(div);
  }

  _handleObject(category, subcategory, obj) {
    console.log("obj",obj);
  }

  _handleArray(category, subcategory, arr) {
    console.log("arr",arr);
  }

  _handleString(category, subcategory, string) {
    console.log("string",string);
  }

  _handleBoolean(category, subcategory, boolean) {
    console.log("boolean",boolean);
  }
}


export default ConfigurationSystem;