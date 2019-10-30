import {
  assign
} from 'min-dash';


/**
 * A palette that allows you to create BPMN _and_ custom elements.
 */
export default function PaletteProvider(palette, create, elementFactory, spaceTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._spaceTool = spaceTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

PaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool'
];


PaletteProvider.prototype.getPaletteEntries = function(element) {

  var actions  = {},
      create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool;


  function createAction(type, group, className, title, options) {

    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));

      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }

      create.start(event, shape);
    }

    var shortType = type.replace(/^bpmn:/, '');

    return {
      group: group,
      className: className,
      title: title || 'Create ' + shortType,
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  }

  function createParticipant(event, collapsed) {
    create.start(event, elementFactory.createParticipantShape(collapsed));
  }

  assign(actions, {
    'lasso-tool': {
      group: 'tools',
      className: 'bpmn-icon-lasso-tool',
      title: 'Activate the lasso tool',
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: 'Activate the create/remove space tool',
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.start-event': createAction(
      'bpmn:StartEvent', 'event', 'bpmn-icon-start-event-none'
    ),
    'create.intermediate-event': createAction(
      'bpmn:IntermediateThrowEvent', 'event', 'bpmn-icon-intermediate-event-none'
    ),
    'create.end-event': createAction(
      'bpmn:EndEvent', 'event', 'bpmn-icon-end-event-none'
    ),
    'create.exclusive-gateway': createAction(
      'bpmn:ExclusiveGateway', 'gateway', 'bpmn-icon-gateway-xor'
    ),
    'create.task': createAction(
      'bpmn:Task', 'activity', 'bpmn-icon-task'
    ),
    'create.subprocess-expanded': createAction(
      'bpmn:SubProcess', 'activity', 'bpmn-icon-subprocess-expanded', 'Create expanded SubProcess',
      { isExpanded: true }
    ),
    'create.participant-expanded': {
      group: 'collaboration',
      className: 'bpmn-icon-participant',
      title: 'Create Pool/Participant',
      action: {
        dragstart: createParticipant,
        click: createParticipant
      }
    },
    'custom-separator': {
      group: 'custom',
      separator: true
    },
    'custom-clock': createAction(
        'custom:Clock', 'custom', 'icon-custom-clock'
    ),
    'custom-time-slot': createAction(
        'custom:TimeSlot', 'custom', 'icon-custom-time-slot'
    ),
    'custom-resource': createAction(
        'custom:Resource', 'custom', 'icon-custom-resource'
    ),
    'custom-resource-absence': createAction(
        'custom:ResourceAbsence', 'custom', 'icon-custom-resource-absence'
    ),
    'custom-resource-instance': createAction(
        'custom:ResourceInstance', 'custom', 'icon-custom-resource-instance'
    ),
    'custom-role': createAction(
        'custom:Role', 'custom', 'icon-custom-role'
    ),
    'custom-role-absence': createAction(
        'custom:RoleAbsence', 'custom', 'icon-custom-role-absence'
    ),
    'custom-role-instance': createAction(
        'custom:RoleInstance', 'custom', 'icon-custom-role-instance'
    ),
    'custom-group': createAction(
        'custom:Group', 'custom', 'icon-custom-group'
    ),
    'custom-group-absence': createAction(
        'custom:GroupAbsence', 'custom', 'icon-custom-group-absence'
    ),
    'custom-group-instance': createAction(
        'custom:GroupInstance', 'custom', 'icon-custom-group-instance'
    ),
  });

  return actions;
};
