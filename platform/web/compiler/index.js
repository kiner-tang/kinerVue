// platform/web/compiler/index.js 调用编译器创建者撞见编译器，并导出编译后的结果供外部调用

import {createCompiler} from "../../../compiler/index.js";
import baseOption from './options.js';

const { compile, compileToFunctions } = createCompiler(baseOption);

export {
    compile,
    compileToFunctions
}