// mixins/eventMixin.js 对事件对象的初始化，并提供了在KinerVue原型上挂载事件相关的方法如：$on,$off,$emit,$once等方法
import {cached, invokeWithErrorHandle, isA, isUnDef, warn} from "../shared/utils.js";

/**
 * 初始化事件
 * @param vm
 */
export const initEvent = vm => {
    // 初始化一个用于储存事件队列的对象并挂载在vue实例上
    vm._events = Object.create(null);

    // 若父组件有附加的事件，子组件也需初始化
    const listeners = vm.$options._parentListeners;

    if(listeners){
        updateComponentListeners(vm, listeners)
    }


};

// 执行事件的目标对象，其实就是vue实例
let target;

/**
 * 新增事件绑定
 * @param event
 * @param fn
 * @param isOnce
 */
function add(event, fn, isOnce=false){
    if(isOnce){
        target.$on(event, fn);
    }else{
        target.$on(event, fn);
    }
}

/**
 * 移除事件绑定
 * @param event
 * @param fn
 */
function remove(event, fn){
    target.$off(event, fn);
}

/**
 * 更新组件事件
 * @param vm
 * @param listeners
 * @param oldListeners
 */
export const updateComponentListeners = (vm, listeners, oldListeners={}) => {
    target = vm;
    updateListeners(listeners, oldListeners, add, remove, vm);
};

/**
 * 事件规范化，由于在vue模板中可以使用capture、once、passive等事件修饰符，在模板编译阶段会将这些模板修饰符转换成一些特殊符号放在事件名的前面用于修饰，如：
 * passive      =>      &
 * once         =>      ~
 * capture      =>      !
 *
 * e.g.
 *
 * 在模板中使用如：<div @click.once="clickHandler">模板修饰符</div>
 * 在模板解析阶段会将事件转换为；{"~click": function clickHandler(){}}
 *
 * 因此，此方法便是用来解析这些修饰符用的
 * @type {function(*): *}
 */
export const normalizeEvent = cached(eventName=>{
    // 解析passive修饰符
    const passive = eventName.charAt(0) === '&';
    eventName = passive?eventName.slice(1):eventName;
    // 解析once修饰符
    const once = eventName.charAt(0) === "~";
    eventName = once?eventName.slice(1):eventName;
    // 解析capture修饰符
    const capture = eventName.charAt(0) === "!";
    eventName = capture?eventName.slice(1):eventName;
    return {
        eventName,
        passive,
        once,
        capture
    };
});

/**
 * 对比并更新事件
 * @param listeners
 * @param oldListeners
 * @param add
 * @param remove
 * @param vm
 */
export const updateListeners = (listeners, oldListeners, add, remove, vm) => {
    let eventName, curEvent, oldEvent, nEvent;

    for(eventName in listeners){
        curEvent = listeners[eventName];
        oldEvent = oldListeners[eventName];
        nEvent = normalizeEvent(eventName);

        if(isUnDef(curEvent)){
            warn(`所给事件名找不到对应的处理函数，事件名为：${eventName}，事件处理函数：${String(curEvent)}`);
        }else if(isUnDef(oldEvent)){// 在旧事件列表中找不到该事件，但新事件列表中能找到该事件，说明这个是新增时间
            // 若当前事件未经过事件协助对象处理过，则通过时间协助对象对当前事件进行一定的修饰
            if(isUnDef(curEvent.fns)){
                curEvent = listeners[eventName] = createFnInvoker(curEvent, vm);
            }
            // 将新的事件绑定到事件队列中
            add(nEvent.eventName, curEvent, nEvent.once, nEvent.capture, nEvent.passive);
        }else if(curEvent!==oldEvent){// 若当前事件与旧事件不一致，说明事件函数更新了，则将新的事件指向旧的事件，并将listener中的回调指向它
            oldEvent.fns = curEvent;
            listeners[eventName] = oldEvent;
        }
    }
    // 如过不是上述任何一种情况，则说明旧的事件已经不存在了，需移除该事件
    oldListeners.forEach(listener=>{
        if(isUnDef(listeners[listener])){
            nEvent = normalizeEvent(listener);
            remove(nEvent.eventName, listener, nEvent.capture);
        }
    });
};

/**
 * 创建一个事件调用协助对象
 * @param fns
 * @param vm
 * @returns {invoker}
 */
export const createFnInvoker = (fns, vm) => {
    function invoker(){
        const fns = invoker.fns;
        if(isA(fns)){
            fns.forEach(fn=>invokeWithErrorHandle(fn, vm, [], '事件调用报错'))
        }else{
            invokeWithErrorHandle(fns, vm, [], '事件调用报错');
        }
    }
    invoker.fns = fns;
    return invoker;
};

/**
 * 在vue原型上挂载事件相关方法
 * @param KinerVue
 */
export default KinerVue => {

    // 监听事件
    KinerVue.prototype.$on = function (event, fn) {
        const vm = this;
        // 若第一个参数为数组，则循环调用当前方法进行添加事件监听
        if (isA(event)) {
            event.forEach(e => vm.$on(e, fn));
        } else {
            // 若第一参数为事件名，则根据事件名获取对应事件名的事件队列（若事件队列为空则初始化为空数组），然后在事件队列中添加事件回调函数
            (vm._events[event] || (vm._events[event] = [])).push(fn);
        }
        return vm;
    };
    // 触发事件
    KinerVue.prototype.$emit = function (event, ...args) {
        const vm = this;
        // 若第一个参数是数组，则需循环通知对应事件
        if (isA(event)) {
            event.forEach(e => vm.$emit(e, ...args));
        } else {
            let cbs = vm._events[event];
            if (!cbs || cbs.length === 0) {
                return vm;
            }
            // 若第一个参数不是数组，则根据事件获取对应的事件队列，循环通知事件队列里的每一个回调函数
            cbs.forEach(fn => fn.apply(vm, args));
        }
        return vm;
    };
    // 解除事件绑定
    KinerVue.prototype.$off = function (event, fn) {
        const vm = this;
        // 若未传参数，则表示取消所有的时间监听
        if (arguments.length === 0) {
            vm._events = Object.create(null);
            return vm;
        }

        // 若只传了一个参数，代表将传递过来的时间的所有监听全部移除
        if (arguments.length === 1) {
            if (isA(event)) {
                event.forEach(e => vm.$off(e));
            } else {
                vm._events[event] = [];
            }
        }

        if (fn) {
            // 若传递了两个参数，则说明要取消绑定指定事件的指定回调
            if (isA(event)) {
                event.forEach(e => vm.$off(e, fn));
            } else {
                let cbs = vm._events[event];
                // 若指定事件队列不存在或为空，就不需要处理
                if (!cbs || cbs.length === 0) {
                    return vm;
                }
                // 从事件队列中剔除指定的回调函数
                vm._events = cbs.filter(cb => (cb !== fn || cb.fn !== fn));
            }
        }
    };
    // 监听到一次之后立即移除
    KinerVue.prototype.$once = function (event, fn) {
        const vm = this;

        function on() {
            // 调用方法前将监听移除
            vm.$off(event, on);
            // 手动调用回到方法通知事件
            fn.apply(vm, arguments);
        }

        // 将回调函数保存在on的属性中，这样取消绑定时才能找到指定函数
        on.fn = fn;

        vm.$on(event, on);
        return vm;
    }
};