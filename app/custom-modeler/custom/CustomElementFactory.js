import {
  assign
} from 'min-dash';

import inherits from 'inherits';

import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import {
  DEFAULT_LABEL_SIZE
} from 'bpmn-js/lib/util/LabelUtil';
import BaseElementFactory from "diagram-js/lib/core/ElementFactory";
import {is} from "bpmn-js/lib/util/ModelUtil";


/**
 * A custom factory that knows how to create BPMN _and_ custom elements.
 */
export default function CustomElementFactory(bpmnFactory, moddle) {
  BpmnElementFactory.call(this, bpmnFactory, moddle);

  var self = this;

  /**
   * Create a diagram-js element with the given type (any of shape, connection, label).
   *
   * @param  {String} elementType
   * @param  {Object} attrs
   *
   * @return {djs.model.Base}
   */
  this.create = function(elementType, attrs) {
    var type = attrs.type;

    if (elementType === 'label') {
      return self.baseCreate(elementType, assign({ type: 'label' }, DEFAULT_LABEL_SIZE, attrs));
    }

    // add type to businessObject if custom
    if (/^custom:/.test(type)) {
      if (!attrs.businessObject) {
        attrs.businessObject = {
          type: type
        };

        if (attrs.id) {
          assign(attrs.businessObject, {
            id: attrs.id
          });
        }
      }

      // add width and height if shape
      if (!/:connection$/.test(type)) {
        assign(attrs, self._getCustomElementSize(type));
      }


      // we mimic the ModdleElement API to allow interoperability with
      // other components, i.e. the Modeler and Properties Panel

      if (!('$model' in attrs.businessObject)) {
        Object.defineProperty(attrs.businessObject, '$model', {
          value: moddle
        });
      }

      if (!('$instanceOf' in attrs.businessObject)) {
        // ensures we can use ModelUtil#is for type checks
        Object.defineProperty(attrs.businessObject, '$instanceOf', {
          value: function(type) {
            return this.type === type;
          }
        });
      }

      if (!('get' in attrs.businessObject)) {
        Object.defineProperty(attrs.businessObject, 'get', {
          value: function(key) {
            return this[key];
          }
        });
      }

      if (!('set' in attrs.businessObject)) {
        Object.defineProperty(attrs.businessObject, 'set', {
          value: function(key, value) {
            return this[key] = value;
          }
        });
      }

      // END minic ModdleElement API

      return self.baseCreate(elementType, attrs);
    }

    return self.createBpmnElement(elementType, attrs);
  };
}

inherits(CustomElementFactory, BpmnElementFactory);

CustomElementFactory.$inject = [
  'bpmnFactory',
  'moddle'
];

CustomElementFactory.prototype.baseCreate2 = BaseElementFactory.prototype.create;

CustomElementFactory.prototype.baseCreate = function(type, attrs) {
  console.log(type)
  console.log(attrs)
  return this.baseCreate2(type, attrs)
}

// CustomElementFactory.prototype.create = function(elementType, attrs) {
//   console.log("called")
//   // no special magic for labels,
//   // we assume their businessObjects have already been created
//   // and wired via attrs
//   if (elementType === 'label') {
//     return this.baseCreate(elementType, assign({ type: 'label' }, DEFAULT_LABEL_SIZE, attrs));
//   }
//
//   return this.createBpmnElement(elementType, attrs);
// };

CustomElementFactory.prototype.createCustomElement = function(elementType, attrs) {
  var size,
      translate = this._translate;

  attrs = attrs || {};

  var businessObject = attrs.businessObject;

  if (!businessObject) {
    if (!attrs.type) {
      throw new Error(translate('no shape type specified'));
    }

    businessObject = this._bpmnFactory.create(attrs.type);
  }

  if (!businessObject.di) {
    if (elementType === 'root') {
      businessObject.di = this._bpmnFactory.createDiPlane(businessObject, [], {
        id: businessObject.id + '_di'
      });
    } else
    if (elementType === 'connection') {
      businessObject.di = this._bpmnFactory.createDiEdge(businessObject, [], {
        id: businessObject.id + '_di'
      });
    } else {
      businessObject.di = this._bpmnFactory.createDiShape(businessObject, {}, {
        id: businessObject.id + '_di'
      });
    }
  }

  if (is(businessObject, 'bpmn:Group')) {
    attrs = assign({
      isFrame: true
    }, attrs);
  }

  if (attrs.di) {
    assign(businessObject.di, attrs.di);

    delete attrs.di;
  }

  applyAttributes(businessObject, attrs, [
    'processRef',
    'isInterrupting',
    'associationDirection',
    'isForCompensation'
  ]);

  if (attrs.isExpanded) {
    applyAttribute(businessObject.di, attrs, 'isExpanded');
  }

  if (is(businessObject, 'bpmn:ExclusiveGateway')) {
    businessObject.di.isMarkerVisible = true;
  }

  var eventDefinitions,
      newEventDefinition;

  if (attrs.eventDefinitionType) {
    eventDefinitions = businessObject.get('eventDefinitions') || [];
    newEventDefinition = this._moddle.create(attrs.eventDefinitionType);

    if (attrs.eventDefinitionType === 'bpmn:ConditionalEventDefinition') {
      newEventDefinition.condition = this._moddle.create('bpmn:FormalExpression');
    }

    eventDefinitions.push(newEventDefinition);

    newEventDefinition.$parent = businessObject;
    businessObject.eventDefinitions = eventDefinitions;

    delete attrs.eventDefinitionType;
  }

  size = this._getDefaultSize(businessObject);

  attrs = assign({
    businessObject: businessObject,
    id: businessObject.id
  }, size, attrs);

  return this.baseCreate(elementType, attrs);
};


CustomElementFactory.prototype._getCustomElementSize = function(type) {
  var shapes = {
    __default: { width: 100, height: 80 },
    'custom:Clock': { width: 50, height: 50 },
    'custom:TimeSlot': { width: 100, height: 30 },
    'custom:Resource': { width: 50, height: 75 },
    'custom:ResourceAbsence': { width: 50, height: 75 },
    'custom:ResourceInstance': { width: 50, height: 75 },
    'custom:Role': { width: 50, height: 75 },
    'custom:RoleAbsence': { width: 50, height: 75 },
    'custom:RoleInstance': { width: 50, height: 75 },
    'custom:Group': { width: 60, height: 80 },
    'custom:GroupAbsence': { width: 60, height: 80 },
    'custom:GroupInstance': { width: 60, height: 80 },
  };

  return shapes[type] || shapes.__default;
};
