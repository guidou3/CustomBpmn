import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import {is} from "bpmn-js/lib/util/ModelUtil";

import CustomUpdateLabelHandler from "./handlers/CustomUpdateLabelHandler";

export default class CustomModeling extends Modeling {
    constructor(eventBus, elementFactory, commandStack,
                bpmnRules) {
        super(eventBus, elementFactory, commandStack, bpmnRules);
    }

    getHandlers() {
        let handlers = super.getHandlers();
        handlers['element.customUpdateLabel'] = CustomUpdateLabelHandler;

        return handlers;
    }

    updateLabel(element, newLabel, newBounds, hints) {
        let command = 'element.updateLabel'

        if(is(element, "custom:resource"))
            command = 'element.customUpdateLabel'

        this._commandStack.execute(command, {
            element: element,
            newLabel: newLabel,
            newBounds: newBounds,
            hints: hints || {}
        });


    }
};

CustomModeling.$inject = [
    'eventBus',
    'elementFactory',
    'commandStack',
    'bpmnRules'
];