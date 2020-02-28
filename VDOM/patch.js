// VDOM/patch.js 此文件实现虚拟DOM的patching算法，对新旧虚拟DOM进行diff，找出最少的更新

import VNode, {createCloneVNode, createElemVNode} from "./VNode.js";
import {isA, isDef, isPrimitive, isRegExp, isTextInputType, unknownElement, warn} from "../shared/utils.js";
import config from "../config.js";
import {activeInstance} from "../mixins/lifecycleMixin.js";
import {registerRef} from "./modules/ref.js";

/**
 * 创建一个空节点
 * @type {VNode}
 */
export const emptyNode = new VNode({tag: '', data: {}, children: []});

// 渲染阶段需要处理的钩子函数
const hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

/**
 * 判断两个虚拟节点是否是同一个虚拟节点
 * @param a
 * @param b
 * @returns {boolean}
 */
const isSameVnode = (a, b) => {
    return a.key === b.key && (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        sameInputType(a, b)
    );
};

/**
 * 判断两个虚拟节点的input type是否相同
 * @param a
 * @param b
 */
const sameInputType = (a, b) => {
    // 如果不是input类型的话，无需判断，必定为true
    if (a.tag !== 'input') return true;
    let i;
    const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
    const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
    return typeA === typeB || (isTextInputType(typeA) && isTextInputType(typeB));
};

/**
 * 根据子节点列表将一定范围内的key和index保存下来，
 * 用于后续判断子节点是否发生了移动
 * @param children  子节点列表
 * @param startIdx  开始索引
 * @param endIdx    终止索引
 */
const createKeyToOldIdx = (children, startIdx, endIdx) => {
    const map = {};
    let i, key;
    for (i = startIdx; i < endIdx; i++) {
        isDef(key = children[i].key) && (map[key] = i);
    }
    return map;
};


export const createPatchFunction = backend => {
    let i, j;
    // 用于存储再patch过程中需要触发的钩子函数
    const cbs = {};

    const {modules, nodeOps} = backend;


    // 将相关模块的钩子函数统一合并到cbs中进行统一管理
    let hookName;
    for (i = 0; i < hooks.length; i++) {
        cbs[hookName = hooks[i]] = [];
        modules.forEach(module => isDef(module[hookName]) && cbs[hookName].push(module[hookName]))
    }


    // 根据给定节点创建一个空的虚拟节点
    function emptyNode(elem) {
        return new VNode({
            tag: nodeOps.tag(elem),
            data: {},
            children: [],
            text: undefined,
            elem: elem
        });
    }

    // 创建一个移除元素节点的辅助函数
    function createRmCb(elem, listeners) {
        function remove() {
            if (--remove.listeners === 0) {
                removeNode(elem);
            }
        }

        remove.listeners = listeners;
        return remove;
    }

    // 移除元素节点
    function removeNode(elem) {
        const parent = nodeOps.parentNode(elem);
        if (isDef(parent)) {
            nodeOps.removeChild(parent, elem);
        }
    }

    // 判断当前标签是否是一个未知标签（需要根据配置排除一下自定义标签）
    function isUnknownElement(elem, isInPre) {
        return !isInPre && (config.ignoredElements.length && config.ignoredElements.some(ignore => {
            return isRegExp(ignore) ? ignore.test(elem.tag) : ignore === elem.tag
        })) && unknownElement(elem.tag);
    }

    // 用于标记正在创建的元素是否在v-pre修饰的标签中，若不为0则是
    let creatingElmInVPre = 0;

    function createElm(
        vnode,
        insertedVnodeQueue, /*已经插入的vnode队列*/
        parentElem,
        refElem,
        nested, /*是否需要进行transition enter的检测*/
        ownerArray, /*vnode所在的数组*/
        index/*vnode在数组中的索引*/
    ) {
        // 若当前节点存在elem，并且它在一个节点数组当中，那么他其实在上一次渲染中已经使用过了
        // 因为未使用的vnode应该不存在被挂载的节点elem的，因此，为了在打补丁时不发生一些不可意料的错误
        // 我们克隆一份这个节点出来
        if (isDef(vnode.elem) && isDef(ownerArray)) {
            vnode = ownerArray[index] = createCloneVNode(vnode);
        }

        // 标记当前节点是否直接在根节点上插入的
        vnode.isRootInvest = !nested;// 将用于对transition enter的检测

        // 如果发现是一个子组件，那么我们直接交由创建组件方法进行创建组件即可，无需走下面的逻辑
        if (createComponent(vnode, insertedVnodeQueue, parentElem, refElem)) {
            return
        }
        const data = vnode.data;
        const children = vnode.children;
        const tag = vnode.tag;

        // 如果存在tag则是普通html标点
        if (isDef(tag)) {
            if (data && data.pre) {
                creatingElmInVPre++;
            }
            if (isUnknownElement(vnode, creatingElmInVPre)) {
                warn(`使用了一个位置的自定义标签：<${tag}>，您是否没有将其注册为组件呢`);
            }

            // 创建dom节点，并挂载到vnode上
            vnode.elem = nodeOps.createElement(tag, vnode);

            // 为有作用域的css设置作用域id
            // 这是作为一种特殊情况实现的，以避免通过正常属性修补过程的开销。
            setScope(vnode);

            // 处理子节点
            createChildren(vnode, children, insertedVnodeQueue);
            // 触发创建完成钩子，将当前节点加入到已插入节点队列中
            isDef(vnode.data) && invokeCreateHooks(vnode, insertedVnodeQueue);

            // 最后将生成的dom节点插入到父标签中
            insert(parentElem, vnode.elem, refElem);

            // 然后将creatingElmInVPre恢复原状
            if (data && data.pre) {
                creatingElmInVPre--;
            }

        }
        // 否则如果isComment=true则是注释节点
        else if (vnode.isComment === true) {
            // 是注释节点，直接生成并插入到父级标签下面
            vnode.elem = nodeOps.createComment(vnode.text);
            insert(parentElem, vnode.elem, refElem);
        }
        // 否则就是文本节点
        else {
            // 是文本节点，直接生成并插入到父级标签下面
            vnode.elem = nodeOps.createTextNode(vnode.text);
            insert(parentElem, vnode.elem, refElem);
        }
    }

    /**
     * 创建组件
     * @param vnode
     * @param insertedVnodeQueue
     * @param parentElem
     * @param refElem
     * @returns {boolean}
     */
    function createComponent(vnode, insertedVnodeQueue, parentElem, refElem) {
        let i = vnode.data;
        if (isDef(i)) {
            const isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
            // 如果有init钩子，那此时触发
            if ((i = i.hook) && (i = i.init)) {
                i(vnode);
            }
            // 在调用了init钩子函数之后，如果vnode是一个子组件，就会创建实例并挂载他
            if (isDef(vnode.componentInstance)) {
                // 初始化组件
                initComponent(vnode, insertedVnodeQueue);
                // 将组件插入到父元素节点下
                insert(parentElem, vnode.elem, refElem);

                // 处理重新回到激活状态的组件
                if (isReactivated === true) {
                    reactivateComponent(vnode, insertedVnodeQueue, parentElem, refElem)
                }

                return true;
            }

        }
    }

    /**
     * 处理重新回到激活状态的组件
     * @param vnode
     * @param insertedVnodeQueue
     * @param parentElem
     * @param refElem
     */
    function reactivateComponent(vnode, insertedVnodeQueue, parentElem, refElem) {
        let i;
        // 为了解决组件内部使用transition时重新变为激活状态不会重新激发transition的问题
        // 循环触发一下带有transition的内部组件的activate钩子函数
        let innerVnode = vnode;
        while (innerVnode.componentInstance) {
            innerVnode = innerVnode.componentInstance._vnode;
            if (isDef(i = innerVnode.data) && isDef(i = i.transition)) {
                for (i = 0; i < cbs.activate.length; i++) {
                    cbs.activate[i](emptyNode, innerVnode)
                }
                insertedVnodeQueue.push(innerVnode);
                break;
            }
        }
        insert(parentElem, vnode.elem, refElem);
    }

    /**
     * 初始化组件
     * @param vnode
     * @param insertedVnodeQueue
     */
    function initComponent(vnode, insertedVnodeQueue) {
        // 若当前组件设置了延迟调用insert钩子，则将钩子函数合并到insertedVnodeQueue中，等待元素真正被插入到dom中时再统一触发
        if (isDef(vnode.data.pendingInsert)) {
            insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
            vnode.data.pendingInsert = null;
        }

        vnode.elem = vnode.componentInstance.$el;

        // 如果当前组件可以进行patch比较的话，就触发create钩子并为之设置作用域
        if (isPatchable(vnode)) {
            invokeCreateHooks(vnode, insertedVnodeQueue);
            setScope(vnode);
        } else {
            // 如果不能patch,说明是一个空的根元素，我们需要跳过所有非ref的模块
            registerRef(vnode);

            insertedVnodeQueue.push(vnode);
        }
    }

    /**
     * 是否能够进行修补
     * 根据组件实例不断往上查找虚拟节点，直到虚拟节点下面不存在组件实例，并且是一个标签元素
     * 说明这个就是父组件的占位符节点
     * @param vnode
     * @returns {boolean}
     */
    function isPatchable(vnode) {
        while (vnode.componentInstance) {
            vnode = vnode.componentInstance._vnode
        }
        return isDef(vnode.tag)
    }

    /**
     * 创建子元素
     * @param vnode
     * @param children
     * @param insertedVnodeQueue
     */
    function createChildren(vnode, children, insertedVnodeQueue) {
        // 如果children是一个数组，那么我们就循环调用createElem创建元素
        if (isA(children)) {
            children.forEach((child, index) => createElm(child, insertedVnodeQueue, vnode.elem, null, false, children, index))
        } else if (isPrimitive(vnode.text)) {// 如果不是数组，并且文本是一个简单数据，那么我们直接创建一个文本节点加入到父节点下
            nodeOps.appendChild(vnode.elem, nodeOps.createTextNode(String(vnode.text)));
        }
    }

    /**
     * 将目标节点插入到父节点中
     * @param parentElem    父节点
     * @param elem          目标节点
     * @param refElem       可选，如果传了此参数，那么目标节点将会被插入到这个节点之前
     */
    function insert(parentElem, elem, refElem) {
        if (isDef(parentElem)) {
            if (isDef(refElem)) {
                // 如果存在refElem,还要确保refElem跟elem是同一个父级下的兄弟元素
                if (nodeOps.parentNode(refElem) === parentElem) {
                    nodeOps.insertBefore(parentElem, elem, refElem);
                }
            } else {
                // 不存在refElem，则将目标节点插入到入接点最后面
                nodeOps.appendChild(parentElem, elem);
            }
        }
    }

    /**
     * 批量添加节点
     * @param parentElem
     * @param refElem
     * @param vnodes
     * @param startIdx
     * @param endIdx
     * @param insertedVnodeQueue
     */
    function addVnodes(parentElem, refElem, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        while (startIdx++ <= endIdx) {
            createElm(vnodes[startIdx], insertedVnodeQueue, parentElem, refElem, false, vnodes, startIdx);
        }
    }

    function removeVnodes(vnodes, startIdx, endIdx){
        while (startIdx++<endIdx){
            const vnode = vnodes[startIdx];
            if(isDef(vnode)){
                // 如果是元素标签的话
                if(isDef(vnode.tag)){
                    removeAndInvokeRemoveHook(vnode);
                    invokeDestroyHook(vnode);
                }else{
                    // 如果是文本标签或注释标签的话
                }
            }
        }
    }

    function removeAndInvokeRemoveHook(vnode, rm){
        if(isDef(rm) || isDef(vnode.data)){
            let i;
            const listeners = cbs.remove.length + 1;
            if(isDef(rm)){
                // 累加remove钩子的数量
                rm.listeners += listeners;
            }else{
                // 如果不存在rm则创建
                rm = createRmCb(vnode.elem, listeners);
            }
            // 递归调用子组件根节点上的remove钩子函数
            if((i = vnode.componentInstance) && (i = i._vnode) && (i = i.data)){
                removeAndInvokeRemoveHook(i, rm);
            }
            // 迭代触发remove钩子
            for(i=0;i<cbs.remove.length;i++){
                cbs.remove[i](vnode, rm);
            }

            // 如果vnode的data上有绑定hook的话，也触发一下下面的remove钩子
            if((i = vnode.data) && (i = i.hook) && (i = i.remove)){
                i(vnode, rm);
            }else{
                // 否则就直接执行rm
                rm();
            }
        }
    }

    /**
     * 触发创建完成钩子
     * @param vnode
     * @param insertedVnodeQueue
     */
    function invokeCreateHooks(vnode, insertedVnodeQueue) {
        // 循环触发cbs中所有的create钩子
        for (let i = 0; i < cbs.create.length; i++) {
            cbs.create[i](emptyNode, vnode);
        }
        i = vnode.data.hook;
        // 如果data中存在hook对象，还需要触发里面的create钩子
        if (isDef(i)) {
            isDef(i.create) && i.create(emptyNode, vnode);
            isDef(i.insert) && insertedVnodeQueue.push(vnode);
        }
    }

    /**
     * 循环触发destory钩子
     * @param vnode
     */
    function invokeDestroyHook(vnode) {
        let i;
        if (isDef(i = vnode.data)) {
            if ((i = i.hook) && (i = i.destroy)) i(vnode);
            for(i = 0;i<cbs.destroy.length;i++) cbs.destroy[i](vnode);
        }
        if(isDef(vnode.children)){
            for(i=0;i<vnode.children.length;i++) invokeDestroyHook(vnode.children[i]);
        }
    }

    /**
     * 为节点设置作用域id,用于作用域css
     * @param vnode
     */
    function setScope(vnode) {
        let i;
        // 如果当前vnode本身已经标记有作用域id,则直接使用该id
        if (isDef(i = vnode.fnScopeId)) {
            nodeOps.setStyleScope(vnode.elem, i);
        } else {
            let parent = vnode;
            // 否则不断查询当前节点的祖先节点，知道找到有指定作用域id的祖先位置
            while (parent) {
                if ((i = parent.context) && (i = i.$options._scopeId)) {
                    nodeOps.setStyleScope(vnode.elem, i);
                }
                parent = parent.parent;
            }
        }

        // 对于插槽的内容我们还需要获取当前活动实例的作用域id
        if ((i = activeInstance) && i !== vnode.context && i !== vnode.fnContext && isDef(i = i.$options._scopeId)) {
            nodeOps.setStyleScope(vnode.elem, i);
        }
    }

};