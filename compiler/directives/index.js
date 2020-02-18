// compiler/directives/index.js 默认指令的归集，将内部指令统一导出
import on from './on.js';
import bind from './bind.js';
import {noop} from "../../shared/utils.js";

export default {
    on,
    bind,
    cloak: noop
}
