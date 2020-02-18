// render-helpers/helpers/check-keycodes.js 运行时的_k方法，用于检测目标键名或键值是否在内置键名或键值以及自定义键值中不存在
import {isA} from "../../shared/utils.js";
import config from "../../config.js";

/**
 * 所给键值是否与预期键值不匹配
 * @param expect
 * @param key
 * @returns {boolean}
 */
function isNotMatchKey(expect, key) {
    return isA(expect) ? expect.indexOf(key) < 0 : expect !== key;
}

/**
 * 检查传入值是否合法
 * 用于检测目标键名或键值是否在内置键名或键值以及自定义键值中不存在
 * @param eventKeyCode          目标事件的keycode
 * @param key                   目标事件的key
 * @param builtInKeyCode        内置事件的建码表
 * @param eventKeyName          目标事件的事件名
 * @param builtInKeyName        内置事件的键名表
 * @returns {boolean}
 */
export const checkKeyCodes = (eventKeyCode, key, builtInKeyCode, eventKeyName, builtInKeyName) => {
    const keycodes = config.keyCodes[key] || builtInKeyCode;
    // 如果在keyCodes中找不到对应的key并且有传builtInKeyName和 eventKeyName，
    // 则在用户传递过来的内置键名列表中看看能不能找到当前事件的键名
    if(builtInKeyName && eventKeyName && !config.keyCodes[key]){
        return isNotMatchKey(builtInKeyName, eventKeyName);
    }else if(keycodes){// 如果在keyCodes中找到了指定key或者是有传递待选内置键值列表的haul，那么就在其中查找看是否有重复的
        return isNotMatchKey(keycodes, key);
    }else if(eventKeyName){// 如果仅仅只是传了一个键名过来，那就只需要看一下键名与传过来的key
        return eventKeyName !== key;
    }
};