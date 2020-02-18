// mixins/inject.js 初始化注入的依赖的收集逻辑
import {defineReactive, toggleObserve} from "../Observer/Observer.js";
import {hasSymbol, isFn, warn} from "../shared/utils.js";

/**
 * 初始化依赖接收者
 * @param vm
 */
export const initInjection = (vm) => {
    // 收集依赖
    const result = resolveInject(vm.$options.inject, vm);

    if(result){
        // 由于依赖属性不需要转化为响应式属性，因此在定义依赖属性是，需要暂时将数据相应的开关关掉，当定义结束后再打开
        toggleObserve(false);
        //循环定义所有依赖到vue实例上
        Object.keys(result).forEach(key=>defineReactive(vm, key, result[key]));
        toggleObserve(true);

    }
};
/**
 * 收集依赖
 * @param inject
 * @param vm
 * @returns {any}
 */
export const resolveInject = (inject, vm) => {
    if(inject){
        const result = Object.create(null);

        // 由于inject和provide的key可以是Symbol,因此，需根据当前运行环境是否支持Symbol进行不同的处理
        const keys = hasSymbol ? Reflect.ownKeys(inject).filter(key=>{
            return Object.getOwnPropertyDescriptor(inject, key).enumerable;
        }): Object.keys(inject);

        // 循环每一个属性名，并不断往上（父级）查找知道找到对应的provide为止
        keys.forEach(key=>{
            // 由于在inject中可以通过from明确指定从provide中的哪个属性获取依赖，因此需要将from提取出来用于判断是否找到目标依赖
            // e.g.
            // inject:{from: 'userInfo', default: 'kiner'}
            //
            let provideKey = inject[key].from;

            let target = vm;

            while (target){
                // 如果在当前实例的存在_provided并且存在provideKey的值锁对应的属性，说明找到了目标依赖，将依赖添加到结果列表，退出当前循环
                // _provided对象是当使用provide为子组件注入依赖时会创建并将依赖注入到这个对象当中，具体详见provide的实现
                if(target._provided && provideKey in target._provided){
                    result[key] = target._provided[provideKey];
                    break;
                }
                // 若在当前实例上没找到_provided或者是当前实例的_provided中没有找到指定依赖，则继续在当前实例的父级上查找，知道找到依赖或者到达根节点为止
                target = target.$parent;
            }

            // 在vue中，inject还支持默认值，因此，当循环结束时，如果target不存在，说明已经找到了根节点还没有找到依赖，这时，如果设置了默认值，则使用默认值
            // 若没有提供默认值，则警告提示用户
            if(!target){
                const provideDefault = inject[key].from;
                if(provideDefault){
                    result[key] = isFn(provideDefault)?provideDefault.call(vm):provideDefault;
                }else{
                    warn(`inject找不到${key}的依赖，请检查是否使用provide注入依赖`);
                }
            }
        });


        return result;
    }
};