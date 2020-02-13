import {createObserver, defineReactive, shouldObserve, toggleObserve} from "../Observer/Observer.js";
import {
    assertType, bind,
    camelize, capitalize, getData, getPropDefaultValue,
    hasOwn,
    hyphenate,
    isA, isFn,
    isPlainObject, isReserved,
    isSameType,
    isString,
    nativeWatch, noop,
    proxy, sharedPropertyDefinition, toRawType,
    warn
} from "../shared/utils.js";
import Watcher from "../Observer/Watcher.js";

import Dep from '../Observer/Dep.js';

export const initState = vm => {

    // 用于收集所有的观察者对象，包括用户通过$watch添加的监听
    vm._watchers = [];

    const opts = vm.$options;

    // 将属性转成统一规格的对象，方便统一处理
    normalizeProps(opts, vm);

    if (opts.props) initProps(vm, opts.props);
    if (opts.methods) initMethods(vm, opts.methods);
    if (opts.data) {
        initData(vm);
    } else {
        createObserver(vm, (vm.data = {}));
    }
    if (opts.computed) initComputed(vm, opts.computed);
    if (opts.watch && opts.watch !== nativeWatch) initWatch(vm, opts.watch);
};

/**
 * 规格化属性，传进来的不同类型的属性配置（字符串数组或对象）统一成对象形式
 * @param options
 * @param vm
 */
export const normalizeProps = (options, vm) => {
    const props = options.props;
    if (!props) return;

    // 用于存储统一规格后的属性
    const res = {};

    let name, val;
    // 属性有两种形式
    // 1、数组形式，如 props: ["data","real-list"]
    if (isA(props)) {
        let i = props.length;
        while (i--) {
            let prop = props[i];
            if (isString(prop)) {
                // 将real-list这种格式的属性名称统一转换成小驼峰形式：realList
                name = camelize(prop);
                res[name] = {type: null};
            } else {
                warn(`当props类型为数组时，数组内的元素仅支持字符串类型，所给${prop}属性的类型为：${typeof prop}`);
            }
        }
    }
    // 2、对象形式，如 props: { data: { type: Object, default: {} } }
    else if (isPlainObject(props)) {
        // 循环对象的每一个key，将key规格化后加入到目标对象中
        for (let key in props) {
            val = props[key];
            name = camelize(key);

            res[name] = isPlainObject(val) ? val : {type: val};
        }
    } else {
        warn(`属性仅支持字符串数组形式或对象形式，所给数组的类型为：${typeof props}`);
    }

    // 将统一规格后的属性覆盖旧的属性
    options.props = res;
};

/**
 * 根据已经标准化的属性对象初始化属性
 * @param vm
 * @param propsOptions
 */
export const initProps = (vm, propsOptions) => {
    const propsData = vm.$options.propsData || {};
    const props = vm._props = {};
    // 用于缓存props的key
    const keys = vm.$options._propsKeys = [];
    // 当前实例是否是根实例
    const isRoot = !vm.$parent;

    // 除了根实例之外的实例，属性都不需要响应化
    if (!isRoot) {
        toggleObserve(false);
    }

    // 循环属性配置并挂在在vm._props实例上,最后代理到vue实例上
    for (const key in propsOptions) {
        keys.push(key);
        // 校验并获取属性值
        const value = validateProp(key, propsOptions, propsData, vm);
        // 将属性定义在_props上
        defineReactive(props, key, value);
        // 若在vue实例上不存在该属性，则将该属性代理到vue实例上
        if (!(key in vm)) {
            proxy(vm, `_props`, key);
        }
    }
    // 恢复Observer的响应化
    toggleObserve(true);

};
/**
 * 校验并获取属性值
 * @param key               propOptions中的属性名
 * @param propsOptions      子组件中用户设置的props选项
 * @param propsData         父组件或用户传递过来的props数据
 * @param vm                vue实例
 */
export const validateProp = (key, propsOptions, propsData, vm) => {
    // 属性配置信息
    const prop = propsOptions[key];
    // 父组件中传递过来的属性值
    let value = propsData[key];
    // 父组件是否不存在该属性，也就是说，父组件是否没有传递该属性的数据
    let absent = !hasOwn(propsData, key);

    // 对布尔类型的属性进行特殊处理
    if (isSameType(Boolean, prop.type)) {
        // 如果父组件没有传递该属性值过来并且子组件属性定义时未指定默认值，则属性值为false
        if (absent && hasOwn(prop, 'default')) {
            value = false;
        }
        // 若value是空字符串，如：<child name/>
        // 或value的属性名与属性值相同，如：
        // <child name="name"/> 或 <child userName="user-name"/> 或 <child user-name="user-name"/>
        else if (value === '' || value === hyphenate(key)) {
            value = true;
        }
    }
    // 除布尔类型的属性之外，其他类型无需特殊处理，若属性值不存在，则获取默认值赋值给该属性，并将默认值设置为响应式
    if (value === undefined) {
        // 获取属性的默认值
        value = getPropDefaultValue(vm, prop, key);

        // 将默认值转化为响应式数据
        const prevShouldObserve = shouldObserve;
        toggleObserve(true);
        createObserver(vm, value);
        toggleObserve(prevShouldObserve);
    }

    // 对prop进行校验，断言属性值合法与否


    return value;
};
/**
 * 对属性的合法性进行断言
 * @param prop
 * @param name
 * @param value
 * @param vm
 * @param absent
 */
export const assertProp = (prop, name, value, vm, absent) => {
    // 若该属性为必传属性，但父组件未传值，则警告提示
    if (prop.required && absent) {
        warn(`属性${name}为必传属性，请务必在父组件调用子组件时传入该属性`);
    }

    // 若该属性不是必传属性，且属性值时null,则无需后续判断直接通过
    if (!prop.required && value === null) {
        return;
    }

    // 属性类型
    let propType = prop.type;

    // 当属性类型传过来的是原生构造函数和或数组时，需要进行类型的详细校验，因此使用!prop.type方式将其设置为默认不通过，等待进一步确认
    // 当没有传属性类型过来时，!prop.type为true,即无需进行校验，直接通过
    // 有一种特殊情况，vue中允许使用props:{data:true}这样的形式定义，代表data属性一定会校验成功，无需进一步校验，此时通过：prop.type===true得出结果true
    // 便是默认通过校验
    let isValid = !prop.type || prop.type === true;

    // 用于存储预期类型
    const expectedTypes = [];

    // 如果有指定属性类型进行进一步的判断
    if (propType) {
        // 由于属性类型可能是原生构造函数或数组，为了统一处理，统一转换成数组形式
        if (!isA(propType)) {
            propType = [propType];
        }
        // 若默认校验通过，则无需走一下具体类型判断逻辑，直接跳过，否则需校验具体类型是否合法
        //循环校验时，一旦有一个属性不合法，则直接终止循环
        for (let i = 0; i < propType.length && !isValid; i++) {
            let type = propType[i];
            const assertedType = assertType(value, type);
            expectedTypes.push(assertedType.expectedType);
            isValid = assertedType.isValid;
        }
    }

    // 进行详细的类型校验之后，仍然是不合法，则警告提示
    if (!isValid) {
        warn(`校验属性${name}时发现非法属性类型，我们预期的到的类型是${expectedTypes.map(capitalize).join(', ')}，但所提供的数据类型却是：${toRawType(value)}`);
    }

    // 默认校验完成，开始启动用户自定义属性校验器校验属性合法性
    const validator = prop.validator;
    if (validator) {
        // 校验不通过，警告提示
        if (!validator(value)) {
            warn(`属性${name}未通过用户自定义属性校验器validator校验，请检查`);
        }
    }
};

/**
 * 初始化methods
 * @param vm
 * @param methods
 */
export const initMethods = (vm, methods) => {

    const props = vm.$options.props;
    for (const key in methods) {

        if (methods[key] === null) {
            warn(`您尚未实现方法${key}的逻辑`);
        }
        if (props && hasOwn(props, key)) {
            warn(`您所定义的方法${key}已经被 定义为属性prop了`);
        }

        if ((key in vm) && isReserved(key)) {
            warn(`在Vue实例上已经存在以$或_开头的同名方法`);
        }

        // 将定义的方法挂载到vue实例上
        vm[key] = methods[key] === null ? noop : bind(methods[key], vm);
    }

};
/**
 * 初始化data数据
 * @param vm
 */
export const initData = (vm) => {
    let data = vm.$options.data;
    // 若data是函数则执行函数获取data的返回值并指向vm._data同时把指针 指向data,只要data发生改变，相同指针的vm._data也也会相应发生改变
    data = vm._data = isFn(data) ? getData(data, vm) : data || {};

    // 如果获得的data不是一个朴素对象，则警告提示,并纠正为一个空对象，防止下面处理报错
    if (isPlainObject(data)) {
        data = {};
        warn(`data需要传入一个返回对象类型的函数，如：data(){return {name: 'kiner'}}`);
    }

    // 循环每一个key,若该key没有在methods、props、以及内部方法、变量（$或_开头的属性）占用，则将数据响应化后代理到vue实例上
    const keys = Object.keys(data);
    const props = vm.$options.props;
    const methods = vm.$options.methods;

    let i = keys.length;

    while (i--) {
        const key = keys[i];

        if (methods && hasOwn(methods, key)) {
            warn(`您在data中定义的属性${key}已经在methods定义过了`);
        }

        if (props && hasOwn(props, key)) {
            warn(`您在data中定义的属性${key}已经在props定义过了`);
        } else if (isReserved(key)) {//如果key不是以$或_开头，则将数据代理到vue实例上
            proxy(vm, `_data`, key);
        }
    }

    // 启动观察者观察data变化
    createObserver(vm, data);


};

// 计算属性的观察者配置
const computedWatcherOptions = {lazy: true};

/**
 * 初始化计算属性
 * @param vm
 * @param computed
 */
export const initComputed = (vm, computed) => {
    // 在vue实例上定义一个_computedWathers用于存储computed的watcher
    const watchers = vm._computedWathers = Object.create(null);

    for (const key in computed) {
        const userDef = computed[key];
        // 获取computed的getter
        const getter = isFn(userDef) ? userDef : userDef.get;

        // 如果getter不存在，则警告
        if (getter === null) {
            warn(`计算属性${key}未提供getter方法。`);
        }

        // 实例化watcher持续观察计算属性下使用的所有数据的变化，以便一旦某个数据更新时，及时通知更新数据，重新渲染
        watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions);

        // 如果该计算属性尚未在vue实例上定义，则定义，否则警告
        if (!(key in vm)) {
            defineComputed(vm, key, userDef);
        } else {
            if (key in vm.$data) {
                warn(`计算属性${key}已经在data中定义`);
            } else if (vm.$options.props && key in vm.$options.props) {
                warn(`计算属性${key}已经在props中定义`);
            }
        }
    }
};

/**
 * 定义计算属性
 * @param vm
 * @param key
 * @param userDef
 */
export const defineComputed = (vm, key, userDef) => {
    // 是否需要缓存，非服务端渲染都需要缓存，本vue实例暂不考虑服务端渲染的情况，因此默认都需要缓存
    const shouldCache = true;

    if (isFn(userDef)) {
        sharedPropertyDefinition.get = shouldCache ? createComputeGetter(userDef) : userDef;
        sharedPropertyDefinition.set = noop;// 因为sharedPropertyDefinition是共享的默认属性描述，因此，即使没有特殊逻辑，也应该将对应的set设置回默认的noop,以免收到之前设置的set的干扰
    } else {
        const getter = userDef.get;
        const setter = userDef.set;
        sharedPropertyDefinition.get = getter ? (shouldCache && userDef.cache !== false ? createComputeGetter(key) : getter) : noop;
        sharedPropertyDefinition.set = setter ? setter : noop;
    }

    // 当set为noop时，如果用户尝试设置computed的值，则给出警告
    if (sharedPropertyDefinition.set === noop) {
        sharedPropertyDefinition.set = function () {
            warn(`计算属性${key}已经指定但没有提供setter函数，因此无法改变该值`);
        };
    }

    // 在vue实例上定义该计算属性
    Object.defineProperty(vm, key, sharedPropertyDefinition);
};

/**
 * 创建一个计算属性的getter方法，他是一个高阶函数，会返回一个computedGetter函数
 * @param key
 * @returns {computedGetter}
 */
export const createComputeGetter = key => {
    return function computedGetter() {
        // 将当前计算属性的watcher拿出来
        const watcher = this._computedWathers && this._computedWathers[key];
        if (watcher) {
            // 第一个版本，有bug,官方之后修复
            // // 当数据依赖数据发生改变时，重新计算
            // if (watcher.dirty) {
            //     watcher.evaluate();
            // }
            // // 将计算属性的watcher添加到它所依赖的所有状态的依赖列表中，一旦他所依赖的某个状态发生了改变，便会通知他的依赖列表更新
            // if (Dep.target) {
            //     watcher.depend();
            // }
            // // 返回新计算的值
            // return watcher.value;

            // 修复后仅有一下两行代码，大部分更改在Watcher.js中
            watcher.depend();
            return watcher.evaluate();
        }
    }
};

/**
 * 初始化watch
 * @param vm
 * @param watch
 */
export const initWatch = (vm, watch) => {
    for (const key in watch){
        const handler = watch[key];
        // 若传过来的是数组，则将数组总得每一个handler都取出来用createWatcher创建watcher
        if(isA(handler)){
            handler.forEach(h=>createWatcher(vm, key, h));
        }else{
            createWatcher(vm, key, handler);
        }
    }
};

/**
 * 创建watcher
 * @param vm
 * @param key
 * @param handler
 * @param options
 * @returns {Function}
 */
export const createWatcher = (vm, key, handler, options) => {
    // 若handler是对象，那么可能采用的是:
    // {
    //      handler: function(){},
    //      immediate: true
    // }
    // 因此将handler指向options,而handler则变成handler.handler
    if(isPlainObject(handler)){
        options = handler;
        handler = handler.handler;
    }
    // 如果handler是字符串类型，那么可能采用的是；
    // userInfo: "watchUserInfo"
    // 代表观察函数已经定义并挂载在vue的实例上了
    if(typeof handler === "string"){
        handler = vm[handler];
    }

    // 通过$watch对指定的表达式进行观察，一旦发生改变，便会触发handler
    return vm.$watch(key, handler, options);
};