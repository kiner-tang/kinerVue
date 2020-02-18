// platform/web/runtime/index.js 实现针对web端的$mount方法并挂在全局api,导出KinerVue，web端引用KinerVue的入口文件
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