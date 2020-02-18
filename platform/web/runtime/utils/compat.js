// platform/web/runtime/utils/compat.js 判断目标环境，对一些有差异的浏览器操作进行一些兼容性处理和判断
import {inBrowser} from "../../../../shared/utils.js";

let div;

function shouldDecode(isHref){
    div = div || document.createElement('div');
    div.innerHTML = isHref? `<a href="\n"/>`:`<div a="\n"/>`;
    return div.innerHTML.indexOf('&#10;')>0;
}

/**
 * 在IE浏览器中，会把属性值进行一次编译
 * @type {boolean}
 */
export const shouldDecodeNewlines = inBrowser?shouldDecode(false):false;
/**
 * 在chrome中，会将a的href进行一次编译
 * @type {boolean}
 */
export const shouldDecodeNewlinesForHref = inBrowser?shouldDecode(true):false;

