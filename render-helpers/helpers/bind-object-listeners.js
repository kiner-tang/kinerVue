// render-helpers/helpers/bind-object-listeners.js 运行时使用的_g方法，用于绑定一个事件监听对象
import {isPlainObject, warn} from "../../shared/utils.js";

/**
 * 绑定一个事件监听对象
 * 对象语法 (2.4.0+)
 * e.g.
 * <div v-on="{click:clickHandler,mouseup:mouseUpHandler}"></div>
 * @param data
 * @param value
 * @returns {*}
 */
export const bindObjectListeners = (data, value) => {
    if (value) {
        // 由于v-on不带参数的的绑定方式必须传入一个普通对象，因此，如果不是普通对象，则警告提示
        if (!isPlainObject(value)) {
            warn(`v-on不带参数的的绑定方式必须传入一个普通对象，当前传入的类型为：${typeof value}`);
        }else{
            // 将目标对象中存在on对象，则拷贝一份，否则初始化一个空对象并赋值给data.on
            const on = data.on = data.on ? {...data.on} : {};

            // 以新传入值value作为基准循环on中每一个key
            for (let key in value) {
                const oldOn = on[key];
                const newOn = value[key];
                // 1、若在旧的事件列表中可以找到对应key值的事件，说明目前需要将新的事件加入到就列表中
                // 2、若不存在，则说明这是一个新增加的事件，那么我们直接添加
                on[key] = oldOn ? [...oldOn, ...newOn] : newOn;
            }
        }

    }
    return data;
};