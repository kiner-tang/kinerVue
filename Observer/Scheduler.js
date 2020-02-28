// Observer/Scheduler.js 用于对Watcher队列进行有机的调度

import {warn} from "../shared/utils.js";

/**
 * watcher队列的最大数量，如果超过这个数量，我们就认为可能出现了循环调用
 * @type {number}
 */
export const MAX_UPDATE_COUNT = 100;

// watcher队列
const queue = [];

// 用于存储keep-alive组件中活动的路由组件
const activatedChildren = [];

// 用于存储watcher的id,拿来判断是否出现了循环更新
const has = new Set();

// 用于记录某个id的watcher循环调用的次数，如果超过了MAX_UPDATE_COUNT,则终止循环更新
// 注: vue源码中只有在开发环境时才会终止并警告用户，生产环境并不会终止，我们这边就不考虑环境了，
// 只要是超过了最大跟新数量，就终止循环更新操作
let circular = {};

// 当前是否是等待更新状态
let waiting = false;

// 当前是否正在更新
let flushing = false;

// 当前正在操作的watcher在队列中的索引
let index = 0;

/**
 * 用于重置调度中心的各种状态
 */
function resetSchedulerState() {
    index = queue.length = activatedChildren.length = 0;
    has.clear();
    circular = {};
    waiting = flushing = false;
}

/**
 * 刷新队列并执行watcher.run()
 */
function flushSchedulerQueue() {

    let watcher, id;

    // 先对队列按照id进行升序排序
    // 1、由于父组件总是比子组件先创建，因此，父组件的更新也要在子组件前面
    // 2、由于渲染的watcher总是比用户自定义watcher先创建，因此渲染的watcher也要比自定义的watcher先更新
    // 3、如果组件在父组件的watcher运行期间被销毁了，那么我们更新的时候便可以跳过这个watcher
    queue.sort((a, b) => a.id - b.id);

    // 注意：不要缓存队列的长度，因为在我们更新现有队列中的watcher的时候，更多的watcher可能被加入到队列中来
    for (index = 0; index < queue.length; index++) {
        watcher = queue[index];
        // 如果watcher存在before钩子，执行这个钩子，
        // 一般在before中触发beforeUpdate生命周期钩子
        if (watcher.before) {
            watcher.before();
        }
        // 将watcher的id保存在has中
        has.add(id = watcher.id);

        // 执行watcher.run()，触发依赖收集
        watcher.run();

        // 触发watcher.run()之后，watcher将进行依赖收集工作，
        // 此时将有可能会有大量的新watcher被添加到watcher队列中来
        // 当然也就有可能出现循环引用的情况，在这里判断一下，如果出现了循环引用，
        // 并且次数和超过了规定的最大数量，我们就直接跳过终止循环
        if (has.has(id)) {
            // 如果发现has已经中已经有了当前watcher的id,记录其次数，当次数超过阈值便终止循环
            circular[id] = (circular[id] || 0) + 1;
            if(circular[id]>MAX_UPDATE_COUNT){
                warn(`你可能正在执行一个无限循环的操作`);
                break;
            }
        }
    }
    // watcher已经执行完了，准备清空队列
    // 在清空之前,先把两个队列备份下来
    const activatedQueue = activatedChildren.slice();
    const updateQueue = queue.slice();

    // 重置调度中心的状态
    resetSchedulerState();

    // 触发updated和activated生命周期钩子

}

function callUpdatedHooks(queue){
    let i = queue.length;
    while (i--){
        const watcher = queue[i];
        const vm = watcher.$vm;
        if(vm._watcher === watcher && vm._isMounted && !vm._isDestroyed){

        }
    }
}