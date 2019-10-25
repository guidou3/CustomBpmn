import inherits from 'inherits';

import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

import {
  isAny
} from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {
  assign,
  bind
} from 'min-dash';


export default function CustomContextPadProvider(injector, connect, translate) {

  injector.invoke(ContextPadProvider, this);

  var cached = bind(this.getContextPadEntries, this);

  this.getContextPadEntries = function(element) {
    var actions = cached(element);
    var businessObject = element.businessObject;

    function startConnect(event, element, autoActivate) {
      connect.start(event, element, autoActivate);
    }

    let types = [
        'custom:clock',
        'custom:resource',
        'custom:resource-absence',
        'custom:resource-instance',
        'custom:role',
        'custom:role-absence',
        'custom:role-instance',
        'custom:group',
        'custom:group-absence',
        'custom:group-instance'
    ]

    if (isAny(businessObject, types)) {
          assign(actions, {
              'connect': {
                  group: 'connect',
                  className: 'bpmn-icon-connection-multi',
                  title: translate('Connect using custom connection'),
                  action: {
                      click: startConnect,
                      dragstart: startConnect
                  }
              }
          });
      }

    return actions;
  };
}

inherits(CustomContextPadProvider, ContextPadProvider);

CustomContextPadProvider.$inject = [
  'injector',
  'connect',
  'translate'
];