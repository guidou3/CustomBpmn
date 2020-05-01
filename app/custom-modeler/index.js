import Modeler from 'bpmn-js/lib/Modeler';

import {
  assign,
  isArray, isObject
} from 'min-dash';

import inherits from 'inherits';

import {isCustomConnection} from "./custom/Types";

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
  if (!isObject(customElements))
    throw new Error('argument must be an object');

  if(!isArray(customElements.diagram) )
    throw new Error('missing diagram');

  var shapes = [],
      connections = [];

  customElements.diagram.forEach(function(customElement) {
    if (isCustomConnection(customElement)) {
      connections.push(customElement);
    } else {
      shapes.push(customElement);
    }
    // if(customElement.type === 'custom:ConsequenceTimedFlow' || customElement.type === 'custom:TimeDistance') {
    //   shapes.push(customElement.timeSlot)
    //   connections = connections.concat(customElement.connections)
    // }
    // else {
    //   connections.push(customElement);
    // }
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

function parseTime2(time) {
  let array = time.split(",").map((line) => {
    line = line.trim()
    let ineq = line.substring(0, line.search(/[ |\d]/))
  })

}

function parseTime(text, bool) {
  if(text == null)
    return null
  let pos = text.search(/[ \d]/);
  if(pos === -1)
    console.error("Time is in an invalid form.")

  let timeString = text.substring(pos).trim();
  let pos2 = timeString.search(/[ \D]/);
  let reg ="(<|<=|>|>=|==|!=)[ ]*([0-9]+)[ ]*(.*)";
  if(bool)
    reg = "(Start|End)(-(Start|End))*[ ]*" + reg
  let obj = text.match(new RegExp(reg))
  return {
    sourceSide: obj[1],
    targetSide: obj[3],
    ineq: obj[4],
    time: obj[5],
    timeUnit: obj[6],
  }
}

function createConsequence(item) {
  return {
    id: item.id,
    type: 'Consequence',
    sourceSide: 'End',
    targetSide: 'Start',
    source: item.source,
    target: item.target
  }
}

function createConsequenceTimed(item, timeString) {
  let obj = parseTime(timeString, true)
  if(obj == null) return null
  return Object.assign(createConsequence(item), {
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit,
    },
    ineq: obj.ineq,
    sourceSide: obj.sourceSide,
    targetSide: obj.targetSide
  })
}

function createTimeDistance(item, timeString) {
  let obj = parseTime(timeString, true)
  if(obj == null) return null
  return {
    id: item.id,
    type: 'TimeDistance',
    side: obj.sourceSide,
    source: item.source,
    target: item.target,
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit,
    },
    ineq: obj.ineq
  }
}

function createTaskDuration(item, timeString) {
  let obj = parseTime(timeString, false)
  if(obj == null) return null
  return {
    id: item.id,
    type: 'TaskDuration',
    task: item.connections[0].source.includes('TimeSlot') ? item.connections[0].target : item.connections[0].source,
    timeData: {
      time: obj.time,
      timeUnit: obj.timeUnit,
    },
    ineq: obj.ineq
  }
}

function getResType(item) {
  if(item.type.includes("Absence"))
    return "Absence"
  else {
    if(item.text)
      return "Instance"
    else
      return "Occurrence"
  }
}

function createRRG(item, type) {
  return {
    id: item.id,
    type: type,
    name: item.text,
    transitions: [],
    resType: getResType(item)
  }
}

function createTimeInstance(item) {
  console.log(item.text)
  let obj = item.text.match(new RegExp("(Before|After)[ ]*(Start|End)?[ ]*(.*)"))
  console.log(obj)

  return {
    id: item.id,
    type: "TimeInstance",
    task: null,
    side: obj[1] === "Before" ? 'Start' : 'End',
    transitionSide: obj[2] || 'End', //TODO: implementare la posizione di partenza / fine
    timestamp: obj[3]
  }
}

function changeListRRG(list, source, target) {
  for(let i=0; i < list.length; i++) {
    if(list[i].id === source)
      list[i].transitions.push(target)
  }
  return list;
}

function insertResourceArcData(obj, connection) {
  let source, target;
  if(!connection.source.includes('Task')) {
    source = connection.source;
    target = connection.target;
  }
  else {
    source = connection.target;
    target = connection.source;
  }

  if(source.includes('Resource'))
    obj.resources = changeListRRG(obj.resources, source, target)
  else if(source.includes('Role'))
    obj.roles = changeListRRG(obj.roles, source, target)
  else if(source.includes('Group'))
    obj.groups = changeListRRG(obj.groups, source, target)
  else if(source.includes('Clock')) {
    for(let i=0; i < obj.timeInstances.length; i++)
      if(obj.timeInstances[i].id === source) {
        if(obj.timeInstances[i].task)
          console.error("Multiple arcs to a clock. Not implemented.")
        else
          obj.timeInstances[i].task = target
      }
  }

  return obj;
}

CustomModeler.prototype.getJson = function () {
  // dividere shape e connections
  // individuare le connessioni che partono/arrivano dallo stesso oggetto custom
  let obj = {
    consequences: [],
    consequencesTimed: [],
    timeDistances: [],
    timeInstances: [],
    taskDurations: [],
    resources: [],
    roles: [],
    groups: [],
    timeSlots: [],
    timeConnections: []
  }
  obj = this._customElements.reduce((res, item) => {

    if(isCustomConnection(item)) {
      if(item.source.includes("TimeSlot") || item.target.includes("TimeSlot"))
        res.timeConnections.push(item)
      else if(item.type === 'custom:ResourceArc')
        res = insertResourceArcData(res, item)
      else // consequences
        res.consequences.push(createConsequence(item))
    }
    else {
      if(item.type === "custom:TimeSlot")
        res.timeSlots.push(item)
      else if(item.type.includes("custom:Resource"))
        res.resources.push(createRRG(item, "Resource"))
      else if(item.type.includes("custom:Role"))
        res.roles.push(createRRG(item, "Role"))
      else if(item.type.includes("custom:Group"))
        res.groups.push(createRRG(item, "Group"))
      else if(item.type === 'custom:Clock')
        res.timeInstances.push(createTimeInstance(item))
    }
    return res;
  }, obj);

  let elements = obj.timeSlots.reduce((res, obj) => {
    res[obj.id] = {
      occurrences: 0,
      timeSlot: obj,
      connections: []
    }
    return res
  }, {})

  for(let i=0; i<obj.timeConnections.length; i++) {
    let id = obj.timeConnections[i].source.includes("TimeSlot") ? obj.timeConnections[i].source : obj.timeConnections[i].target
    elements[id].occurrences += 1
    elements[id].connections.push(obj.timeConnections[i])
  }
  let counter = 1;
  Object.values(elements).forEach((item) => {
    if(item.occurrences === 0) {
      // window.alert("TimeSlot without connections")
    }
    else if(item.occurrences === 1) {
      if(item.connections[0].type === 'custom:ResourceArc') {
        obj.taskDurations.push(createTaskDuration(item, item.timeSlot.text))
      }
      else {
        console.error("TimeSlot with wrong connection")
      }
    }
    else if(item.occurrences > 2) {
      console.error("TimeSlot with too many connections")
    }
    else {
      if((item.connections[0].type === 'custom:ResourceArc' && item.connections[1].type === 'custom:ConsequenceFlow'))
        obj.consequencesTimed.push(createConsequenceTimed({
          id: 'ConsequenceTimedFlow_' + counter,
          source: item.connections[0].source,
          target: item.connections[1].target,
        }, item.timeSlot.text))
      else if(item.connections[1].type === 'custom:ResourceArc' && item.connections[0].type === 'custom:ConsequenceFlow')
        obj.consequencesTimed.push(createConsequenceTimed({
          id: 'ConsequenceTimedFlow_' + counter,
          source: item.connections[1].source,
          target: item.connections[0].target,
        }, item.timeSlot.text))
      else if((item.connections[0].type === 'custom:TimeDistanceArcStart' && item.connections[1].type === 'custom:TimeDistanceArcEnd'))
        obj.timeDistances.push(createTimeDistance({
          id: 'TimeDistance_'+counter,
          source: item.connections[0].source,
          target: item.connections[1].target,
        }, item.timeSlot.text))
      else if(item.connections[1].type === 'custom:TimeDistanceArcStart' && item.connections[0].type === 'custom:TimeDistanceArcEnd')
        obj.timeDistances.push(createTimeDistance({
          id: 'TimeDistance_'+counter,
          source: item.connections[1].source,
          target: item.connections[0].target,
        }, item.timeSlot.text))
      counter++;
    }
  })

  delete obj.timeSlots;
  delete obj.timeConnections
  
  // resArc + timeslot = TimeCostraint
  // resArc + ts + cflow = ConsequenceTimedFlow
  // TimeDisStartArc + ts + tdea = TimeDistance
  //
  console.log(this._customElements)
  console.log(obj)
  return {
    definitions: obj,
    diagram: this._customElements
  }
}
