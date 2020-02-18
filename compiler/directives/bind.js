// compiler/directives/bind.js 将v-bind指令生成代码片段
/**
 * 用于将v-bind生成代码片段
 * @param elem  目标元素
 * @param dir   指令
 */
export default function bind(elem, dir) {
    // _b=bindObjectPorps v-bind绑定一个对象属性
    ///**
    //  * v-bind绑定一个对象属性
    //  * @param data          目标对象
    //  * @param tag       虚拟节点的标签名
    //  * @param value         属性值
    //  * @param asProp        是否强制定义为prop
    //  * @param isSync        是否同步（v-on中使用）
    //  * @returns {*}
    //  */
    // bindObjectPorps(data, tag, value, asProp, isSync) => {...}
    elem.wrapData = code => {
        return `_b(${code},'${elem.tag}',${dir.value},
        ${dir.modifiers && dir.modifiers.prop ? 'true' : 'false'}
        ${dir.modifiers && dir.modifiers.sync ? ',true' : ''})`;
    };
};