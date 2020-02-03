import KinerVue from "../../../kinerVue.js";
import {mountComponent} from "../../../mixins/lifecycleMixin.js";
import {inBrowser} from "../../../shared/utils.js";

KinerVue.prototype.$mount = function (el) {
    return mountComponent(this,inBrowser && el ? el : undefined);
};

export default KinerVue;