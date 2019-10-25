import inherits from 'inherits';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  componentsToPath,
  createLine
} from 'diagram-js/lib/util/RenderUtil';

import {
  query as domQuery
} from 'min-dom';

import {
  append as svgAppend,
  attr as svgAttr,
  classes as svgClasses,
  create as svgCreate
} from 'tiny-svg';
import {getFillColor, getSemantic, getStrokeColor} from "bpmn-js/lib/draw/BpmnRenderUtil";
import {assign} from "min-dash";
import {getLabel} from "./utils/LabelUtil";

// import * as svg from 'tiny-svg'

import Ids from 'ids';

var RENDERER_IDS = new Ids();

var COLOR_GREEN = '#52B415',
    COLOR_RED = '#cc0000',
    COLOR_YELLOW = '#ffc800',
    BLACK = '#000';

/**
 * A renderer that knows how to render custom elements.
 */
export default function CustomRenderer(eventBus, styles, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 2000);

  var computeStyle = styles.computeStyle;

  var rendererId = RENDERER_IDS.next();

  var markers = {};

  function renderLabel(parentGfx, label, options) {

    options = assign({
      size: {
        width: 100
      }
    }, options);

    var text = textRenderer.createText(label || '', options);

    svgClasses(text).add('djs-label');

    svgAppend(parentGfx, text);

    return text;
  }

  function renderEmbeddedLabel(parentGfx, element, align) {
    var semantic = getSemantic(element);

    return renderLabel(parentGfx, semantic.text, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: '#000'
      }
    });
  }

  function renderExternalLabel(parentGfx, element) {
    var semantic = getSemantic(element);
    var box = {
      width: 90,
      height: 10,
      x: element.width / 2 + element.x,
      y: element.height /2 + element.y
    };

    return renderLabel(parentGfx, semantic.text, {
      box: box,
      fitBox: true,
      style: assign(
          {},
          textRenderer.getExternalStyle(),
          {
            fill: '#000'
          }
      )
    });
  }

  function createPathFromConnection(connection) {
    var waypoints = connection.waypoints;

    var pathData = 'm  ' + waypoints[0].x + ',' + waypoints[0].y;
    for (var i = 1; i < waypoints.length; i++) {
      pathData += 'L' + waypoints[i].x + ',' + waypoints[i].y + ' ';
    }
    return pathData;
  }

  function addMarker(id, options) {
    var attrs = assign({
      fill: 'black',
      strokeWidth: 1,
      strokeLinecap: 'round',
      strokeDasharray: 'none'
    }, options.attrs);

    var ref = options.ref || { x: 0, y: 0 };

    var scale = options.scale || 1;

    // fix for safari / chrome / firefox bug not correctly
    // resetting stroke dash array
    if (attrs.strokeDasharray === 'none') {
      attrs.strokeDasharray = [10000, 1];
    }

    var marker = svgCreate('marker');

    svgAttr(options.element, attrs);

    svgAppend(marker, options.element);

    svgAttr(marker, {
      id: id,
      viewBox: '0 0 20 20',
      refX: ref.x,
      refY: ref.y,
      markerWidth: 20 * scale,
      markerHeight: 20 * scale,
      orient: 'auto'
    });

    var defs = domQuery('defs', canvas._svg);

    if (!defs) {
      defs = svgCreate('defs');

      svgAppend(canvas._svg, defs);
    }

    svgAppend(defs, marker);

    markers[id] = marker;
  }

  function colorEscape(str) {
    return str.replace(/[()\s,#]+/g, '_');
  }

  function marker(type, fill, stroke) {
    var id = type + '-' + colorEscape(fill) + '-' + colorEscape(stroke) + '-' + rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return 'url(#' + id + ')';
  }

  function createMarker(id, type, fill, stroke) {

    if (type === 'sequenceflow-end') {
      var sequenceflowEnd = svgCreate('path');
      svgAttr(sequenceflowEnd, { d: 'M 1 5 L 11 10 L 1 15 Z' });

      addMarker(id, {
        element: sequenceflowEnd,
        ref: { x: 11, y: 10 },
        scale: 0.5,
        attrs: {
          fill: stroke,
          stroke: stroke
        }
      });
    }

    if (type === 'messageflow-start') {
      var messageflowStart = svgCreate('circle');
      svgAttr(messageflowStart, { cx: 6, cy: 6, r: 3.5 });

      addMarker(id, {
        element: messageflowStart,
        attrs: {
          fill: fill,
          stroke: stroke
        },
        ref: { x: 6, y: 6 }
      });
    }

    if (type === 'messageflow-end') {
      var messageflowEnd = svgCreate('path');
      svgAttr(messageflowEnd, { d: 'm 1 5 l 0 -3 l 7 3 l -7 3 z' });

      addMarker(id, {
        element: messageflowEnd,
        attrs: {
          fill: fill,
          stroke: stroke,
          strokeLinecap: 'butt'
        },
        ref: { x: 8.5, y: 5 }
      });
    }

    if (type === 'association-start') {
      var associationStart = svgCreate('path');
      svgAttr(associationStart, { d: 'M 11 5 L 1 10 L 11 15' });

      addMarker(id, {
        element: associationStart,
        attrs: {
          fill: 'none',
          stroke: stroke,
          strokeWidth: 1.5
        },
        ref: { x: 1, y: 10 },
        scale: 0.5
      });
    }

    if (type === 'association-end') {
      var associationEnd = svgCreate('path');
      svgAttr(associationEnd, { d: 'M 1 5 L 11 10 L 1 15' });

      addMarker(id, {
        element: associationEnd,
        attrs: {
          fill: 'none',
          stroke: stroke,
          strokeWidth: 1.5
        },
        ref: { x: 12, y: 10 },
        scale: 0.5
      });
    }

    if (type === 'conditional-flow-marker') {
      var conditionalflowMarker = svgCreate('path');
      svgAttr(conditionalflowMarker, { d: 'M 0 10 L 8 6 L 16 10 L 8 14 Z' });

      addMarker(id, {
        element: conditionalflowMarker,
        attrs: {
          fill: fill,
          stroke: stroke
        },
        ref: { x: -1, y: 10 },
        scale: 0.5
      });
    }

    if (type === 'conditional-default-flow-marker') {
      var conditionaldefaultflowMarker = svgCreate('path');
      svgAttr(conditionaldefaultflowMarker, { d: 'M 6 4 L 10 16' });

      addMarker(id, {
        element: conditionaldefaultflowMarker,
        attrs: {
          stroke: stroke
        },
        ref: { x: 0, y: 10 },
        scale: 0.5
      });
    }
  }

  function drawPath(parentGfx, d, attrs) {

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      strokeWidth: 2,
      stroke: 'black'
    });

    var path = svgCreate('path');
    svgAttr(path, { d: d });
    svgAttr(path, attrs);

    svgAppend(parentGfx, path);

    return path;
  }

  this.drawTimeSlot = function(p, width, height) {

    var attrs = computeStyle(attrs, {
      stroke: '#000',
      strokeWidth: 2,
      fill: '#fff'
    });

    var polygon = svgCreate('rect');

    svgAttr(polygon, {
      width: width, //120
      height: height, //40 ideally
	  rx: 30,
	  ry: 30
    });

    svgAttr(polygon, attrs);

    svgAppend(p, polygon);

    return polygon;
  };

  this.drawClock = function(p, width, height){

    var attrs = computeStyle(attrs, {
      stroke: '#000',
      strokeWidth: 2,
      fill: '#fff'
    });

    var path = svgCreate('path');

    var d = [
      ['M', 0 , 0],
      ['h', 50 ],
      ['v', 50 ],
      ['h', -50 ],
      ['v', -50 ],
      ['h', 5 ],
      ['m', 0, 5],
      ['h', 40 ],
      ['v', 40 ],
      ['h', -40 ],
      ['v', -40 ],
      ['h', 20 ],
      ['m', 0, 1],
      ['a', 15, 15, 79, 0, 0, 0, 38],
      ['a', 15, 15, 79, 0, 0, 0, -38],
      ['m', 0 , 19],
      ['l', 5, -10 ],
      ['m', -5 , 10],
      ['l', 12, 10 ],
      ['z']
    ]

    svgAttr(path, {
      width: width,
      height: height,
      d: componentsToPath(d)
    });

    svgAttr(path, attrs);

    svgAppend(p, path);

    return path;
  };

  this.drawResourceDefault = function(p, element, color) {

    var attrs = computeStyle(attrs, {
      stroke: color,
      strokeWidth: 2,
      fill: '#fff'
    });

    var path = svgCreate('path');

    var d = [
      ['M', 30 , 8],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['M', 20 , 8],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['M', 20 , 17],
      ['h', 10 ],
      ['M', 35 , 25],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ]

    svgAttr(path, {
      width: element.width,
      height: element.height,
      d: componentsToPath(d),
      text: 'prova'
    });

    svgAttr(path, attrs);

    svgAppend(p, path);
    renderExternalLabel(p, element);

    return path;
  };

  this.drawResource = function(p, element) {
    return this.drawResourceDefault(p, element, '#808080')
  }

  this.drawResourceInstance = function(p, element) {
    return this.drawResourceDefault(p, element, '#000')
  }

  this.drawResourceAbsence = function(p, width, height) {

    var attrs = computeStyle(attrs, {
      stroke: '#000',
      strokeWidth: 2,
      fill: '#fff'
    });

    var path = svgCreate('path');

    var d = [
      ['M', 30 , 8],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['M', 20 , 8],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['M', 20 , 17],
      ['h', 10 ],
      ['M', 35 , 25],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['M', -5 , -5],
      ['l', 60, 85],
      ['M', 55 , -5],
      ['l', -60, 85],
      ['z']
    ]

    svgAttr(path, {
      width: width,
      height: height,
      d: componentsToPath(d)
    });

    svgAttr(path, attrs);

    svgAppend(p, path);

    return path;
  };

  this.drawRoleDefault = function(p, width, height, color) {

    var attrs = computeStyle(attrs, {
      stroke: color,
      strokeWidth: 2,
      fill: '#fff'
    });

    var path = svgCreate('path');

    var d = [
      ['M', 54 , 78],
      ['v', -78],
      ['h', -54],
      ['v', 78],
      ['h', 54],
      ['v', -5],
      ['M', 32 , 11],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['m', -10 , 0],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['m', 0 , 9],
      ['h', 10 ],
      ['m', 5 , 8],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ]

    svgAttr(path, {
      width: width,
      height: height,
      d: componentsToPath(d)
    });

    svgAttr(path, attrs);

    svgAppend(p, path);

    return path;
  };

  this.drawRole = function(p, width, height) {
    return this.drawRoleDefault(p, width, height, '#808080')
  }

  this.drawRoleInstance = function(p, width, height) {
    return this.drawRoleDefault(p, width, height, '#000')
  }

  this.drawRoleAbsence = function(p, width, height) {

    var attrs = computeStyle(attrs, {
      stroke: '#000',
      strokeWidth: 2,
      fill: '#fff'
    });

    var path = svgCreate('path');

    var d = [
      ['M', 54 , 78],
      ['v', -78],
      ['h', -54],
      ['v', 78],
      ['h', 54],
      ['v', -5],
      ['M', 32 , 11],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['m', -10 , 0],
      ['a', 1, 1, 0, 1, 0, 0, 3],
      ['a', 1, 1, 0, 1, 0, 0, -3],
      ['m', 0 , 9],
      ['h', 10 ],
      ['m', 5 , 8],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['M', 0 , 0],
      ['l', 54, 78],
      ['M', 54 , 0],
      ['l', -54, 78],
      ['z']
    ]

    svgAttr(path, {
      width: width,
      height: height,
      d: componentsToPath(d)
    });

    svgAttr(path, attrs);

    svgAppend(p, path);

    return path;
  };

  this.drawGroup = function(p, width, height, color, bool) {

    var attrs = computeStyle(attrs, {
      stroke: color,
      strokeWidth: 2,
      fill: '#fff'
    });
    var inner = svgCreate('svg')
    var path1 = svgCreate('path');
    var path2 = svgCreate('path');

    var d1 = [
      ['M', 42 , 26],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ]

    var d2 = [
      ['M', 37 , 28],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ]

    if(bool) {
      d2 = d2.concat([
        ['M', -5 , -5],
        ['l', 65, 90],
        ['M', 60 , -5],
        ['l', -65, 90],
      ])
    }
    svgAttr(inner, {
      width: width,
      height: height
    });
    svgAttr(path1, {
      width: width-5,
      height: height-2,
      d: componentsToPath(d1)
    });
    svgAttr(path2, {
      width: width-5,
      height: height-2,
      d: componentsToPath(d2)
    });

    svgAttr(path1, attrs);
    svgAttr(path2, attrs);

    svgAppend(inner, path1);
    svgAppend(inner, path2);

    svgAppend(p, inner);

    return inner;
  };

  this.getClockPath = function(element) {
    var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

    var d = [
      ['M', x , y],
      ['h', 50 ],
      ['v', 50 ],
      ['h', -50 ],
      ['v', -50 ],
      ['z']
    ]

    return componentsToPath(d);
  };

  this.getResourcePath = function(element) {
    var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

    var resourcePath = [
      ['M', x+35 , y+25],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ];

    return componentsToPath(resourcePath);
  };

  this.getRolePath = function(element) {
    var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


    var resourcePath = [
      ['M', x , y],
      ['v', 78],
      ['h', 54],
      ['v', -78],
      ['h', -54],
      ['z']
    ];

    return componentsToPath(resourcePath);
  };

  this.getGroupPath = function(element) {
    var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

    var resourcePath = [
      ['M', x+42 , y+26],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['M', x+37 , y+28],
      ['a', 14, 14, 79, 0, 0, 5, -10],
      ['a', 6, 6, 79, 0, 0, -30, 0],
      ['a', 14, 14, 79, 0, 0, 5, 10],
      ['a', 60, 60, 0, 0, 0, -15, 50],
      ['h', 50 ],
      ['a', 60, 60, 0, 0, 0, -15, -50],
      ['z']
    ];

    return componentsToPath(resourcePath);
  };

  this.drawResourceArc = function(p, element) {
    var attrs = computeStyle(attrs, {
      stroke: BLACK,
      strokeWidth: 1.5,
      strokeDasharray: [10,10]
    });

    return svgAppend(p, createLine(element.waypoints, attrs));
  };

  this.drawConsequenceFlow = function (p, element) {
    var pathData = createPathFromConnection(element);
    var attrs = {
      strokeLinejoin: 'round',
      markerEnd: marker('sequenceflow-end', 'white', BLACK),
      stroke: BLACK
    };

    let path = drawPath(p, pathData, attrs);
    var sequenceFlow = getSemantic(element);
    console.log(sequenceFlow)

    return path
  }

  this.getResourceArcPath = function(connection) {
    var waypoints = connection.waypoints.map(function(p) {
      return p.original || p;
    });

    var connectionPath = [
      ['M', waypoints[0].x, waypoints[0].y]
    ];

    waypoints.forEach(function(waypoint, index) {
      if (index !== 0) {
        connectionPath.push(['L', waypoint.x, waypoint.y]);
      }
    });

    return componentsToPath(connectionPath);
  };
}

inherits(CustomRenderer, BaseRenderer);

CustomRenderer.$inject = [ 'eventBus', 'styles', 'canvas', 'textRenderer' ];

CustomRenderer.prototype.canRender = function(element) {
  return /^custom:/.test(element.type);
};

CustomRenderer.prototype.drawShape = function(p, element) {
  var type = element.type;

  if (type === 'custom:clock') {
    return this.drawClock(p, element.width, element.height);
  }

  if (type === 'custom:resource') {
    return this.drawResource(p, element);
  }

  if (type === 'custom:resource-absence') {
    return this.drawResourceAbsence(p, element.width, element.height);
  }

  if (type === 'custom:resource-instance') {
    return this.drawResourceInstance(p, element);
  }

  if (type === 'custom:role') {
    return this.drawRole(p, element.width, element.height);
  }

  if (type === 'custom:role-absence') {
    return this.drawRoleAbsence(p, element.width, element.height);
  }

  if (type === 'custom:role-instance') {
    return this.drawRoleInstance(p, element.width, element.height);
  }

  if (type === 'custom:group') {
    return this.drawGroup(p, element.width, element.height, '#808080', false);
  }

  if (type === 'custom:group-absence') {
    return this.drawGroup(p, element.width, element.height, '#000', true);
  }

  if (type === 'custom:group-instance') {
    return this.drawGroup(p, element.width, element.height, '#000', false);
  }



};

CustomRenderer.prototype.getShapePath = function(shape) {
  var type = shape.type;

  if (type === 'custom:clock') {
    return this.getClockPath(shape);
  }

  if (type === 'custom:resource' || type === 'custom:resource-absence' || type === 'custom:resource-instance') {
    return this.getResourcePath(shape);
  }

  if (type === 'custom:role' || type === 'custom:role-absence' || type === 'custom:role-instance') {
    return this.getRolePath(shape);
  }

  if (type === 'custom:group' || type === 'custom:group-absence' || type === 'custom:group-instance') {
    return this.getGroupPath(shape);
  }


};

CustomRenderer.prototype.drawConnection = function(p, element) {

  var type = element.type;

  if (type === 'custom:resource-arc') {
    return this.drawResourceArc(p, element);
  }

  if (type === 'custom:consequence') {
    return this.drawConsequenceFlow(p, element);
  }


};

CustomRenderer.prototype.getConnectionPath = function(connection) {

  var type = connection.type;

  if (type === 'custom:resource-arc' || type === 'custom:consequence' ) {
    return this.getResourceArcPath(connection);
  }

};
