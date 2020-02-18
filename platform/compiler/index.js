import {createCompiler} from "../../compiler/index.js";
import baseOption from './options.js';

const { compile, compileToFunctions } = createCompiler(baseOption);

export {
    compile,
    compileToFunctions
}