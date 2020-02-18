// compiler/to-function.js 提供了将我们代码生成器的代码转换为渲染函数的方法

import {extend, noop, warn} from "../shared/utils.js";


/**
 * 根据代码片段生成一个渲染函数
 * @param code      代码片段
 * @param errors    在创建渲染函数期间如果有报错则加入到目标错误数组中收集起来
 * @returns {*}
 */
export const createFunction = (code, errors) => {
    try {
        return new Function(code);
    } catch (err) {
        errors.push({err, code});
        return noop;
    }
};
/**
 * 创建一个根据编译器生成渲染函数的函数
 * 此函数为高阶函数，他将会返回一个根据模板和配置项生成渲染函数的函数
 * @param compile   编译器
 */
export const createCompileToFunctionFn = (compile) => {
    // 创建一个缓存对象
    const cache = Object.create(null);
    return function (template, options, vm) {
        // 将options拷贝出来，以免修改时影响原始数据
        options = extend({}, options);

        // 先尝试一下看看当前环境是否支持将代码片段渲染成渲染函数
        // 在一些安全策略比较高的浏览器里面，可能被禁止
        // Function 构造函数创建一个新的 Function 对象。直接调用此构造函数可用动态创建函数，
        // 但会遭遇来自 eval 的安全问题和相对较小的性能问题。
        // 然而，与 eval 不同的是，Function 构造函数只在全局作用域中运行。
        // Function 构造函数创建一个新的 Function 对象。直接调用此构造函数可用动态创建函数，但会遭遇来自 eval 的安全问题和相对较小的性能问题。
        // 然而，与 eval 不同的是，Function 构造函数只在全局作用域中运行。
        try {
            new Function('return 1')
        } catch (e) {
            if (e.toString().match(/unsafe-eval|CSP/)) {
                warn(`您当前的环境安全策略过高，将模板编译需要使用eval执行脚本，但eval被禁止了，尝试调低浏览器的安全级别试试`);
            }
        }
        // 在vue源码中，如果定义了分隔符，如["{{","}}"]，那么他会把这个分隔符传唤成字符串跟模板拼接起来作为缓存的key
        // 若为定义分隔符则使用模板字符串作为key
        const cacheKey = options.delimiters ? String(options.delimiters) + template : template;

        // 如果在缓存中能够找到这个渲染函数，那我们直接返回，无需重复生成
        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        // 使用传递过来的编译器生成抽象语法树
        const compiled = compile(template, options);

        // 查看一下编译是否出现问题
        if (compiled.errors && compiled.errors.length) {
            warn(`编译模板${template}报错：` + compiled.errors.map(e => `- ${e}`).join('\n') + '\n');
        }

        // 准备生成渲染函数
        const res = {};
        const errors = [];
        res.render = createFunction(compiled.render, errors);
        res.staticRenderFns = compiled.staticRenderFns.map(code => createFunction(code, errors));

        // 如果在生成渲染函数过程中报错，则警告提示
        if ((!compiled.errors || !compiled.errors.length) && errors.length) {
            warn(`生成渲染函数过程中出现异常：` + errors.map(({err, code}) => `${err.toString()} in\n\n${code}\n`).join('\n'));
        }

        // 将渲染函数对象加入到缓存并返回
        return (cache[cacheKey] = res);

    };
};