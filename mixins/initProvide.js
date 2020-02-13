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