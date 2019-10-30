import inherits from 'inherits';

import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

import {is} from "bpmn-js/lib/util/ModelUtil";

import {
  isAny
} from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {
  assign,
  bind
} from 'min-dash';
import {isLabel} from "./utils/LabelUtil";

import {resourceLabel} from "./Types";


export default function CustomContextPadProvider(injector, connect, translate) {

  injector.invoke(ContextPadProvider, this);

  var cached = bind(this.getContextPadEntries, this);

  this.getContextPadEntries = function(element) {
    var actions = cached(element);
    var businessObject = element.businessObject;

    function startConnect(event, element, autoActivate) {
      connect.start(event, element, autoActivate);
    }

    function startConnectConsequence(event, element, autoActivate) {
      connect.customStart(event, element, 'custom:ConsequenceFlow', autoActivate);
    }

    function startConnectConsequenceTimed(event, element, autoActivate) {
      connect.customStart(event, element, 'custom:ConsequenceTimedFlow', autoActivate);
    }

    if (isAny(businessObject, resourceLabel) && element.type !== 'label') {
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
    if(is(businessObject, 'bpmn:BaseElement') && element.type !== 'label') {
        assign(actions, {
            'connect1': {
                group: 'connect',
                className: 'bpmn-icon-connection-multi',
                title: translate('Connect using custom connection'),
                action: {
                    click: startConnectConsequence,
                    dragstart: startConnectConsequence
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