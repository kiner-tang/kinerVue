import {isUnDef} from "../../../../shared/utils.js";

let target;
function updateDomListeners(oldVnode, vnode) {
    // 如果新旧虚拟节点都没有绑定事件，则无需更新，直接退出
    if(isUnDef(oldVnode.data.on) && isUnDef(vnode.data.on)){
        return;
    }

    const on = vnode.data.on || {};
    const oldOn = oldVnode.data.on || {};

    target = vnode.elem;

}