/**
 * Observer.js 数据响应化对象
 * Vue数据响应化的核心，Vue2.0时代通过Object.defineProperty方式进行数据响应化，而Vue3.0时代则采用Proxy和Reflect方式实现
 * 无论采用哪种方式，但其实现原理都是一样的，都是通过数据劫持的方式实现响应化
 */

import Dep from "./Dep.js";
import {isPlainObject, warn, isEqual,defProtoOrArgument, hasOb, def, isA, isValidArrayIndex, hasOwn} from "../shared/utils.js";
import {arrayMethods} from "./Array.js";

// 用于判断是否需要将数据变成响应化数据，默认为true,即默认需要将数据转化为响应数据，但当初始化inject时是不需要将数据转化成响应式数据的，此时便可以
// 调用下面的 toggleObserve 方法切换
export let shouldObserve = true;

// 切换是否需要将数据变成响应化的状态
export const toggleObserve = (val) => (shouldObserve = val);


/**
 * 将对象变为响应式对象，通过递归调用observer方法可以实现嵌套对象响应化
 * @param obj   带响应化对象
 * @param key   待响应的键值
 * @param value 待响应的值
 */
export const defineReactive = (obj, key, value) => {

    let childOb = createObserver(obj, value);

    Object.defineProperty(obj, key, Observer.baseHandler(obj, key, value,childOb));

};


/**
 * 判断目标数据是否已经响应化，如果响应化，则直接返回其响应化对象__ob__，佛则示例话一个响应化对象
 * @param vm
 * @param data
 * @returns {*}
 */
export const createObserver = (vm,data) => {
    let ob;
    if(hasOb(data)){//该对象已经响应化，直接获取
        ob = data.__ob__;
    }else{
        // 判断是否需要将数据响应化，在初始化inject时，是不需要将数据变成响应化数据的
        if(shouldObserve){
            ob = new Observer(vm,data);
        }

    }
    return ob;
};


class Observer {

    /**
     * 定义统一的操作方法，方便之后收集依赖和响应通知的统一操作
     * @param obj   待响应的对象
     * @param key   待响应的键值
     * @param value 待响应的值
     * @param childOb 子响应对象
     * @returns {*}
     */
    static baseHandler(obj, key, value,childOb) {
        //定义一个依赖对象，与data的key存在一一对应的关系
        const dep = new Dep();
        return {
            enumerable: true,
            configurable: true,
            get() {
                // Dep.target && dep.addDep(Dep.target);
                // 在访问对象属性时，将当前属性加入到依赖列表中
                dep.depend();

                // console.log('收集依赖',obj,key,value,childOb);
                // 用于收集数组对象的依赖
                childOb && childOb.dep.depend();

                // console.log(`获取${key}的值：${value}`);
                return value;
            },
            set(val) {
                // isEqual:原本的目的是为了判断新值val和旧值value相等的情况下，便直接退出，
                // 但因为一个特殊情况，当val和value都等于NaN时，因为NaN===NaN输出为false
                // 会让set方法继续往下执行，因此多加了一个(value!==value&&val!==val)进行拦截
                //
                if (isEqual(val, value)) {
                    return;
                }
                // 由于旧值仍处于闭包当中，this.$data未释放的情况下，直接对value赋值可直接操作this.$data下对应键值下的数据，所以进行以下赋值操作
                value = val;
                // 通知依赖列表循环更新依赖
                dep.notify();

                // console.log(`设置${key}的值：${val}`);

            }
        }
    };


    constructor(vm, target) {
        this.$vm = vm;

        this.defineReactive = defineReactive;
        this.createObserver = createObserver;

        // 将跟数据target设置为已响应，以免重复创建示例
        def(target,'__ob__',this);

        //在此定义依赖收集对象，用来收集数组的依赖
        this.dep = new Dep();

        // 将目标变化变为响应式对象
        this.observer(target);

    }

    /**
     * 对传入的数据进行响应化处理
     * @param data
     */
    observer(data) {
        if (Array.isArray(data)) {//传过来的数据是否是数组
            defProtoOrArgument(data,arrayMethods);
            return this.defineReactiveForArray(data)
        } else if (isPlainObject(data)) {//传递过来的
            return this.defineReactiveForObject(data);
        } else {
            warn(`传递的数据必须是对象或数组，当前传递的值【${data}】类型为：${typeof data}，因此无需响应化`);
        }
    }


    /**
     * 实现对象类型的响应化处理
     * @param obj
     */
    defineReactiveForObject(obj) {
        let keys = Object.keys(obj);

        keys.forEach(key => {
            defineReactive(obj, key, obj[key]);
            // 添加数据代理，将$data中的值代理到this,这样就可以直接通过this.xxx访问$data中的属性了
            this.proxyData(key);
        });
    }

    /**
     * 实现数组类型的响应化处理
     * @param data
     */
    defineReactiveForArray(data) {

        data.forEach(item=>createObserver(this.$vm, item));

    }


    /**
     * 代理$data,将$data中的数据代理到vue实例中，便可直接通过this.xxx获取或设置值
     * @param key
     * @returns {*}
     */
    proxyData(key) {
        Object.defineProperty(this.$vm, key, {
            get() {
                return this.$data[key];
            },
            set(val) {
                this.$data[key] = val;
            }
        })
    }


}


/**
 * 为目标对象或数组增加设置/新增值
 * @param target
 * @param key
 * @param val
 * @returns {*}
 */
export const set = (target,key,val)=>{

    //如果target是数组且key是合法的数组索引，则将目标值加入到数组中
    if(isA(target) && isValidArrayIndex(key)){
        target.length = Math.max(target.length,key);
        target.splice(key,1,val);
        return val;
    }

    //如果key是target非原型链上的属性，说明该key已经是响应化对象了，无需重复响应化，直接修改对应的值即可
    if(key in target && !(key in Observer.prototype)){
        target[key] = val;
        return val;
    }

    //新增属性
    const ob = target.__ob__;

    //如果当前对象未被响应化，则直接设置目标值
    if(!ob){
        target[key] = val;
        return val;
    }

    // TODO 不能在跟对象this.$data和Vue示例上添加属性

    // 如果target是响应化对象，则通过Observer的defineRelative方法设置属性
    ob.defineReactive(target,key,val);
    ob.dep.notify();
    return val;

};

export const del = (target,key) => {
    //如果target是数组且key是合法的数组索引，则删除掉指定索引的数组项
    if(isA(target) && isValidArrayIndex(key)){
        target.splice(key,1);
        return;
    }
    //若target本身就不具有key属性，则无需删除，直接返回
    if(!hasOwn(target,key)) return;

    // TODO 不能在跟对象this.$data和Vue示例上删除属性

    const ob = target.__ob__;
    delete target[key];
    // 通知依赖更新
    ob && ob.dep.notify();
};


export default Observer;