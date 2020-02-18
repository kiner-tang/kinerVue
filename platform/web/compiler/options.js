// platform/web/compiler/options.js 创建编译器时的一些与平台有关的基础选项
import {isPreTag, isUnaryTag, mustUseProp, canBeLeftOpenTag,isReservedTag,} from '../../../shared/utils.js'

export default {
    expectHTML: true,
    modules: [],
    isPreTag,
    isUnaryTag,
    mustUseProp,
    canBeLeftOpenTag,
    isReservedTag
};