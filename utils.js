// utils.js 基础工具库,提供一些工具方法

/**
 * 判断对象是否支持__proto__属性
 * @type {boolean}
 */
export const hasProto = '__proto__' in {};
/**
 * 判断传递过来的对象是否是纯对象
 * @param obj
 * @returns {boolean}
 */
export const isPlainObject =  function(obj){
    let prototype;

    return Object.prototype.toString.call(obj) === '[object Object]'
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


export default {
    hasProto,
    isPlainObject,
    isObject,
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
    isA
}