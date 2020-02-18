// utils.js 基础工具库,提供一些工具方法

import {LIFECYCLE_HOOKS} from "./constants.js";
import {camelizeRE, hyphenateRE, listDelimiter, propertyDelimiter, simpleCheckRE} from "./RE.js";
import config from "../config.js";

/**
 * 判断对象是否支持__proto__属性
 * @type {boolean}
 */
export const hasProto = '__proto__' in {};

const _toString = Object.prototype.toString;

/**
 * 将目标值转化为字符串
 * @param val
 * @returns {string}
 */
export const toString = val => {
    return val == null
        ? ''
        : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
            ? JSON.stringify(val, null, 2)
            : String(val)
};

/**
 * 判断两个参数是否松散相等
 * 即：如果两个都是普通对象，那么我们看一下他们的特征是否一样
 * 如：如果两个都是数组，那么只要他们的子元素个数一样，并且子元素也满足松散相等的要求就算他们相等
 * 再如：如果两个都是日期对象，那么看一下他们的时间戳是否相等，如果相等就认为他们是松散相等
 * @param a
 * @param b
 * @returns {boolean}
 */
export const looseEqual = (a, b) => {
    // 如果这两个值完全相等，那不用做其他处理，直接return true
    if(a===b) return true;

    const isObjectA = isObject(a);
    const isObjectB = isObject(b);

    if(isObjectA && isObjectB){ // 如果两个值都是对象的话
        try{
            // 再看看是不是两个值都是数组
            const isArrayA = isA(a);
            const isArrayB = isA(b);

            if(isArrayA && isArrayB){
                // 如果两个值都是数组，则判断两个数组是不是长度相等，然后再递归判断数组的每一项是否也符合looseEqual的要求
                return a.length === b.length && a.every((item, index)=> looseEqual(item, b[index]));
            }else if (a instanceof Date && b instanceof Date) {
                // 如果两个值都是日期对象的实例，那么我们看一下他们的时间戳是否相等即可
                return a.getTime() === b.getTime();
            }else if(!isArrayA&&!isArrayB){
                // 如果两个都不是数组，那她就是一个普通的对象，我们看一下他们的key的数量是否相等，
                // 如果相等再看看每个key对应的值是否符合looseEqual的要求
                const keysA = Object.keys(a);
                const keysB = Object.keys(b);
                return keysA.length===keysB.length&&keysA.every(key=>looseEqual(a[key], b[key]));
            }else{
                // 如果不是以上任何一种情况，那么他不满足条件
                return false;
            }
        }catch (e) {
            return false;
        }
    } else if (!isObjectA && !isObjectB) {
        // 如果两个都不是对象，看一下两个都转成字符串后是否一致
        return String(a) === String(b);
    }else{
        return false;
    }
};
/**
 * 在数组中查找与目标值松散相等的元素的索引
 * @param arr
 * @param val
 * @returns {number}
 */
export const looseIndexOf = (arr, val) => {
    for(let i=0,l=arr.length;i<l;i++){
        if(looseEqual(arr[i],val)) return i;
    }
    return -1;
};

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
    if(config.debug.showWarn){
        console.warn(message);
    }
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

    return toLowerCase?(val="")=>map[val.toLowerCase()]:val=>map[val];
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
 * 无论传入什么值都返回false
 * @returns {boolean}
 */
export const no = () => false;

/**
 * 返回一个一模一样的结果
 * @param _
 * @returns {*}
 */
export const identity = _ => _;

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
        return cacheFn ? cacheFn : (cache[name] = fn(name));
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
/**
 * 默认属性描述符
 * @type {{enumerable: boolean, configurable: boolean, get: noop, set: noop}}
 */
export const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
};

/**
 * 在选项中查找一些目标资源
 * @param options
 * @param type
 * @param id
 * @returns {*}
 */
export const resolveAsset = (options, type, id) => {
    if(isUnDef(options)){
        return;
    }
    // id只可能是字符串
    if(typeof id !== "string"){
        return;
    }
    const assets = options[type];
    if(isUnDef(assets)){
        return;
    }

    // console.log('+++++',assets);

    if(hasOwn(assets, id)) return assets[id];
    // 若传进来的id是"my-filter"形式的字符串，则尝试通过其小驼峰形式字符串进行查找
    let camelizeId = camelize(id);
    if(hasOwn(assets, camelizeId)) return assets[camelizeId];
    // 通过驼峰形式还是没找到，尝试转化成大驼峰形式（即首字母大写）
    let capitalizeId = camelizeId(camelizeId);
    if(hasOwn(assets, capitalizeId)) return assets[capitalizeId];

    // 如果上述方式都没找到指定资源，则最后在原型链上再找一次，若找到则返回，否者警告提示
    const res = assets[id] || assets[camelizeId] || assets[capitalizeId];
    if(!res){
        warn(`通过您所提供的id${id},没有找到你要找的${type}`);
    }
    return res;

};

/**
 * 可通过此方法进行新增、删除、替换数组元素
 * @param arr           [Array] 待处理数组
 * @param index         [number] 待处理目标元素索引
 * @param newItem       [any] 新增或替换的元素，删除时可传入任意值，删除时实际并不会使用这个参数化
 * @param remove        [true|false] 当前是否是删除操作，由于数组中也有可能需要加入undefined、null、false等值，因此光靠newItem不能判断是否需要删除一个元素，因此新增此字段，
 * @returns {*}
 */
export const dueArrItemByIndex = (arr, index, newItem,remove=false)=>{
    // 由于本方法既可以处理新增，又可以处理修改，当新增元素的时候，数组长度会增加,如果是修改元素值则不变，因此，我们取目标索引值与当前数组长度两者之间的最大值设置为数组新的长度。
    // 注意：splice方法，如果要在数组最后面添加一个元素，不需要修改数组的长度，splice会自动修改，如：
    //
    // var arr = [1,2,3];arr.splice(3,1,4);console.log(arr); // 输出：[1, 2, 3, 4]
    //
    // 但如果不是直接在数组最后面加，而是数组后几位，那么，如果不修改数组length的话，是不能正常添加的。
    //
    // 不修改长度：（结果是错误的，因为我们穿的index是4，是想要在索引为4也就是第5位元素上插入数字4，但结果只是在第4位插入了，其索引实际只是3，并非预期答案）
    //
    // var arr = [1,2,3];arr.splice(4,1,4);console.log(arr); // 输出：[1, 2, 3, 4]
    //
    // 修改数组长度：
    //
    // var arr = [1,2,3];arr.length=4;arr.splice(4,1,4);console.log(arr); // 输出：[1, 2, 3, empty, 4]
    //
    // 从上面的例子我们可以看出，使用splice方法添加元素，如果是直接紧接着最后一个元素添加的话，数组的长度是会自动加一，无需我们额外处理的，但是我们实际使用的时候，并不一定会紧接着最后一个元素添加，index传入的只要是合法的数组索引就可以的，所以，我们需要修正一下length用来兼容这种情况。
    // 那么，我们要怎么确定length的长度呢，从上面的例子可以看出，当且仅当index>=arr.length时才是新增元素，其他情况则视为是修改。
    // * 那么在新增元素的时候，其实我们只要让数组长度等于index就可以了（正如上面所说，当我们使用splice再最后添加元素时，数组长度会自动加1，如上面最后一个例子，我们刚开始将数组的长度修正为4，执行splice之后数组长度自动加1后数组长度自动变为5,而这个长度5便是我们预期要的数组长度）
    // * 当我们在修改元素时，数组长度其实不需要变化的，还是arr.length
    // ## 综上所述，兼容新增与修改的情况，那么数组的长度应为：arr.length = Math.max(arr.length,index);
    arr.length = Math.max(index, arr.length);

    // 如果不是删除的情况，则吧带新增或修改的元素加入到参数数组中
    let args = remove?[index,1]:[index,1, newItem];

    arr.splice.apply(arr, args);
    return arr;
};


/**
 * 判断所给字符串是非段落标签
 * h5标签： https://html.spec.whatwg.org/multipage/indices.html#elements-3
 * 段落标签： https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
 * @type {function(*): *}
 */
export const isNonPhrasingTag = makeMap(
    'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
    'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
    'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
    'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
    'title,tr,track'
);
/**
 * 自闭标签
 * @type {function(*): *}
 */
export const isUnaryTag = makeMap(
    'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
    'link,meta,param,source,track,wbr'
);

/**
 * 可以省略闭合的标签(浏览器在解析阶段会自动将这些标签给闭合上)
 * e.g.
 * <ul>
 *     <li> 选项1
 *     <li> 选项2
 *     <li> 选项3
 *     <li> 选项4
 * </ul>
 * @type {function(*): *}
 */
export const canBeLeftOpenTag = makeMap(
    'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
);

/**
 * 转义字符对照
 * @type {{"&lt;": string, "&gt;": string, "&quot;": string, "&amp;": string, "&#10;": string, "&#9;": string, "&#39;": string}}
 */
export const decodingMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&amp;': '&',
    '&#10;': '\n',
    '&#9;': '\t',
    '&#39;': "'"
};

/**
 * 判断传入的抽象语法树节点是不是一个被禁止的标签
 * @param elem
 * @returns {boolean}
 */
export const isForbiddenTag = elem => (elem.tag==="style"||(elem.tag==="script"&&(!elem.attrsMap.type||elem.attrsMap.type==="type/javascript")));

/**
 * 将数组类型的属性列表转换为map类型，方便查找
 * e.g.
 * attrs: [{name:"v-for",value:"(item,index) in friends"},{name:":key",value:"index+'_'+item"}]
 * 转换为：
 * {"v-for": "(item,index) in friends", ":key":"index+'_'+item" }
 * @param attrs
 */
export const makeAttrsMap = attrs => {
    let map = {};
    attrs.forEach(attr=>(map[attr.name] = attr.value));
    return map;
};

/**
 * 将数组类型的属性列表转换为以属性名为key的对象
 * e.g.
 * attrs: [{name:"v-for",value:"(item,index) in friends"},{name:":key",value:"index+'_'+item"}]
 * 转换为：
 * {"v-for":{"name":"v-for","value":"(item,index) in friends"},":key":{"name":":key","value":"index+'_'+item"}}
 * @param attrs
 * @returns {*}
 */
export const makeRawAttrsMap = attrs => attrs.reduce((cur,next)=>{cur[next.name] = next; return cur;}, {});

/**
 * 判断所给抽象语法树节点上是否有绑定指定的动态属性
 * @param elem
 * @param attrName
 * @returns {boolean}
 */
export const hasDynamicAttr = (elem, attrName) => elem.attrsMap[attrName] === `:${attrName}` || elem.attrsMap[attrName] === `v-bind:${attrName}`;

/**
 * 将from对象的属性覆盖到to上
 * @param to
 * @param from
 * @returns {*}
 */
export const extend = (to, from) => {
    for(const key in from){
        to[key] = from[key];
    }
    return to;
};

/**
 * 将行间样式style转化为map对象
 * @type {function(*): *}
 */
export const parseStyleText = cached(text=>{
    let map = {};
    text.split(listDelimiter).forEach(item=>{
        if(item){
            const tmp = item.split(propertyDelimiter);
            tmp.length>1&&(map[tmp[0].trim()] = tmp[1].trim());
        }
    });

    return map;
});


const acceptValue = makeMap('input,textarea,option,select,progress');
/**
 * 判断当前标签是否必须使用prop绑定属性（不能用setAttribute()）
 * @param tag
 * @param type
 * @param attr
 * @returns {boolean|*}
 */
export const mustUseProp = (tag, type, attr) => {
    return (
        (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
        (attr === 'selected' && tag === 'option') ||
        (attr === 'checked' && tag === 'input') ||
        (attr === 'muted' && tag === 'video')
    )
};

/**
 * 一个空的只读对象
 * @type {Readonly<{}>}
 */
export const emptyObject = Object.freeze({});

/**
 * 获取当前浏览器的userAgent
 * @type {boolean|string}
 */
export const UA = inBrowser && window.navigator.userAgent.toLowerCase();
/**
 * 判断是否是IE浏览器
 * @type {boolean|string|boolean}
 */
export const isIE = UA && /msie|trident/.test(UA);

/**
 * 判断传入标签是否为纯文本标签
 * @param elem
 * @returns {boolean}
 */
export const isTextTag = elem => ["script","style"].includes(elem.tag);

/**
 * 将一个对象数组转化成对象
 * @param arr
 */
export const arrayToObject = arr => {
    let res = {};
    for(let i=0,l=arr.length;i<l;i++){
        arr[i] && (extend(res, arr[i]));
    }
    return res;
};

/**
 * vue保留属性名
 * @type {function(*): *}
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

/**
 * 将所给值转换成数字
 * @param val
 * @returns {number}
 */
export const toNumber = val => {
    let n = parseFloat(val);
    return isNaN(n)?val:n;
};

/**
 * 判断传入值是否为原始数据
 * @param value
 * @returns {boolean}
 */
export const isPrimitive =  value => {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
    )
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
    isReserved,
    sharedPropertyDefinition,
    identity,
    resolveAsset,
    dueArrItemByIndex,
    isNonPhrasingTag,
    decodingMap,
    isUnaryTag,
    canBeLeftOpenTag,
    isForbiddenTag,
    makeAttrsMap,
    extend,
    parseStyleText,
    arrayToObject,
    isReservedAttribute,
    toNumber
}