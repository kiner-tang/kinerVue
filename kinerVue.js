// kinerVue.js 简易版小程序入口
import Watcher from './Observer/Watcher.js';
import Observer, {set, del} from './Observer/Observer.js'
import {createElement} from "./VDOM/createElement.js";
import {parseText} from "./compiler/parse.js";
import initMixin from "./mixins/initMixin.js";
import initEventMixin, {initEvent} from "./mixins/eventMixin.js";
import initLifecycleMixin from "./mixins/lifecycleMixin.js";
import {initRenderMixin} from "./mixins/renderMixin.js";
import {initGlobalApi} from "./globalApi.js";
import {callHook} from "./shared/utils.js";
import {initState} from "./mixins/initState.js";
import {initInjection} from "./mixins/inject.js";
import {initProvide} from "./mixins/initProvide.js";
import {initCompiler} from "./compiler/initCompiler.js";
// 预期用法
// let vue = new KinerVue({
//     data(){
//         return {
//             name: "kiner",
//             userInfo: {
//                 age: 20
//             },
//             classify:['game','reading','running']
//         }
//     }
// });


// 数据响应的原理：
// 1、依赖收集：data通过Observer编程带有getter和setter方法的响应式对象，当外界通过Watcher获取数据时，会将该Watcher加入到Dep的依赖列表中，至此，就算完成了依赖收集
// 2、通知更新：当外界对已经响应化的对象，即data中的对象进行修改时，会触发setter方法，setter会通过Dep的通知方法，循环调用Dep依赖列表中Watcher的update方法通知外界更新视图或触发用户所给的监听回调


/**
 * 自定义简易版Vue
 */
class KinerVue {

    constructor(options) {
        this.$options = options;
        this.$el = document.querySelector(options.el);
        this.$tpl = this.$el ? this.$el.outerHTML : options.template;
        this.$delimiters = ["{{","}}"];
        this.$whitespaceOption = 'condense';// preserve | condense

        initCompiler(this.$tpl,{
            whitespaceOption: this.$whitespaceOption,
            delimiters: this.$delimiters
        });

        callHook(this, 'beforeCreate');
        // 初始化
        initMixin(KinerVue);
        this._init();

        initProvide(this);
        initInjection(this);

        initState(this);
        initEvent(this);
        initEventMixin(KinerVue);
        initLifecycleMixin(KinerVue);
        initRenderMixin(KinerVue);


        let clickAFn = function (...args) {
            console.log('clickA', args);
        };
        let clickBFn = function (...args) {
            console.log('clickB', args);
        };
        let closeFn = function (...args) {
            console.log('close', args);
        };

        // test $on start
        this.$on("click", clickAFn);
        this.$on("click", clickBFn);
        this.$on("close", closeFn);
        this.$on("close", closeFn);
        // test $on end

        // test $emit start
        this.$emit(["click", "close"], "kiner");
        this.$emit("close", "kanger");
        // test $emit end

        // test $off start
        this.$off("close");
        this.$off("click", clickBFn);
        this.$emit(["click", "close"], "kiner");
        this.$emit("close", "kanger");
        // test $off end

        // test $once start
        this.$once('say', word => console.log(`say ${word}`));
        this.$emit('say', 'hello');// only this will be emit
        this.$emit('say', 'hi');// this will be ignore
        // test $once end

        console.log(this);


        // 测试编译器 start

        let obj = {
            name: 'kiner',
            age: 18
        };

        window._s = function (key) {
            // console.log('---->',key,obj[key]);
            return obj[key]
        };
        let fnStr = parseText(`hello, my name is {{name}}, I'm {{age}} years ago!`);
        // console.log(fnStr);
        console.log(eval(fnStr));

        // 测试编译器 end


        this.isVue = true;

        // test data start


        //测试$watch start
        let unWatchUserInfo = this.$watch("userInfo", (newVal, oldVal) => {
            console.log(`$watch监听到[userInfo]发生改变，新值：`, newVal, `；旧值：`, oldVal);
        }, {deep: false, immediate: true});
        this.$watch("userInfo.age", (newVal, oldVal) => {
            console.log(`$watch监听到[userInfo.age]发生改变，新值：${newVal}；旧值：${oldVal}`);
        });
        this.$watch("classify", function classifyWatcher(newVal, oldVal) {
            console.log(`$watch监听到[classify]发生改变，新值：${newVal},；旧值：${oldVal}`);
        });
        this.$watch("friends", function classifyWatcher(newVal, oldVal) {
            console.log(`$watch监听到[friends]发生改变，新值：${newVal},；旧值：${oldVal}`);
        });
        this.userInfo.age = 11;
        // 取消订阅，执行了这行代码之后$watch("userInfo",()=>{})将失效
        // unWatchUserInfo();
        this.userInfo.age = 20;

        //通过$set为数组设置值
        this.$set(this.classify, 3, '999');
        this.$set(this.userInfo, 'sex', '男');
        this.$set(this.userInfo, 'sex', '女');

        //通过$delete删除后属性
        this.$delete(this.userInfo, "sex");

        console.log('sex:', this.userInfo)


        // console.log(this.classify);
        //测试$watch end


        // new Watcher(this,"name");
        // this.name;
        // new Watcher(this,"userInfo.age");
        // this.userInfo.age;
        // new Watcher(this,"classify");
        // this.classify;
        //
        // this.name = 'kanger';
        // console.log(this.name);
        // this.userInfo.age = 18;
        // console.log(this.userInfo.age);
        //
        this.classify.push(10);
        this.classify.splice(5, 1, 11);
        this.classify.unshift(12);
        this.classify.shift();
        this.classify.sort((a, b) => a - b);
        this.classify.reverse();


        this.friends.push('zzz');
        this.friends.splice(2, 1, 'fff');
        this.friends.unshift('kkk');
        this.friends.sort((a, b) => a - b);
        this.friends.reverse();
        this.friends.shift();
        // 由于未采用ES6的元编程能力，也就是proxy和reflect,因此无法监控类似arr[0]=xxxx和arr.length=0之类的数值变化，
        // 因此，在编码时要尽量避免这些写法，以免产生一些不可意料的问题
        //
        // this.classify[2] = 'working'; //错误用法
        // console.log(this.classify);


        // test VNode start


        let child = createElement(this, undefined, undefined, [], '这是子节点');
        let node = createElement(this, 'div',
            {
                attrs: {
                    id: 'root',
                    className: 'app'
                }
            },
            [child]
        );

        console.log(`VDOM：`, node);

        // test VNode end


        // test data end
    }

    /**
     * 监听器，用于监听属性变化，并将新旧值传递回来，方便做一些拦截操作
     * @param exp       表达式或函数
     * @param cb        回调
     * @param options   配置项
     * @returns {Function}  取消观察的方法
     */
    $watch(exp, cb, options = {immediate: true, deep: false}) {
        let watcher = new Watcher(this, exp, cb, options);
        return () => {
            watcher.unWatch();
        };
    }

    /**
     * 设置属性，用来解决无法使用arr[0]=xxx,obj={} obj.name=xxx
     * @param target
     * @param key
     * @param value
     */
    $set(target, key, value) {
        return set(target, key, value);
    }

    /**
     * 删除目标对象上的数据
     * @param target
     * @param key
     * @returns {undefined}
     */
    $delete(target, key) {
        return del(target, key);
    }

}

// 挂载全局api
initGlobalApi(KinerVue);

export default KinerVue;