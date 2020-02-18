import {isString, warn} from "../../shared/utils.js";

/**
 * 将动态属性绑定在目标对象上
 * @param {Object} elemAttrs     目标对象，通常是抽象语法树节点的attrs对象
 * @param {Array} values        动态属性键值数组，一般是这样的形式：[key1,value1,key2,value2]
 * @returns {*}
 */
export const bindDynamicKeys = (elemAttrs, values) => {
    let i = 0, len = values.length;
    while (i < len) {
        let key = values[i];
        if (isString(key) && key) {
            // 若key是一个非空字符串，则将动态属性绑定在目标对象上,一般是抽象语法树节点的attrs对象
            elemAttrs[key] = values[i + 1];
        } else {
            warn(`动态属性名非法，动态属性的key应该是一个非空字符串,但所提供的key是：${key}`);
        }
        // 由于传入进来的values是以key和value成对出现的数组形式传入进来的，如：
        // [key1,value1,key2,value2]
        // 因此，我们在解析的时候，都是成对的解析，所以此处使用i+=2而不是i++
        i += 2;
    }
    return elemAttrs;
};

/**
 * 将修饰符添加到目标名称的前面
 * 用于给时间名称添加运行时修饰标记
 * e.g.
 * click.capture        ==[prependModifier('!','click')]==>      !click
 * click.passive        ==[prependModifier('&','click')]==>      &click
 * click.once           ==[prependModifier('~','click')]==>      ~click
 * @param {string} modifier
 * @param {string} value
 * @returns {string}
 */
export const prependModifier = (modifier, value) => {
    return isString(modifier) ? `${modifier}${value}` : value;
};