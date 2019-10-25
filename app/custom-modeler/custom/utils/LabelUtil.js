import {is} from "bpmn-js/lib/util/ModelUtil";
import {
    getLabel as basicGetLabel,
    setLabel as basicSetLabel,
} from "bpmn-js/lib/features/label-editing/LabelUtil";

import * as labelUtils from "bpmn-js/lib/util/LabelUtil"
import {isAny} from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import {assign} from "min-dash";
import {DEFAULT_LABEL_SIZE, FLOW_LABEL_INDENT} from "bpmn-js/lib/util/LabelUtil";

export function getLabel(element) {
    let semantic = element.businessObject

    if (is(semantic, 'custom:resource'))
        return semantic.text;
    else
        return basicGetLabel(element)
}

export function setLabel(element, text, isExternal) {
    let types = [
        'custom:resource'
    ]
    let semantic = element.businessObject
    console.log(element)
    console.log(element.businessObject)

    if (isAny(semantic, types)) {
        semantic.text = text
        return element
    }
    else
        return basicSetLabel(element, text, isExternal)
}

/**
 * Returns true if the given semantic is an external label
 *
 * @param {BpmnElement} semantic
 * @return {Boolean} true if is label
 */
export function isLabelExternal(semantic) {
    let types = [
        'custom:resource'
    ]
    // return is(semantic, 'custom:resource') || labelUtils.isLabelExternal(semantic)
    return is(semantic, 'bpmn:Event') ||
        is(semantic, 'bpmn:Gateway') ||
        is(semantic, 'bpmn:DataStoreReference') ||
        is(semantic, 'bpmn:DataObjectReference') ||
        is(semantic, 'bpmn:DataInput') ||
        is(semantic, 'bpmn:DataOutput') ||
        is(semantic, 'bpmn:SequenceFlow') ||
        is(semantic, 'bpmn:MessageFlow') ||
        is(semantic, 'bpmn:Group') ||
        is(semantic, 'custom:resource');
}

export function hasExternalLabel(element) {
    return labelUtils.hasExternalLabel(element)
}

/**
 * Get the position for sequence flow labels
 *
 * @param  {Array<Point>} waypoints
 * @return {Point} the label position
 */
export function getFlowLabelPosition(waypoints) {
    return labelUtils.getFlowLabelPosition(waypoints)
}


/**
 * Get the middle of a number of waypoints
 *
 * @param  {Array<Point>} waypoints
 * @return {Point} the mid point
 */
export function getWaypointsMid(waypoints) {
    return labelUtils.getWaypointsMid(waypoints)
}


export function getExternalLabelMid(element) {
    return labelUtils.getExternalLabelMid(element)
}


/**
 * Returns the bounds of an elements label, parsed from the elements DI or
 * generated from its bounds.
 *
 * @param {BpmnElement} semantic
 * @param {djs.model.Base} element
 */
export function getExternalLabelBounds(semantic, element) {
    return labelUtils.getExternalLabelBounds(semantic, element)
    // var mid,
    //     size,
    //     bounds,
    //     di = semantic.di,
    //     label = di.label;
    //
    // if (label && label.bounds) {
    //     bounds = label.bounds;
    //
    //     size = {
    //         width: Math.max(DEFAULT_LABEL_SIZE.width, bounds.width),
    //         height: bounds.height
    //     };
    //
    //     mid = {
    //         x: bounds.x + bounds.width / 2,
    //         y: bounds.y + bounds.height / 2
    //     };
    // } else {
    //
    //     mid = getExternalLabelMid(element);
    //
    //     size = DEFAULT_LABEL_SIZE;
    // }
    //
    // return assign({
    //     x: mid.x - size.width / 2,
    //     y: mid.y - size.height / 2
    // }, size);
}

export function isLabel(element) {
    return element && !!element.labelTarget;
}