// compiler/codegen/event.js 此文件用于处理事件代码片段生成的相关逻辑，由于事件处理代码片段的生成相对复杂，因此单独拆分出来一个文件
import {isA} from "../../shared/utils.js";
import {fnExpRE, fnInvokeRE, simplePathRE} from "../../shared/RE.js";

/**
 * 用于批量生成事件处理函数的代码片段
 * @param events
 * @param isNative
 * @returns {string}
 */
export const genHandlers = (events, isNative) => {
    const prefix = isNative ? 'nativeOn:' : 'on:';

    // 需要区分是静态的还是动态的
    let staticHandlers = '';
    let dynamicHandlers = '';

    for (const name in events) {
        const event = events[name];
        // 构建事件代码片段
        const handleCode = genHandler(event);
        // 根据是否是动态事件名生成不同的代码片段
        if(event && event.dynamic){
            dynamicHandlers = `${name},${handleCode},`;
        }else{
            staticHandlers = `"${name}":${handleCode},`;
        }
    }
    // 将静态事件代码片段构建成json格式的片段
    staticHandlers = `{${staticHandlers.slice(0,-1)}}`;
    // 最后，如果存在动态事件名，则交由_d辅助函数解析动态事件,将动态事件解析后合并到静态事件中去，如果不存在动态事件，则直接返回静态事件
    if(dynamicHandlers){
        return `${prefix}_d(${staticHandlers}, [${dynamicHandlers}])`;
    }else{
        return prefix+staticHandlers;
    }
};

/**
 * 生成单个事件处理函数的代码片段
 * @param handler
 * @returns {*}
 */
export const genHandler = handler => {
    // 如果事件不存在，则返回一个空函数代码
    if (!handler) {
        return 'function(){}';
    }
    // 如果传入的是一个事件数组，则循环并递归处理每一个元素,并将结果拼接成数组代码形式返回
    if (isA(handler)) {
        // 可能有些人会疑问，为什么在map循环体里面需要对结果进行join(',')，而map生成的新数组又不用呢
        // 首先，循环体里面调用genHandler返回的结果是一个函数字符串，我们需要用,将每一个字符串分开
        // 当然，map生成的数组其实也需要用逗号将每个数组元素分开，但因为数组本身的toString方法便是将如：
        // [1,2,3,4].toString() => 1,2,3,4 这样的字符串，而字符串与数组的拼接又会触发数组的toString方法
        // 因此，以下代码实际返回的是类似这样的字符串:`['function($events){...}','function($events){...}']`
        return `[${handler.map(h => genHandler(h).join(','))}]`
    }

    // 如果不是数组，判断传入对象的值的类型
    //
    // 判断是否是一个合法的函数路径
    // simplePathRE 主要解析的是如下这些情况：
    // handler
    // obj.handler
    // obj["handler"]
    // obj["handler"].handler
    // obj[handler["handler"]]
    const isMethodPath = simplePathRE.test(handler.value);

    // 看一下是否是函数表达式
    // fnExpRE 主要解析如下情况：
    // function(
    // (function(){
    // function(arg
    // ()=>
    // arg=>
    const isFunctionExpression = fnExpRE.test(handler.value);

    // 判断是否是函数的调用
    // fnInvokeRE主要解析以下情况：
    // 主要解析如下情况：
    // ();
    // (arg);
    const isFunctionInvocation = fnInvokeRE.test(handler.value);

    // 根据有没有修饰符还需要分成两种情况
    if (!handler.modifiers) {
        // 如果没有修饰符，并且value是一个合法的函数路径或者是函数表达式的话，直接返回value
        if (isMethodPath || isFunctionExpression) {
            return handler.value;
        }
        // 如果发现是函数调用，则返回一个包装函数进行内联声明
        return `function($event){${
            isFunctionInvocation ? `return ${handler.value}` : handler.value
            }}`;
    } else {
        // 如果存在修饰符，那么需要循环解析一下修饰符
        let code = '';
        let genModifierCode = '';
        const keys = [];// 用于暂存一些需要特殊处理（过滤）的键盘按键的别名
        for (const key in handler.modifiers) {
            if (modifierCode[key]) {// 如果在修饰符映射表中有找到key对应的修饰符，那么就将其代码片段取出来
                // 根据修饰符的名称获取响应的代码片段
                genModifierCode += modifierCode[key];

                // 如果是left键或right键的话
                if (keyCodes[key]) {
                    // left和right需要过滤，因为如果绑定了left或right的的话，如果我们触发了鼠标事件，我们只监听指定按键的事件，而不关心未指定的
                    keys.push(key);
                }
            } else if (key === "exact") {
                // 2.5.0新增
                // .exact 修饰符允许你控制由精确的系统修饰符组合触发的事件。
                // <!-- 即使 Alt 或 Shift 被一同按下时也会触发 -->
                // <button @click.ctrl="onClick">A</button>
                //
                // <!-- 有且只有 Ctrl 被按下的时候才触发 -->
                // <button @click.ctrl.exact="onCtrlClick">A</button>
                //
                // <!-- 没有任何系统修饰符被按下的时候才触发 -->
                // <button @click.exact="onClick">A</button>
                const modifier = handler.modifiers;
                let specialKey = ['ctrl', 'shift', 'alt', 'meta'];// 待处理系统修饰符
                // e.g.
                // 设modifier=[ctrl: handler1, shift: handler2]
                // 那么通过下面的逻辑生成的代码片段就是:
                // $event.ctrlKey||$event.shiftKey
                genModifierCode += genGuard(
                    specialKey.filter(key => !modifier[key]) // 过滤掉用户未指定的修饰符
                        .map(key => `$event.${key}Key`) // 根据修饰符生成获取系统修饰符的代码片段
                        .join("||")// 最后，将这几个修饰符的代码片段用或语句||连接起来，也就是说，几个修饰符中任意一个触发了都能接收到通知
                );
            } else {
                // 如果不是上述情况，说明用户绑定的按键不在我们需要特殊处理的范畴，先把他存起来，待会再统一处理
                keys.push(key);
            }
        }

        // 循环完毕，看一下我们有没有暂存的未处理的修饰符
        if (keys.length) {
            code += genKeyFilter(keys);
        }

        // 我们需要确保prevent和stop之类的修饰符的代码生成在建码过滤逻辑之后执行，不然没办法实现键码过滤逻辑
        if (genModifierCode) {
            code += genModifierCode;
        }

        // 准备拼接代码
        const handleCode = isMethodPath ?
            `return ${handler.value}($event);` :
            isFunctionExpression ?
                `return (${handler.value})($event);`
                : isFunctionInvocation ?
                `return ${handler.value}` :
                handler.value;

        // 返回一个包装函数
        return `function($event){${code}${handleCode}}`
    }
};

/**
 * 过滤掉那些不是键盘按键以及检测目标键名或键值是否在内置键名或键值以及自定义键值中不存在
 * @param keys
 * @returns {string}
 */
export const genKeyFilter = keys => (
    `if(!$event.type.indexOf('key')&&${
        keys.map(genFilterCode).join('&&')
        }) return null;`
);

/**
 * 过滤掉非法的按键
 * @param key
 * @returns {string}
 */
export const genFilterCode = key => {
    // 先将按键转换为10进制证树，如果是数字按键的话，直接返回相关代码片段
    // 0~9的keycode是48~57
    // 如果不是数字键就会返回NaN
    const keyVal = parseInt(key, 10);
    if (keyVal) {
        return `$event.keyCode!==${keyVal}`;
    }

    // 如果不是数字键的话，再看看目标键的键名和建码是否是否在内置的一些键名和建码
    const keyCode = keyCodes[key];
    const keyName = keyNames[key];

    // 调用_k = checkKeyCodes
    // /**
    //  * 检查传入值是否合法
    //  * 用于检测目标键名或键值是否在内置键名或键值以及自定义键值中不存在
    //  * @param eventKeyCode          目标事件的keycode
    //  * @param key                   目标事件的key
    //  * @param builtInKeyCode        内置事件的建码表
    //  * @param eventKeyName          目标事件的事件名
    //  * @param builtInKeyName        内置事件的键名表
    //  * @returns {boolean}
    //  */
    // export const checkKeyCodes = (eventKeyCode, key, builtInKeyCode, eventKeyName, builtInKeyName) => {...}
    return `_k($event.keyCode, ${JSON.stringify(key)}, ${JSON.stringify(keyCode)}, $event.key, ${JSON.stringify(keyName)})`;
};

/**
 * 给常用的键盘按键建码的一个别名
 * @type {{esc: number, tab: number, enter: number, space: number, up: number, left: number, right: number, down: number, delete: number[]}}
 */
export const keyCodes = {
    esc: 27,
    tab: 9,
    enter: 13,
    space: 32,
    up: 38,
    left: 37,
    right: 39,
    down: 40,
    'delete': [8, 46]
};

// 键盘按键事件key的别名
export const keyNames = {
    // #7880: IE11 and Edge use `Esc` for Escape key name.
    esc: ['Esc', 'Escape'],
    tab: 'Tab',
    enter: 'Enter',
    // #9112: IE11 uses `Spacebar` for Space key name.
    space: [' ', 'Spacebar'],
    // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
    up: ['Up', 'ArrowUp'],
    left: ['Left', 'ArrowLeft'],
    right: ['Right', 'ArrowRight'],
    down: ['Down', 'ArrowDown'],
    // #9112: IE11 uses `Del` for Delete key name.
    'delete': ['Backspace', 'Delete', 'Del']
};


/**
 * 根据条件判断是否要返回null
 * 在使用.once修饰符时，需要显式得返回一个null，方便决定是否要删除监听
 * @param condition
 * @returns {string}
 */
export const genGuard = condition => `if(${condition})return null;`;

/**
 * 修饰符映射
 * @type {{stop: string, prevent: string, self: *, ctrl: *, shift: *, alt: *, meta: *, left: *, middle: *, right: *}}
 */
export const modifierCode = {
    stop: '$event.stopPropagation();',
    prevent: '$event.preventDefault();',
    self: genGuard(`$event.target !== $event.currentTarget`),
    ctrl: genGuard(`!$event.ctrlKey`),
    shift: genGuard(`!$event.shiftKey`),
    alt: genGuard(`!$event.altKey`),
    meta: genGuard(`!$event.metaKey`),
    left: genGuard(`'button' in $event && $event.button !== 0`),
    middle: genGuard(`'button' in $event && $event.button !== 1`),
    right: genGuard(`'button' in $event && $event.button !== 2`)
};
