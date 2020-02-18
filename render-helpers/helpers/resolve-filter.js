// render-helpers/helpers/resolve-filter.js 用于从全局options中找到目标过滤器
import {identity, resolveAsset} from "../../shared/utils.js";
import KinerVue from "../../kinerVue.js";

/**
 * 获取过滤器
 * @param id
 * @returns {*|identity}
 */
export const resolveFilter = function(id) {
    return resolveAsset(KinerVue.options, 'filters', id) || identity
};