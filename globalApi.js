// globalApi.js 将全局api如extent、set、del、filter、directive、component、use、mixin等挂载到KinerVue上
import {isFn, isPlainObject, mergeOptions, proxy} from "./shared/utils.js";
import {ASSET_TYPES} from "./shared/constants.js";
import {set, del} from "./Observer/Observer.js";

/**
 * 将全局api如extent、set、del、filter、directive、component、use、mixin等挂载到KinerVue上
 * @param KinerVue
 */
export const initGlobalApi = KinerVue => {
    let cid = 1;

    /**
     * 创建options用于存储指令等信息
     * @type {any}
     */
    KinerVue.options = Object.create(null);


    /**
     * 生成一个新的构造函数继承Vue的属性和方法
     * @param extendOptions
     * @returns {*}
     */
    KinerVue.extend = function (extendOptions={}) {
        const Super = this;
        const SuperId = Super.cid;

        // 获取缓存的构造函数
        const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});

        // 若能找到缓存的构造函数，则直接返回
        if(cachedCtors[SuperId]){
            return cachedCtors[SuperId];
        }

        // 创建一个新的构造函数
        let Sub = function VueComponent(options={}){
            this._init(mergeOptions(extendOptions,Super.options ,options));
        };

        // 继承Vue的原型链
        Sub.prototype = Object.create(Super.prototype);
        // 修正构造函数
        Sub.constructor = Sub;

        // 设置唯一id
        Sub.cid = cid++;

        // 将父级选项与自己的选项合并设置为自己的选项
        Sub.options = mergeOptions(Super.options, extendOptions);

        // 记录父类
        Sub['super'] = Super;

        // 如果选项中有属性，则初始化属性
        if(Sub.options.props){
            initProps(Sub);
        }

        // 如果选项中存在计算属性，则对计算属性进行初始化
        if(Sub.options.computed){
            initComputed(Sub);
        }

        // 将父类的一些属性和方法复制到子类中
        Sub.extend = Super.extend;
        Sub.mixin = Super.mixin;
        Sub.use = Super.use;

        //复制component、directive、filter
        ASSET_TYPES.forEach(type=>(Sub[type] = Super[type]));

        // 保存父类和子类的配置项
        Sub.superOptions = Super.options;
        Sub.extendOptions = extendOptions;
        Sub.sealedOptions = mergeOptions({}, Super.options);



        // 将构造函数缓存取来，如果重复执行extend,则直接返回缓存的构造函数
        cachedCtors[SuperId] = Sub;

        return Sub;
    };
    /**
     * 用于动态设置属性（通过此方法设置的属性会被响应化）
     * @type {set}
     */
    KinerVue.set = set;
    /**
     * 用于动态删除属性（通过此方法删除的属性会把监视器也一起删除掉）
     * @type {del}
     */
    KinerVue.del = del;

    /**
     * 注册或获取全局指令、过滤器和组件
     */
    ASSET_TYPES.forEach(type => {
        let key = `${type}s`;
        // 用于存储指令集
        KinerVue.options[key] = {};
        KinerVue[type] = function (id, fn) {
            if(!fn){
                return KinerVue.options[key][id];
            }else{
                if(type==="component"){
                    if(isPlainObject(fn)){
                        fn.name = fn.name || id;
                        fn = KinerVue.extend(fn);
                    }
                }else if(type==="directive"&&isFn(fn)){
                    fn = {bind: fn, update: fn};
                }
                KinerVue.options[key][id] = fn;
                return fn;
            }
        }
    });

    /**
     * 向KinerVue中安装插件
     * @param plugin
     * @param rest
     * @returns {KinerVue}
     */
    KinerVue.use = function (plugin,...rest) {
      //  获取已安装插件列表，若不存在则新建
      const installedPlugins = this._installedPlugins || (this._installedPlugins = []);
      // 若待安装插件已经安装过，则直接返回，无需重复安装
      if(installedPlugins.includes(plugin)){
          return this;
      }

      // 在剩余参数化的最前面加上当前的kinerVue实例，使得安装插件时的第一个参数始终是这个实例对象
      rest.unshift(this);

      // 若给出plugin是对象且有install方法，则执行plugin.install方法进行安装
      if(isFn(plugin.install)){
          plugin.install.apply(plugin,rest);
      }else if(isFn(plugin)){
          // 若plugin本身就是一个方法，则直接执行plugin进行安装
          plugin.apply(null,rest);
      }
      // 将插件加入到已安装插件列表中缓存
      installedPlugins.push(plugin);
      return this;
    };


    /**
     * 全局混入方法，会影响到在调用此方法之后的所有实例
     * @param mixin
     * @returns {KinerVue}
     */
    KinerVue.mixin = function (mixin) {
        this.options = mergeOptions(this.options, mixin);
        return this;
    };

    /**
     * 初始化属性
     * @param Comp
     */
    function initProps(Comp){
        const props = Comp.options.props;
        const keys = Object.keys(props);
        keys.forEach(key=>proxy(Comp, '_props', key));

    }

    /**
     * 初始化计算属性
     * @param Comp
     */
    function initComputed(Comp) {
        const computed = Comp.options.computed;

        for(let key of computed){
            // TODO 暂未实现
            defineComputed(Comp.prototype, key, computed[key]);
        }
    }
};