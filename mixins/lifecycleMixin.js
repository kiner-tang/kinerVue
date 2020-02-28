// mixins/lifecycleMixin.js 实现了一些跟vue生命周期有关的方法，如强制更新：$forceUpdate、卸载实例：$destroy等
import {callHook, noop, removeArrItem} from "../shared/utils.js";
import {createEmptyVNode} from "../VDOM/VNode.js";
import Watcher from "../Observer/Watcher.js";

// 当前活动的实例
export let activeInstance = null;

/**
 * 设置当前激活的实例，并返回恢复原状的的方法
 * @param vm
 * @returns {Function}
 */
export const setActiveInstance = vm => {
    const prevInstance = activeInstance;
    activeInstance = vm;
    return ()=>{
        activeInstance = prevInstance;
    };
};

export const initLifecycle = vm => {
    const options = vm.$options;

    // 找到第一个不是抽象节点的父级
    let parent = options.parent;

    if(parent && !options.abstract){
        while(parent.$options.abstract && parent.$parent){
            parent = parent.$parent;
        }
        // 将当前vue实例加入到第一个不是抽象节点的父级的$children中
        parent.$children.push(vm);
    }

    // 初始化$parent和$root
    vm.$parent = parent;
    vm.$root = parent ? parent.$root : vm;

    // 初始化$children，和$refs
    vm.$children = [];
    vm.$refs = {};

    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false;
    vm._isDestroyed = false;
    vm._isBeingDestroyed = false;
};



/**
 * 将组件挂载到dom上
 * @param vm
 * @param el
 * @returns {*}
 */
export const mountComponent = (vm,el) => {
    //若给出配置项中未指定渲染函数，则直接设置渲染函数为创建空的vnode的方法，防止运行时报错
    if(!vm.$options.render){
        vm.$options.render = createEmptyVNode;
    }
    //触发生命周期钩子 beforeMount
    callHook(vm,'beforeMount');

    //创建观察者，持续观察待挂载的组件
    new Watcher(vm,()=>{
        vm._update&&vm._update((vm._render||noop)());
    }, noop,{
        before(){
            // 如果当前组件已经挂载并且没有被销毁的话，触发生命周期钩子
            if (vm._isMounted && !vm._isDestroyed) {
                callHook(vm, 'beforeUpdate');
            }
        }
    }, true /*当前watcher是用于渲染的*/);

    if(vm.$vnode===null){

        vm._isMounted = true;
        // 触发生命周期钩子 mounted
        callHook(vm, 'mounted');
    }

    return vm;
};

export const lifecycleMixin =  KinerVue => {

    KinerVue.prototype._update = function(vnode,hydrating=false/*与服务端渲染有关，暂不考虑*/){
        const vm = this;
        // 获取旧的dom节点和vnode
        const prevELem = vm.$el;
        const prevVNode = vm._vnode;

        // 将当前组件实例作为激活实例
        const restoreActiveInstance = setActiveInstance(vm);

        // 将传入的vnode挂载到组件实例上
        vm._vnode = vnode;

        // 如果不存在旧的vnode,说明这是第一次生成vnode用以构建页面
        if(!prevVNode){
            vm.$el = vm.__patch__(vm.$el, vnode);
        }
        // 否则需要对新旧vnode进行对比找出最少的更新并生成dom节点
        else{
            vm.$el = vm.__patch__(prevVNode, vnode);
        }
        // 对比完成生成了需要更新的dom节点之后，恢复当前激活实例
        restoreActiveInstance();

        // 更新__vue__的引用指向
        // 将旧元素上的__vue__置空
        if(prevELem){
            prevELem.__vue__ = null;
        }
        // 将当前组件实例指向新生成的dom节点树上的__vue__上
        if(vm.$el){
            vm.$el.__vue__ = vm;
        }

        // 如果当前vnode的父节点是一个高阶组件，那么也同时更新一下父节点的el
        if(vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode){
            vm.$parent.$el = vm.$el
        }
    };

    /**
     * 强制更新
     */
    KinerVue.prototype.$forceUpdate = function () {
        const vm = this;
        if(vm._watcher){
            vm._watcher.update();
        }
    };

    /**
     * 销毁当前组件实例
     */
    KinerVue.prototype.$destroy = function () {
        const vm = this;
        // 为防止重复执行，增加此判断
        if(vm._isBeingDestroyed){
            return;
        }
        // 触发生命周期钩子
        callHook(vm, 'beforeDestroy');
        // 标记为正在销毁
        vm._isBeingDestroyed = true;

        //如果当前组件存在父级，且父级没有被销毁，则删除当前组件与父组件之间的关系，即将当前实例从父组件的$children列表中移除
        if(vm.$parent && !vm.$parent._isBeingDestroyed){
            removeArrItem(vm.$parent.$children, vm);
        }

        // 移除所有watcher
        if(vm._watcher){
            vm._watcher.unWatch();
        }

        // 移除所有的检测对象，包括通过$watch添加的监听
        if(vm._watchers){
            vm._watchers.forEach(watcher=>watcher.unWatch());
        }

        // 销毁工作完成，打上标记
        vm._isDestroyed = true;

        // TODO 解绑指令
        // VM.__patch__(vm.vnode,null)

        //触发已销毁钩子
        callHook(vm, 'destroyed');

        // 移除所有事件监听
        vm.$off();
    }
};