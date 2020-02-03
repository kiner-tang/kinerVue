import Observer from "../Observer/Observer.js";
import {callHook, isA, mergeOptions} from "../shared/utils.js";
import {LIFECYCLE_HOOKS} from "../shared/constants.js";

/**
 * 在实例化vue对象时执行，在vue实例上挂载一些需要用到的属性
 * @param KinerVue
 */
export default KinerVue => {

    KinerVue.prototype._init = function (options = {}) {
        const vm = this;

        vm.$options = mergeOptions(options, vm.$options);

        // 父类
        let parent = vm.$options.$parent;
        // 在父类的children下添加当前实例作为子类
        parent&&parent.$children.push(vm);

        //子类
        vm.$children = [];
        vm.$parent = parent;
        vm.$root = parent?parent.$root:vm;

        vm.$refs = [];

        vm.$data = vm.$options.data.apply(vm);

        // 当前Vue实例（组件）的观察者
        vm._watcher = null;

        vm._isDestroyed = false;
        vm._isBeingDestroyed = false;

        // 将数据交给Observer，让Observer将这个数据变成响应式对象
        new Observer(vm, vm.$data);

        callHook(this, 'created');
    };

};