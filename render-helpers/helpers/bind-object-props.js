import {
    arrayToObject,
    camelize,
    hyphenate,
    isA,
    isObject,
    isReservedAttribute,
    mustUseProp,
    warn
} from "../../shared/utils.js";

/**
 * v-bind绑定一个对象属性
 * @param data          目标对象
 * @param tag       虚拟节点的标签名
 * @param value         属性值
 * @param asProp        是否强制定义为prop
 * @param isSync        是否同步（v-on中使用）
 * @returns {*}
 */
export const bindObjectPorps = (data, tag, value, asProp, isSync) => {
    if(value){
        if(!isObject(value)){
            warn(`只能设置一个对象或者是数组类型的值，当前提供的值类型：${typeof value}`);
        }else{

            // 如果传入的是一个数组类型的值，先将他转换证对象，方便统一处理
            if(isA(value)){
                value = arrayToObject(value);
            }

            // 由于不同的属性可能需要加入到不同的地方
            // 比如class、style以及vue中保留的属性名称我们希望把它直接加到目标节点上
            // 再比如有些必须使用prop定义的属性我们需要把它定义在目标节点的domProps属性上
            // 如果不是上述情况则把舒缓型定义在目标节点的attrs上

            // 最终将属性定义在target上面
            let target;

            // 遍历所有的属性，判断是上述哪一个类型，从而决定要将谁指向target
            for(let key in value){
                if(
                    key === "style" ||
                    key === "class" ||
                    isReservedAttribute(key)
                ){
                    target = data;
                }else{
                    // 尝试获取目标的type属性，需要根据type属性判断当前属性是否必须强制使用prop
                    const type = data.attrs && data.attrs.type;

                    target = (asProp || mustUseProp(tag, type, key))?
                        (data.domProps || (data.domProps = {})):
                        (data.attrs || (data.attrs = {}));

                    // 将key规格化
                    const camelizeKey = camelize(key); // e.g. myName
                    const hyphenateKey = hyphenate(key);// e.g. my-name

                    // 如果规格化后的两种属性键表示形式都没办法在目标对象中找到对应的值，那么我们就添加这个属性
                    if(!(camelizeKey in target) && !(hyphenateKey in target)){
                        target[key] = value[key];

                        // 如果指定为同步操作，我们还需要在on对象上加入一个更新指令
                        if(isSync){
                            const on = (data.on || (data.on = {}));
                            on[`update:${key}`] = function ($event) {
                                value[key] = $event
                            };
                        }
                    }
                }
            }

        }

    }
    return data;
};