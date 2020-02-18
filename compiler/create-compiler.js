// compiler/create-compiler.js 本文件是用来构建编译器创建方法的工厂，可以根据提供的基础编译器返回一个能够生成优化过的编译器和能够直接生成渲染函数的编译器
import {extend} from "../shared/utils.js";
import {createCompileToFunctionFn} from "./to-function.js";

/**
 * 创建编译器方法的工厂
 * @param baseCompile   基础编译器
 * @returns {function(*=): {compile: (function(*, *): *), compileToFunctions: *}}
 */
export const createCompilerCreater = baseCompile => {
    return function createCompiler(compileOptions){
        function compile(template, options){
            // 最终的配置项
            const finalOption = Object.create(compileOptions);
            // 错误栈
            const errors = [];

            // 如果编译配置中有需要合并到最终编译配置的模块的话，将他们合并过来
            finalOption.modules =
                (compileOptions.modules || []).concat(options.modules);

            // 将自定义指令合并过来
            finalOption.directives = extend(
                Object.create(compileOptions.directives || null),
                options.directives
            );

            // 除了模块与指令外的其他配置项也搞过来
            for(const key in options){
                (key !== "modules" && key !== "directives") &&  (finalOption[key] = options[key]);
            }

            // 编译
            const compiled = baseCompile(template.trim(), finalOption);
            compiled.errors = errors;

            return compiled;
        }
        return {
            compile, // 处理过的编译器
            compileToFunctions: createCompileToFunctionFn(compile)// 生成渲染函数
        }
    }
};