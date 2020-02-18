// mixins/lifecycleMixin.js 实现了一些跟vue生命周期有关的方法，如强制更新：$forceUpdate、卸载实例：$destroy等
import {callHook, noop, removeArrItem} from "../shared/utils.js";
import {createEmptyVNode} from "../VDOM/VNode.js";
import Watcher from "../Observer/Watcher.js";

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
    vm._watcher = new Watcher(vm,()=>{
        //TODO 未实现
        vm._update&&vm._update((vm._render||noop)());
    }, noop);

    // 触发生命周期钩子 mounted
    callHook(vm, 'mounted');

    return vm;
};

export default KinerVue => {

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