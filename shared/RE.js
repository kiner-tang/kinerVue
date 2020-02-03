/**
 * 识别用-作为分隔符的字符串，如："my-new-component"
 * @type {RegExp}
 */
export const camelizeRE = /-(\w)/g;

/**
 * 识别驼峰形式的字符串
 * @type {RegExp}
 */
export const hyphenateRE = /\B([A-Z])/g;

/**
 * 简单类型检测
 * @type {RegExp}
 */
export const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;