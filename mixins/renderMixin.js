// mixins/renderMixin.js 实现一些在渲染过程中可能用到的方法，如$nextTick
import {nextTick} from "../shared/nextTick.js";

export const initRenderMixin = KinerVue => {
    KinerVue.prototype.$nextTick = nextTick;
};