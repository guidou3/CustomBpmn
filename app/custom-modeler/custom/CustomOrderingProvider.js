import inherits from 'inherits';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {connections} from "./Types";

import OrderingProvider from 'diagram-js/lib/features/ordering/OrderingProvider';


/**
 * a simple ordering provider that ensures that custom
 * connections are always rendered on top.
 */
export default function CustomOrderingProvider(eventBus, canvas) {

  OrderingProvider.call(this, eventBus);

  this.getOrdering = function(element, newParent) {

    // render labels always on top
    if (element.labelTarget) {
      return {
        parent: canvas.getRootElement(),
        index: -1
      };
    }

    if (isAny(element, connections)) {

      // always move to end of root element
      // to display always on top
      return {
        parent: canvas.getRootElement(),
        index: -1
      };
    }
  };
}

CustomOrderingProvider.$inject = [ 'eventBus', 'canvas' ];

inherits(CustomOrderingProvider, OrderingProvider);