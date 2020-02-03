// utils.js 基础工具库,提供一些工具方法

import {LIFECYCLE_HOOKS} from "./constants.js";
import config from "../config";
import {camelizeRE, hyphenateRE, simpleCheckRE} from "./RE.js";

/**
 * 判断对象是否支持__proto__属性
 * @type {boolean}
 */
export const hasProto = '__proto__' in {};

const _toString = Object.prototype.toString;

/**
 * 判断传递过来的对象是否是纯对象
 * @param obj
 * @returns {boolean}
 */
export const isPlainObject =  function(obj){
    let prototype;

    return _toString.call(obj) === '[object Object]'
        && (prototype = Object.getPrototypeOf(obj), prototype === null ||
        prototype === Object.getPrototypeOf({}))
};

/**
 * 判断是否为非空对象
 * @param obj
 * @returns {boolean}
 */
export const isObject = obj => (obj !== null && typeof obj === 'object');


/**
 * 判断给定方法是否是原生方法
 * @param Ctor
 * @returns {boolean}
 */
export const isNative = Ctor => typeof Ctor === 'function' && /native code/.test(Ctor.toString());

/**
 * 判断目标环境是否支持Symbol
 * @type {boolean}
 */
export const hasSymbol = typeof Symbol !== 'undefined' && isNative(Symbol) &&
    typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

/**
 * 显示警告消息
 * @param message
 */
export const warn = function (message) {
    console.warn(message);
};



/**
 * 定义不可枚举的属性
 * @param obj
 * @param key
 * @param value
 * @param enumerable 能否枚举
 */
export const def = function (obj,key,value,enumerable) {
    if(typeof obj === "object"){
        Object.defineProperty(obj,key,{
            value: value,
            configurable: true,
            enumerable: !!enumerable,
            writable: true
        });
    }
};

/**
 * 删除数组中的元素
 * @param arr
 * @param item
 * @returns {T[]}
 */
export const removeArrItem = function (arr, item) {
    const index = arr.indexOf(item);
    if(index!==-1){
        return arr.splice(index,1);
    }
};

/**
 * 根据表达式从目标对象中找到对应的值
 * e.g.
 *      若obj={userInfo:{userName}}
 *      exp="userInfo.userName"
 *
 * @param obj
 * @param exp
 * @returns {*}
 */
export const parseExp = function (exp) {

    return obj => {
        let reg = /[^\w.$]/;
        if(reg.test(exp)){
            return;
        }else{
            let subExp = exp.split('.');
            subExp.forEach(item=>{
                obj = obj[item];
            });
            return obj;
        }
    };
};

/**
 * 判断两个变量是否相等（但因为一个特殊情况，当a和b都等于NaN时，因为NaN===NaN输出为false）
 * @param a
 * @param b
 * @returns {boolean}
 */
export const isEqual = (a,b) => a===b||(a!==a&&b!==b);

/**
 * 将拦截器方法直接覆盖到目标对象的原型链上__proto__
 * @param obj
 * @param target
 * @returns {*}
 */
export const patchToProto = (obj,target) => obj.__proto__ = target;

/**
 * 直接在目标对象上定义不可枚举的属性
 * @param obj
 * @param arrayMethods
 * @param keys
 * @returns {*}
 */
export const copyArgument = (obj,arrayMethods,keys) => keys.forEach(key=>def(obj,key,arrayMethods[key]));

/**
 * 判断当前浏览器是否支持__proto__若支持，这直接将目标方法覆盖到__proto__上，否则，直接将方法定义在目标对象上
 * @param obj
 * @param src
 * @param keys
 * @returns {*}
 */
export const defProtoOrArgument = (obj,src,keys=Object.getOwnPropertyNames(src)) => hasProto ? patchToProto(obj,src) : copyArgument(obj,src,keys);

/**
 * 判断目标对象是否含有指定属性
 * @param obj
 * @param key
 * @returns {boolean}
 */
export const hasOwn = (obj,key) => obj.hasOwnProperty(key);

/**
 * 判断目标对象是否已经响应化
 * @param obj
 * @returns {boolean}
 */
export const hasOb = obj => hasOwn(obj,'__ob__');

/**
 * 判断传入参数类型是否为函数
 * @param fn
 * @returns {boolean}
 */
export const isFn = fn => typeof fn === "function";

/**
 * 判断所给参数是否是一个数组
 * @param arr
 * @returns {arg is Array<any>}
 */
export const isA = arr => Array.isArray(arr);

/**
 * 判断给定参数是否是合法的数组索引
 */
export const isValidArrayIndex = (val) => {
    const n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val)
};

/**
 * 调用生命周期钩子
 * @param vm
 * @param hook
 */
export const callHook = (vm, hook) => {
    const handlers = vm.$options[hook];
    handlers&&handlers.forEach(handler=>{
        try{
            handler.call(vm);
        }catch (e) {
            handleError(e, vm, `生命周期钩子：${hook}报错`)
        }
    });
};

/**
 * 选择dom元素
 * @param el
 * @returns {(Element | null) | HTMLDivElement}
 */
export const query = el => (typeof el === "string")?(document.querySelector(el) || document.createElement('div')):el;

/**
 * 获取给定dom元素的outerHTML
 * @param el
 * @returns {string}
 */
export const outerHTML = el => {
    if(el.outerHTML){
        return el.outerHTML;
    }else{
        const container = document.createElement('div');
        container.appendChild(el.cloneNode(true));
        return container.innerHTML;
    }
};

/**
 * 将字符串形式的代码转化渲染函数
 * @param code
 * @returns {Function}
 */
export const createFunction = code => new Function(code);

/**
 * 判断所给对象是否为非空对象
 * @param val
 * @returns {boolean}
 */
export const isDef = val => val !== undefined && val !== null;

/**
 * 判断所给对象是否不是非空对象
 * @param val
 * @returns {boolean}
 */
export const isUnDef = val => val === undefined || val === null;

/**
 * 该元素内容是否为纯文本
 * @param elem
 * @returns {boolean}
 */
export const isPlainTextElement = elem => ["script","style","textarea"].includes(elem);

/**
 * 将一个由,分割的字符串转换为map对象，并返回一个可以访问该对象值的函数
 * @param str
 * @param toLowerCase
 * @returns {function(*): *}
 */
export const makeMap = (str,toLowerCase=false) => {
    let map = {};
    let list = str.split(',');
    list.forEach(item=>(map[item]=true));

    return toLowerCase?val=>map[val.toLowerCase()]:val=>map[val];
};

/**
 * 网页保留标签
 */
export const isHTMLTag = makeMap(
    'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
);

/**
 * svg保留标签
 */
export const isSVG = makeMap(
    'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
    'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
    'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
    true
);

/**
 * 判断是否是pre标签
 * @param tag
 * @returns {boolean}
 */
export const isPreTag = tag => tag === 'pre';

/**
 * 判断是否是网页保留标签
 * @param tag
 * @returns {*}
 */
export const isReservedTag = tag => {
    return isHTMLTag(tag) || isSVG(tag)
};

/**
 * 是否内置标签
 * @type {function(*): *}
 */
export const isBuiltInTag = makeMap('slot,component', true);

/**
 * 定义一个空函数，用于对一些参数的默认赋值
 */
export const noop = () => {};

/**
 * 是否是浏览器环境
 * @type {boolean}
 */
export const inBrowser = typeof window !== 'undefined';

/**
 * 合并多个对象并返回一个新的对象
 * @param args
 */
export const mergeOptions = (...args) => {
    let newOptions = {};
    args.forEach(option=>{
        if(option){
            let keys = Object.keys(option);
            keys.forEach(key=>{
                if(LIFECYCLE_HOOKS.includes(key)){

                    let op = option[key];
                    if(isA(op)){
                        (newOptions[key]||(newOptions[key] = [])).push(...option[key]);
                    }else{
                        (newOptions[key]||(newOptions[key] = [])).push(option[key]);
                    }

                }else{
                    newOptions[key] = option[key]
                }
            });
        }

    });
    return newOptions;
};

/**
 * 为目标对象设置代理
 * @param target
 * @param sourceKey
 * @param key
 * @returns {any}
 */
export const proxy = (target,sourceKey,key) => Object.defineProperty(target, key, {
    get(){
        return this[sourceKey][key];
    },
    set(val){
        this[sourceKey][key] = val;
    }
});

/**
 * 全局处理报错
 * @param err
 * @param vm
 * @param info
 * @returns {*}
 */
export const handleError = (err, vm, info) => {

    // 循环查找当前实例的父级组件，若有errorCaptured,则逐个通知，直到没有父级或return false;
    if(vm){
        let cur = vm;
        while ((cur = cur.$parent)){
            const hooks = cur.$options.errorCaptured;
            if(hooks){
                for(let i=0;i<hooks.length;i++){
                    try{
                        const capture = hooks[i].call(cur, err, vm, info) === false;
                        if(capture){
                            return;
                        }
                    }catch (e) {
                        globalHandleError(e, cur, `errorCaptured hook`);
                    }

                }
            }
        }
    }

    globalHandleError(err, vm, info);
};

/**
 * 全局异常捕获处理
 * @param err
 * @param vm
 * @param info
 * @returns {*}
 */
export const globalHandleError = (err, vm, info) => {
    if(config.errorHandler){
        try{
            return config.errorHandler(err, vm, info);
        }catch (e) {
            logger(e);
        }
    }
};

/**
 * 全局日志输出
 * @param e
 * @param type
 * @returns {*}
 */
export const logger = (e,type='error') => console[type](e);

/**
 * 用于缓存一个函数，若所给函数已经在缓存中存在，则直接获取缓存中的函数，否则，将目标函数添加到缓存中并返回；
 * @param fn
 * @returns {function(*): *}
 */
export const cached = (fn) => {
    const cache = Object.create(null);

    return (name)=>{
        const cacheFn = cache[name];
        return cacheFn ? cacheFn : (cache[name] = fn);
    };
};

/**
 * 带有通用错误捕获的方法调用工具
 * @param fn
 * @param ctx
 * @param args
 * @param info
 */
export const invokeWithErrorHandle = (fn, ctx, args, info) => {
    try{
        fn.apply(ctx, args);
    }catch (e) {
        handleError(e, ctx, info);
    }
};

/**
 * 获取浏览器在对象下定义的watch(如果存在的话)，用于比较所给watch是否是原生的watch
 * Firefox has a "watch" function on Object.prototype...
 */
export const nativeWatch = ({}).watch;

/**
 * 用于将"my-new-component"类型的文本转换成小驼峰形式"myNewComponent"
 * @param str
 * @returns {string | void | *}
 */
export const camelize = cached(str => str.replace(camelizeRE, (a,b)=>b?b.toUpperCase():''));

/**
 * 与camelize相反，本方法是将驼峰形式的字符串转换为用-分割的字符串
 * myNewComponent           =>              my-new-component
 * @type {function(*): *}
 */
export const hyphenate = cached(str => {
    return str.replace(hyphenateRE, '-$1').toLowerCase();
});
/**
 * 将字符串首字母转成大写
 * @type {function(*): *}
 */
export const capitalize = cached(function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
});

/**
 * 判断是否为字符串
 * @param str
 * @returns {boolean}
 */
export const isString = str => typeof str === "string";

/**
 * 获取函数的类型
 * @param fn
 * @returns {*}
 */
export const getType = (fn) => {
    let match = fn && fn.toString().match(/^\s*function (\w+)/);
    return match ? match[1] : ''
};

/**
 * 判断所给的两个值的类型是否相同
 * @param a
 * @param b
 * @returns {boolean}
 */
export const isSameType = (a, b) => {
    return getType(a) === getType(b)
};

/**
 * 获取属性配置中的默认值
 * @param vm
 * @param prop
 * @param key
 * @returns {*}
 */
export const getPropDefaultValue = (vm, prop, key) => {
    // 若属性配置中没有default配置,则直接返回
    if(!hasOwn(prop,'default')){
        return undefined;
    }

    let defaultVal = prop.default;

    // 若默认值是对象类型，则提示用户若默认值为对象或数组类型，必须使用一个工厂函数，并让这个工厂函数返回目标对象或数组，即:
    // 错误写法：{data: Object, default: {}}
    // 正确写法：{data: Object, default: function(){return {}}}
    if(isObject(defaultVal)){
        warn(`属性${key}设置的默认值为对象或数组类型，必须使用必须使用一个工厂函数，并让这个工厂函数返回目标对象或数组。如：\n{data: Object, default: function(){return {}}}`);
    }

    // 若发现父级组件未传递属性值过来但在_props发现了改属性已经定义过了，就无须重复响应化，直接返回已经建立的属性即可
    if(
        vm &&
        vm.$options.propsData &&
        vm.$options.propsData[key] === undefined &&
        vm._props[key] !== undefined
    ){
        return vm._props[key];
    }

    // 当默认值时函数类型但又不是空函数时，返回函数执行结果，否则直接返回默认值
    return (isFn(defaultVal) && !isSameType(Function, defaultVal))?defaultVal.call(vm):defaultVal;
};
/**
 * 将所给对象转化为原始类型字符串
 * e.g.
 * [object Object]
 * @param obj
 * @returns {string}
 */
export const toRawType = obj => _toString.call(obj).slice(8, -1);

/**
 *
 * @param value
 * @param type
 * @returns {{valid: *, expectedType: *}}
 */
export const assertType =  (value, type) => {
    let valid;
    // 获取函数的类型字符串用于判断
    let expectedType = getType(type);
    // 通过一个简单类型的正则校验，判断预期类型是否是String,Number,Function,Boolean,Symbol中的一个
    if (simpleCheckRE.test(expectedType)) {
        // 获取目标值的类型
        let t = typeof value;
        // 对比两个类型看看是否相等，
        valid = t === expectedType.toLowerCase();
        // 对于原始包装器对象，当类型不一致时，还需要判断一下value是不是预期类型type的实例，如果是，说明也通过校验，否则不通过
        if (!valid && t === 'object') {
            valid = value instanceof type;
        }
    } else if (expectedType === 'Object') {// 如果与其类型是对象，那么校验value是否是纯对象类型
        valid = isPlainObject(value);
    } else if (expectedType === 'Array') {// 若预期类型是数组，则校验value是否是数组类型
        valid = isA(value);
    } else {// 其他情况则看value是否是与其类型type的实例
        valid = value instanceof type;
    }
    return {
        valid: valid,
        expectedType: expectedType
    }
};

/* istanbul ignore next */
function polyfillBind (fn, ctx) {
    function boundFn (a) {
        var l = arguments.length;
        return l
            ? l > 1
                ? fn.apply(ctx, arguments)
                : fn.call(ctx, a)
            : fn.call(ctx)
    }

    boundFn._length = fn.length;
    return boundFn
}

function nativeBind (fn, ctx) {
    return fn.bind(ctx)
}

/**
 * 改写方法的this
 */
export const bind = Function.prototype.bind
    ? nativeBind
    : polyfillBind;

/**
 * 判断字符串是否以$或_开头
 * @param str
 * @returns {boolean}
 */
export const isReserved = str => ['$','_'].indexOf(str.charAt(0))>=0;

/**
 * 获取data函数的的返回值
 * @param data
 * @param vm
 * @returns {*}
 */
export const getData = (data, vm) => {
    try{
        return data.call(vm, vm);
    }catch (e) {
        handleError(e, vm, `初始化data报错`);
    }
};

export default {
    hasProto,
    isPlainObject,
    isObject,
    hasSymbol,
    warn,
    def,
    removeArrItem,
    isEqual,
    parseExp,
    patchToProto,
    copyArgument,
    defProtoOrArgument,
    hasOwn,
    hasOb,
    isFn,
    isA,
    isValidArrayIndex,
    callHook,
    isNative,
    query,
    outerHTML,
    isDef,
    isUnDef,
    isPlainTextElement,
    isHTMLTag,
    isSVG,
    isPreTag,
    isReservedTag,
    noop,
    mergeOptions,
    handleError,
    globalHandleError,
    logger,
    cached,
    invokeWithErrorHandle,
    nativeWatch,
    isString,
    getType,
    isSameType,
    camelize,
    hyphenate,
    getPropDefaultValue,
    capitalize,
    toRawType,
    isReserved
}