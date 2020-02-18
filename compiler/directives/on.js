/**
 * v-on指令生成代码片段
 * @param elem
 * @param dir
 */
export default function on(elem, dir){
    // _g=bindObjectListeners
    // /**
    //  * 绑定一个事件监听对象
    //  * 对象语法 (2.4.0+)
    //  * e.g.
    //  * <div v-on="{click:clickHandler,mouseup:mouseUpHandler}"></div>
    //  * @param data
    //  * @param value
    //  * @returns {*}
    //  */
    // bindObjectListeners = (data, value) => {...}
    elem.wrapListeners = (code) => `_g(${code},${dir.value})`
};