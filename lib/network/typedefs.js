// NOTE: When a typedef is isolated in a separate comment block, an actual description is generated for it,
//       using the rest of the commenting in the code block. Usage of typedef in other comments then
//       link to there. TIL.
//
//       Also noteworthy, all typedef's set up in this manner are collected in a single, global page 'global.html'.
//       In other words, it doesn't matter *where* the typedef's are defined in the code.
//
//
// TODO: add descriptive commenting to given typedef's

/**
 * @typedef {{type:string, point:Point, angle:number, length:number}} ArrowData
 *
 * Object containing instantiation data for a given endpoint.
 */

/**
 * @typedef {{x:number, y:number}} Point
 * 
 * A point in view-coordinates.
 */

/**
 * @typedef {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} ArrowOptions
 */

/**
 * @typedef {string|number} Id
 */

/**
 * @typedef {Id} NodeId
 */

/**
 * @typedef {Id} EdgeId
 */

/**
 * @typedef {Id} LabelId
 */

/**
 * @typedef {{x: number, y: number}} point
 */

/**
 * @typedef {{left: number, top: number, width: number, height: number}} rect
 */

/**
 * @typedef {{x: number, y:number, angle: number}} rotationPoint
 *
 * point to rotate around and the angle in radians to rotate. angle == 0 means no rotation
 */

/**
 * @typedef {{nodeId:NodeId}} nodeClickItem
 */

/**
 * @typedef {{nodeId:NodeId, labelId:LabelId}} nodeLabelClickItem
 */

/**
 * @typedef {{edgeId:EdgeId}} edgeClickItem
 */

/**
 * @typedef {{edgeId:EdgeId, labelId:LabelId}} edgeLabelClickItem
 */

/**
 * @typedef {'bold'|'ital'|'boldital'|'mono'|'normal'} MultiFontStyle
 *
 * The allowed specifiers of multi-fonts.
 */

/**
 * @typedef {{color:string, size:number, face:string, mod:string, vadjust:number}} MultiFontOptions
 *
 * The full set of options of a given multi-font.
 */

/**
 * @typedef {Array.<object>} Pile
 *
 * Sequence of option objects, the order is significant.
 * The sequence is used to determine the value of a given option.
 *
 * Usage principles:
 *
 *  - All search is done in the sequence of the pile.
 *  - As soon as a value is found, the searching stops.
 *  - prototypes are totally ignored. The idea is to add option objects used as prototypes
 *    to the pile, in the correct order.
 */
