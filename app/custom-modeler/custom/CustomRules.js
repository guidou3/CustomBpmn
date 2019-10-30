import {
  reduce
} from 'min-dash';

import inherits from 'inherits';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import {isAny} from "bpmn-js/lib/features/modeling/util/ModelingUtil";

var HIGH_PRIORITY = 1500;


function isCustom(element) {
  return element && /^custom:/.test(element.type);
}

function isConsequence(element) {
  return element && (element.type === 'custom:ConsequenceFlow' || element.type === 'custom:ConsequenceTimedFlow')
}

/**
 * Specific rules for custom elements
 */
export default function CustomRules(eventBus) {
  RuleProvider.call(this, eventBus);

}

inherits(CustomRules, RuleProvider);

CustomRules.$inject = [ 'eventBus' ];


CustomRules.prototype.init = function() {

  /**
   * Can shape be created on target container?
   */
  function canCreate(shape, target) {

    // only judge about custom elements
    if (!isCustom(shape)) {
      return;
    }

    // allow creation on processes
    return is(target, 'bpmn:Process') || is(target, 'bpmn:Participant') || is(target, 'bpmn:Collaboration');
  }

  /**
   * Can source and target be connected?
   */
  function canConnect(source, target, type) {

    // only judge about custom elements
    if (!isCustom(source) && !isCustom(target)) {
      if(type) {
        return { type: type };
      }
      else return;
    }

    // allow connection between custom shape and task
    if (isCustom(source)) {
      if (is(target, 'bpmn:Task')) {
        return { type: 'custom:ResourceArc' };
      }
      else
        return false;

    }
    else if (isCustom(target)) {
      if (is(source, 'bpmn:Task')) {
        return { type: 'custom:ResourceArc' };
      }
       else
        return false;

    }

  }

  function canReconnect(source, target, connection) {
    if(!isCustom(connection) && !isCustom(source) && !isCustom(target))
      return;
    else if(isConsequence(connection) && !isCustom(source) && !isCustom(target)) {
      console.log("all ok")
      return { type: connection.type }
    }

    else {
      console.log("should not")
      console.log(connection.type)
      console.log(isCustom(source))
      console.log(isCustom(target))
      return canConnect(source, target, connection.type)
    }

  }

  this.addRule('elements.move', HIGH_PRIORITY, function(context) {

    var target = context.target,
        shapes = context.shapes;

    var type;

    // do not allow mixed movements of custom / BPMN shapes
    // if any shape cannot be moved, the group cannot be moved, too
    var allowed = reduce(shapes, function(result, s) {
      if (type === undefined) {
        type = isCustom(s);
      }

      if (type !== isCustom(s) || result === false) {
        return false;
      }

      return canCreate(s, target);
    }, undefined);

    // reject, if we have at least one
    // custom element that cannot be moved
    return allowed;
  });

  this.addRule('shape.create', HIGH_PRIORITY, function(context) {
    var target = context.target,
        shape = context.shape;

    return canCreate(shape, target);
  });

  this.addRule('shape.resize', HIGH_PRIORITY, function(context) {
    var shape = context.shape;

    if (isCustom(shape)) {
      // cannot resize custom elements
      return false;
    }
  });

  this.addRule('connection.create', HIGH_PRIORITY, function(context) {
    var source = context.source,
        target = context.target,
        type = context.type;

    return canConnect(source, target, type);
  });

  this.addRule('connection.reconnectStart', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = context.hover || context.source,
        target = connection.target;

    return canReconnect(source, target, connection);
  });

  this.addRule('connection.reconnectEnd', HIGH_PRIORITY*2, function(context) {
    console.log("called re custom")
    var connection = context.connection,
        source = connection.source,
        target = context.hover || context.target;

    return canReconnect(source, target, connection);
  });

};
