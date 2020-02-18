// compiler/index.js 通过编译器创建工厂创建一个可以统一生成编译器的方法，调用创建的方法可以返回我们期待的渲染函数
import {createCompilerCreater} from "./create-compiler.js";
import {parse} from "./compile-tpl-to-ast.js";
import {optimize} from "./optimize.js";
import {generate} from "./codegen";

/**
 * 通过工厂创建可以统一生成编译器的方法
 * @type {function(*=): {compile: (function(*, *): *), compileToFunctions: *}}
 */
export const createCompiler = createCompilerCreater(function baseCompile(template, options) {
    // 根据模板与配置生成一个抽象语法树
    const ast = parse(template, options);

    // 如果配置为禁止优化器，则使用优化器对抽象语法树进行优化，将所有的静态节点标记出来
    // 在编译的时候，静态节点除了第一次需要渲染之外，其他时候都是不需要重复渲染的
    if (options.optimize !== false) {
        optimize(ast, options)
    }
    console.log('经过优化器优化过后的抽象语法树：', ast);

    // 根据抽象语法树通过代码生成器生成代码
    const code = generate(ast, options);

    console.log('代码生成器生成结果：',code);

    return {
        ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
    }
});