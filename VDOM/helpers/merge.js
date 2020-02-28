import VNode from "../VNode.js";
import {getAndremoveItemFromArr, isDef, isUnDef} from "../../shared/utils.js";
import {createFnInvoker} from "../../mixins/eventMixin.js";

/**
 * 将钩子函数合并到vnode中
 * @param vnode
 * @param hookName
 * @param hook
 */
export const mergeVNodeHook = (vnode, hookName, hook) => {
    // 先做一个数据类型检测看看传进来的def是否是VNode的实例
    if(vnode instanceof VNode){
        vnode = vnode.data.hook || (vnode.data.hook = {});
    }

    let invoker;
    // 创建一个包装函数，调用并从调用这种删除，确保hook只被调用一次，放置内存泄露
    const wrapHook = function(){
        hook.call(this, arguments);
        getAndremoveItemFromArr(invoker.fns, wrapHook);
    };

    // 看看是否存在旧的钩子函数
    const oldHook = vnode[hookName];

    // 如果不逊在旧的钩子函数，则直接调用createFnInvoker创建一个协助对象
    if(isUnDef(oldHook)){
        invoker = createFnInvoker([wrapHook]);
    }else{
        // 如果已经合并过一次了，就将包装函数加入到已经创建的调用者的fns中
        if(isDef(oldHook) && oldHook.merged === true){
            invoker = oldHook;
            invoker.fns.push(wrapHook);
        }else{
            // 否则就是存在一个普通的钩子函数
            invoker = createFnInvoker([oldHook, wrapHook]);
        }
    }
    // 最后将invoker标记为已经合并
    invoker.merged = true;
    vnode[hookName] = invoker;
};