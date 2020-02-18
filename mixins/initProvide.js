// mixins/initProvide.js 初始化依赖提供者provide，实际上只需要将依赖提供者挂载到KinerVue实例上的_provide上即可，
// 剩下的就交给inject自己去获取了
import {isFn} from "../shared/utils.js";

/**
 * 初始化provide
 * @param vm
 * @returns {*}
 */
export const initProvide = vm => {
    const provide = vm.$options.provide;
    // 只需将配置的provide挂载到_provide中即可
    if(provide){
        return (vm._provide = isFn(provide)?provide.call(vm):provide);
    }
};