import Modeler from 'bpmn-js/lib/Modeler';

import {
  assign,
  isArray, isObject
} from 'min-dash';

import inherits from 'inherits';

import {connections} from "./custom/Types";

import CustomModule from './custom';
import {isLabelExternal, getExternalLabelBounds} from "./custom/utils/LabelUtil";
import {getLabel} from "./custom/utils/LabelUtil";


export default function CustomModeler(options) {
  Modeler.call(this, options);

  this._customElements = [];
}

inherits(CustomModeler, Modeler);

CustomModeler.prototype._modules = [].concat(
    CustomModeler.prototype._modules,
    [
      CustomModule
    ]
);

/**
 * Add a single custom element to the underlying diagram
 *
 * @param {Object} customElement
 */
CustomModeler.prototype._addCustomShape = function(customElement) {

  this._customElements.push(customElement);

  var canvas = this.get('canvas'),
      elementFactory = this.get('elementFactory');

  var customAttrs = assign({ businessObject: customElement }, customElement);

  var customShape = elementFactory.create('shape', customAttrs);
  if (isLabelExternal(customElement) && getLabel(customShape)) {
    this.addLabel(customElement, customShape);
  }

  return canvas.addShape(customShape);

};

CustomModeler.prototype._addCustomConnection = function(customElement) {
  this._customElements.push(customElement);

  var canvas = this.get('canvas'),
      elementFactory = this.get('elementFactory'),
      elementRegistry = this.get('elementRegistry');

  var customAttrs = assign({ businessObject: customElement }, customElement);

  var connection = elementFactory.create('connection', assign(customAttrs, {
        source: elementRegistry.get(customElement.source),
        target: elementRegistry.get(customElement.target)
      }),
      elementRegistry.get(customElement.source).parent);
  if (isLabelExternal(customElement) && getLabel(connection)) {
    this.addLabel(customElement, connection);
  }
  // console.log(connection)

  return canvas.addConnection(connection);

};

/**
 * Add a number of custom elements and connections to the underlying diagram.
 *
 * @param {Array<Object>} customElements
 */
CustomModeler.prototype.addCustomElements = function(customElements) {

  if (!isObject(customElements)) {
    console.log(customElements)
    throw new Error('argument must be an object');
  }
  if(!isArray(customElements.shapes) || !isArray(customElements.connections))
    throw new Error('missing shapes or connections');

  var shapes = customElements.shapes,
      connections = [];

  customElements.connections.forEach(function(customElement) {
    if(customElement.type === 'custom:ConsequenceTimedFlow' || customElement.type === 'custom:TimeDistance') {
      shapes.push(customElement.timeSlot)
      connections = connections.concat(customElement.connections)
    }
    else {
      connections.push(customElement);
    }
  });

  // add shapes before connections so that connections
  // can already rely on the shapes being part of the diagram
  shapes.forEach(this._addCustomShape, this);

  connections.forEach(this._addCustomConnection, this);
};

function elementData(semantic, attrs) {
  return assign({
    id: semantic.id,
    type: semantic.$type,
    businessObject: semantic
  }, attrs);
}

/**
 * add label for an element
 */
CustomModeler.prototype.addLabel = function(semantic, element) {
  var bounds,
      text,
      label;

  var canvas = this.get('canvas'),
      elementFactory = this.get('elementFactory'),
      textRenderer = this.get('textRenderer')

  bounds = getExternalLabelBounds(semantic, element);

  text = getLabel(element);

  if (text) {

    // get corrected bounds from actual layouted text
    bounds = textRenderer.getExternalLabelBounds(bounds, text);
  }

  label = elementFactory.createLabel(elementData(semantic, {
    id: semantic.id + '_label',
    labelTarget: element,
    type: 'label',
    hidden: element.hidden || !getLabel(element),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  }));

  return canvas.addShape(label, element.parent);
};

/**
 * Get custom elements with their current status.
 *
 * @return {Array<Object>} custom elements on the diagram
 */
CustomModeler.prototype.getCustomElements = function() {
  return this._customElements;
};

CustomModeler.prototype.clear = function() {
  this._customElements = [];
  Modeler.prototype.clear.call(this)
};

CustomModeler.prototype.getJson = function () {
  // dividere shape e connections
  // individuare le connessioni che partono/arrivano dallo stesso oggetto custom
  let [shapes, connections, timeSlots, timeConnections] = this._customElements.reduce(([shapes, connections, timeSlots, timeConnections], obj) => {
    if(isCustomConnection(obj)) {
      if(obj.source.includes("TimeSlot") || obj.target.includes("TimeSlot"))
        return [shapes, connections, timeSlots, [...timeConnections, obj]]
      else
        return [shapes, [...connections, obj], timeSlots, timeConnections]
    }
    else {
      if(obj.type === "custom:TimeSlot")
        return [shapes, connections, [...timeSlots, obj], timeConnections]
      else
        return [[...shapes, obj], connections, timeSlots, timeConnections]
    }
  }, [[], [], [], []])

  let elements = timeSlots.reduce((res, obj) => {
    res[obj.id] = {
      occurrences: 0,
      timeSlot: obj,
      connections: []
    }
    return res
  }, {})

  for(let i=0; i<timeConnections.length; i++) {
    let id = timeConnections[i].source.includes("TimeSlot") ? timeConnections[i].source : timeConnections[i].target
    elements[id].occurrences += 1
    elements[id].connections.push(timeConnections[i])
  }

  Object.values(elements).forEach((obj) => {
    if(obj.occurrences === 0) {
      // window.alert("TimeSlot without connections")
    }
    else if(obj.occurrences === 1) {
      if(obj.connections[0].type === 'custom:ResourceArc') {
        shapes.push(obj.timeSlot)
        connections.push(obj.connections[0])
      }
      else {
        // window.alert("TimeSlot with wrong connection")
      }
    }
    else if(obj.occurrences > 2) {
      // window.alert("TimeSlot with too many connections")
    }
    else {
      if((obj.connections[0].type === 'custom:ResourceArc' && obj.connections[1].type === 'custom:ConsequenceFlow'))
        connections.push({
          type: 'custom:ConsequenceTimedFlow',
          source: obj.connections[0].source,
          target: obj.connections[1].target,
          time: obj.timeSlot.text,
          timeSlot: obj.timeSlot,
          connections: obj.connections
        })
      else if(obj.connections[1].type === 'custom:ResourceArc' && obj.connections[0].type === 'custom:ConsequenceFlow')
        connections.push({
          type: 'custom:ConsequenceTimedFlow',
          source: obj.connections[1].source,
          target: obj.connections[0].target,
          time: obj.timeSlot.text,
          timeSlot: obj.timeSlot,
          connections: obj.connections
        })
      else if((obj.connections[0].type === 'custom:TimeDistanceArcStart' && obj.connections[1].type === 'custom:TimeDistanceArcEnd'))
        connections.push({
          type: 'custom:TimeDistance',
          source: obj.connections[0].source,
          target: obj.connections[1].target,
          time: obj.timeSlot.text,
          timeSlot: obj.timeSlot,
          connections: obj.connections
        })
      else if(obj.connections[1].type === 'custom:TimeDistanceArcStart' && obj.connections[0].type === 'custom:TimeDistanceArcEnd')
        connections.push({
          type: 'custom:TimeDistance',
          source: obj.connections[1].source,
          target: obj.connections[0].target,
          time: obj.timeSlot.text,
          timeSlot: obj.timeSlot,
          connections: obj.connections
        })
    }
  })
  
  // resArc + timeslot = TimeCostraint
  // resArc + ts + cflow = ConsequenceTimedFlow
  // TimeDisStartArc + ts + tdea = TimeDistance
  //
  return {
    shapes: shapes,
    connections: connections
  }
}


function isCustomConnection(element) {
  return connections.includes(element.type)
}
