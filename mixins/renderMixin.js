import {nextTick} from "../shared/nextTick.js";

export const initRenderMixin = KinerVue => {
    KinerVue.prototype.$nextTick = nextTick;
};