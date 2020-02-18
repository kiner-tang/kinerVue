import {bindDynamicKeys, prependModifier} from "./helpers/bind-dynamic-keys.js";
import {bindObjectListeners} from "./helpers/bind-object-listeners.js";
import {bindObjectPorps} from "./helpers/bind-object-props.js";
import {checkKeyCodes} from "./helpers/check-keycodes.js";
import {renderList} from "./helpers/render-list.js";
import {renderSlot} from "./helpers/render-slot.js";
import {markOnce, renderStatic} from "./helpers/render-static.js";
import {resolveFilter} from "./helpers/resolve-filter.js";
import {looseEqual, looseIndexOf, toNumber, toString} from "../shared/utils.js";
import {createEmptyVNode, createTextVNode} from "../VDOM/VNode.js";
import {resolveScopedSlots} from "./helpers/resolve-scoped-slots.js";
import {createElement} from "../VDOM/createElement.js";


/**
 * 将一些工具方法挂载到目标对象上
 * 运行时，这个目标对象将作为代码运行环境的上下文
 */
export const initRenderHelper = (target) => {
    target._d = bindDynamicKeys;
    target._p = prependModifier;
    target._g = bindObjectListeners;
    target._b = bindObjectPorps;
    target._k = checkKeyCodes;
    target._l = renderList;
    target._t = renderSlot;
    target._m = renderStatic;
    target._f = resolveFilter;
    target._n = toNumber;
    target._s = toString;
    target._q = looseEqual;
    target._i = looseIndexOf;
    target._v = createTextVNode;
    target._e = createEmptyVNode;
    target._u = resolveScopedSlots;
    target._o = markOnce;
    target._c = createElement;
};