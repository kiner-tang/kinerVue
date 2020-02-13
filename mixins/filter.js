import {identity, resolveAsset} from "../shared/utils.js";

/**
 * 获取过滤器
 * @param vm
 * @param id
 * @returns {*|identity}
 */
export const resolveFilter = (vm, id) => resolveAsset(vm.$options, 'filters', id) || identity;