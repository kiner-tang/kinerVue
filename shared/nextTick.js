import {isNative} from "./utils.js";
// 定义一个用于存储任务列表的数组
let callbacks = [];
// 定义一个变量用来标记是否需要在任务列表中新增任务
let pending = false;

// 定义一个方法，用于一次性执行callbacks中的所有回调，并清空callbacks,重置pending状态
let flushCallback = () => {
    // 重置pending业务
    pending = false;

    // 循环执行任务
    callbacks.forEach(callback => callback());
    // 清空任务列表
    callbacks.length = 0;
};

// 是否采用宏任务
let useMacroTask = false;

/**
 * 使用宏任务方式运行fn，返回的_withTask函数，执行此函数和便会采用宏任务方式执行fn
 * @param fn
 * @returns {(function(...[*]=): *)|*}
 */
export const withMacroTask = fn => {
    return fn._withTask || (fn._withTask = (...args) => {
        useMacroTask = true;
        const res = fn.apply(null, args);
        useMacroTask = false;
        return res;
    });
};


let macroTimerFun;
//宏任务
// 1、vue中优先选择采用setImmediate方式调用宏任务，但因为setImmediate存在兼容性问题，目前仅能在IE中使用，因此，在不支持setImmediate的浏览其中降级使用MessageChannel
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    macroTimerFun = () => setImmediate(flushCallback);
}
// 2、在支持MessageChannel的浏览器，使用MessageChannel(消息渠道)方式实现宏任务
else if (typeof MessageChannel !== 'undefined' && (isNative(MessageChannel) || MessageChannel.toString() === "[object MessageChannelConstructor]")) {
    let messageChannel = new MessageChannel();
    let port1 = messageChannel.port1;
    messageChannel.port2.onmessage = flushCallback;
    macroTimerFun = () => port1.postMessage(1);
}
// 3、在不支持MessageChannel的低端浏览器，则采用setTimeout实现宏任务
else{
    macroTimerFun = () => setTimeout(flushCallback,0);
}



// 微任务 若浏览器不支持Promise,则微任务自动降级为宏任务
let microTimerFun;
if(typeof Promise !== 'undefined' && isNative(Promise)){
    const p = Promise.resolve();
    microTimerFun = () => {
        p.then(flushCallback);
    };
}else{
    microTimerFun = macroTimerFun;
}

export const nextTick = (fn, ctx) => {
    // 当未传递fn且支持Promise的环境，vue支持vm.$nextTick().then()的方式调用，因此定义一个_resolve变量用于存储和Promise的resolve
    let _resolve;
    // 将包含运行回调的匿名函数加入到callbacks中，执行时便可以一次性执行callbacks中的所有函数
    callbacks.push(() => (fn ? fn.call(ctx) : _resolve(ctx)));

    //如果未向任务队列里面添加了任务
    if (!pending) {
        // 根据是否使用宏任务来判断应该执行宏任务还是执行微任务
        useMacroTask ? macroTimerFun() : microTimerFun();
    }
    // 若未提供fn,且支持Promise，则直接返回Promise对象
    if(!fn && typeof Promise !== "undefined" && isNative(Promise)){
        return new Promise(resolve => {
            _resolve = resolve;
        })
    }
};