import KinerVue from "../../../kinerVue.js";
import {mountComponent} from "../../../mixins/lifecycleMixin.js";
import {inBrowser} from "../../../shared/utils.js";
import {initGlobalApi} from "../../../globalApi.js";

KinerVue.prototype.$mount = function (el) {
    return mountComponent(this,inBrowser && el ? el : undefined);
};


// 挂载全局api
initGlobalApi(KinerVue);

export default KinerVue;