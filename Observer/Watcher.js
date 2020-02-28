// Observer/Watcher.js
// 它相当于是依赖Dep与具体的更新操作的一个中介，也可以理解为他是一个物流中转站，依赖就像是快递，具体更新操作就是快递的目的地，具体流程是这样的：
// 我们把快递(更新)交给快递代收点（Dep）,当快递代收点（Dep）接收到快递之后，会有人来收集快递送到快递中转站(watcher),然后再由快递中转账再统一派发到不同的地址。
import Dep from './Dep.js';
import {parseExp, isObject,isFn} from "../shared/utils.js";
import {arrayMethods} from "./Array.js";
import {traverse} from "./Traverse.js";

class Watcher {

    constructor(vm,expOrFn,cb=function(){},options={immediate: true,deep: false,computed: false},isRenderWatcher=false/*用于标记是否是渲染函数的watcher*/){

        // 如果当前watcher是渲染函数中创建的，则在vm上将当前实例挂载上去
        if(isRenderWatcher){
            vm._watcher = this;
        }

        // 创建实例时，将当前实例对象指向Dep的静态属性target
        this.$vm = vm;
        // 需要坚挺的表达式或者是给定的函数（注：如为函数，则可在函数内使用到的响应化对象属性都会被观察，一旦任一属性值发生变化，都会触发cb回调通知）
        this.expOrFn = expOrFn;
        // 选项
        // options.immediate  true|false  代表是否在创建watcher实例时变直接运行表达式或函数获取结果
        // options.deep       true|false  代表是否进行深度观察，如果为true,会对指定表达式或对象下使用的属性的子属性进行递归观察操作
        //// e.g. data下的对象userInfo的结构是：userInfo:{friends:[{name:'kiner'},{name:'kanger'}],bankInfo:{bankCardNum: 'xxxxxxx'}}
        //// 那么，如果我们要进行深度观察，则如：this.$watch("userInfo",()=>{},{deep:true})
        //// 此后，一旦userInfo下面的任一属性，包括子对象、数组中的值发生改变，上述的$watch都能够观察得到
        this.options = options;

        // 在触发更新之前将会被调用的钩子函数
        this.before = options.before;

        // 当前watcher是否处于活动状态，如果触发了unWatch则为false
        this.active = true;

        // 若给出的是函数，则直接将其赋值给gutter
        if(isFn(expOrFn)){
            this.gutter = expOrFn;
        }else{
            // 若给出的是一个如：userInfo.name或age之类的表达式，则通过parseExp这个高阶函数将表达式进行一定的处理并赋值给gutter
            // 使我们可以直接通过this.gutter.call(this.$vm,this.$vm);的方式直接获得表达式对应的结果
            this.gutter = parseExp(expOrFn);
        }

        // 观察者通知的回调函数
        this.cb = cb;




        // 为实现取消订阅功能，需要知道watcher都订阅了哪些依赖，在取消订阅时，秩序把对应的依赖从依赖列表移除即可
        // 为方便订阅，将依赖列表从Dep移到watcher
        this.deps = [];

        // 为了标志依赖的唯一性，定义一个不可重复的Set用于存储依赖的id
        this.depIds = new Set();

        // 是否是计算属性
        this.computed = options.computed;

        // 监控的数据是否改变
        // dirty为true时代表依赖发生改变了，需要重新计算结果
        this.dirty = options.computed;

        if(this.computed){
            this.value = undefined;
            this.dep = new Dep();
        }else{
            // 如果指定immediate=true则在实例化时离开触发get获取目标值
            if(options.immediate){
                // let oldVal = this.value;
                this.value = this.get();
                // cb.call(this.$vm,this.value,oldVal);
            }
        }

    }

    /**
     * 重新计算结果，并将dirty标记为false
     */
    evaluate(){
        if(this.dirty){
            this.value = this.get();
            this.dirty = false;
        }
        return this.value;
    }

    /**
     * 添加依赖
     */
    depend(){
        if(this.dep && Dep.target){
            this.dep.depend();
        }
    }

    /**
     * 尝试通过表达式或者所给方法获取目标值
     * @returns {*}
     */
    get(){
        Dep.target = this;//指定快递代收点所属的中转站，这样才能够将快递精确的从代收点送到中转站
        //根据给定的表达式或函数直接或取目标值，与此同时，因为触发了get,会将Dep.target添加到依赖列表当中
        let value = this.gutter.call(this.$vm,this.$vm);
        this.sourceValue = value;

        // 若需要观察对象系所有子对象的变化（注：此步骤必须放在`Dep.target = undefined;`之前，因为递归收集子对象依赖时仍需要使用到Dep.target）
        if(this.options.deep){
            traverse(value);
        }

        if(value){
            //尝试解决当value为数组或对象时，newVal和oldVal恒等问题（注：此步骤是因为个人开发原因需要获取对象或数组的新旧值，为方便操作，尝试性实现，Vue官方并无此步骤）
            if(value.__proto__===arrayMethods){
                value = [...value];
            }else if(isObject(value)){
                value = {...value}
            }
        }


        // 加入依赖列表之后释放target
        Dep.target = undefined;
        return value;
    }

    update(){
        if(this.computed){
            if(this.dep.subs.length===0){// 如果依赖中没有订阅者，就直接将dirty标记为true就可以了
                this.dirty = true;
            }else{// 若依赖中存在订阅者，则触发通知更新后，还需要在通知一下这个依赖的所有订阅执行更新操作
                this.getAnInvoke(()=>{
                    this.dep.notify();
                });
            }
        }else{
            this.getAnInvoke(this.cb);
        }
    }

    run(){
        if(this.active){
            // 接收到更新通知时，触发get方法获取改表达式最新的值
            const value = this.get();
            if(this.value!==value||isObject(value)){
                const oldVal = this.value;
                this.value = value;
                // 将新旧值传递给回调函数，即完成$watch('xxxxx',function(newVal,oldVal){})的通知
                this.cb.call(this.$vm,value,oldVal);
            }
        }
    }

    // 中转站已经收到快递了，准备派送，通知各位快递小哥过来拿各自负责区域（视图中的表达式或$watch中监听的方法）的快递进行派送
    getAnInvoke(cb){
        // 接收到更新通知时，触发get方法获取改表达式最新的值
        const value = this.get();
        // vue源码中：如果value是数组/对象时，我们通过$watch((newVal,oldVal)=>{})获取到的newVal和oldVal其实是始终相等的，因为他们都是同一个对象的引用
        if(this.value!==value||isObject(value)){

            const oldVal = this.value;
            this.value = value;
            //将dirty重置为false
            this.dirty = false;
            // 将新旧值传递给回调函数，即完成$watch('xxxxx',function(newVal,oldVal){})的通知
            cb.call(this.$vm,value,oldVal);
        }

        // console.log(`属性${this.expOrFn}发生了变化`);
    }

    /**
     * 添加依赖并经自己订阅到依赖当中
     * @param dep
     */
    addDep(dep){
        const depId = dep.id;
        // 判断依赖是否已经在依赖列表中，若不存在，则添加依赖
        if(!this.depIds.has(depId)){
            this.deps.push(dep);
            this.depIds.add(depId);
            // 为添加的依赖订阅观察者
            dep.addSub(this);
        }

    }

    /**
     * 取消观察，移除依赖列表中所有的当前观察者
     */
    unWatch(){
        // 对当前活动的watcher取消观察
        if(this.active){
            let len = this.deps.length;
            while (len--){
                this.deps[len].removeSub(this);
            }
            this.active = false;
        }

    }

}

export default Watcher;