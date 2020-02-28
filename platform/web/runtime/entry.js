import {cached, getOuterHTML, isString, query, warn} from "../../../shared/utils.js";
import KinerVue from "./index.js";
import {compileToFunctions} from '../compiler';
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './utils/compat.js';

/**
 * 根据id获取模板信息
 * @type {function(*): *}
 */
const idToTemplage = cached(id => {
    const elem = query(id);

    return elem && elem.innerHTML;
});

// 现将原型上的原始mount暂存起来
const originalMount = KinerVue.prototype.$mount;

// 重新实现$mount,相当于一个拦截器，在执行原本的$mount之前，
// 如果发现还没有渲染函数，则根据提供的元素模板生成一个渲染函数，然后再调用原始的$mount方法
KinerVue.prototype.$mount = function (elem, hydrating=false/*跟服务端渲染有关，我们暂时不去实现其相关逻辑*/) {
    // 由于elem既可以是一个元素选择器，也可以是一个真是的dom元素，
    // 因此，拿到elem之后需要先获取一下其对应的元素节点
    elem = elem && query(elem);

    // Vue挂载元素时不允许直接挂载在html或body上面，如果是这种情况，直接警告并返回
    if(elem === document.body || elem === document.documentElement){
        warn(`请不要直接把Vue挂载在HTML标签或body标签下面，你可以挂载在一个普通的标签，如div上`);
        return this;
    }

    const options = this.$options;

    // 如果在$options中不存在渲染函数的话，那么我们应该要根据提供的模板构建一个渲染函数并挂载在$options上
    if(!options.render){
        // 如果用户明确指明了template，则优先使用template作为模板生成渲染函数
        let template = options.template;
        if(template){
            // 如果存在template,那么我们需要看一下他是一个字符串模板还是一个dom节点
            // 如果是字符串的话，再看看是不是一个id,如果是id,则根据id获取元素，并将该元素的innerHTML作为模板内容
            if(isString(template)){
                if(template.startsWith('#')){
                    template = idToTemplage(template);
                    if(!template){
                        warn(`提供的模板id：${options.template}无法获取到元素`);
                        return this;
                    }
                }
            }
            // 如果是一个dom节点，那么我们就直接获取该节点的innerHTML作为模板内容
            else if(template.nodeType){
                template = template.innerHTML
            }
            // 如果不是上述情况，则用户传入了一个非法的模板
            else{
                warn(`传入了一个非法模板:${template}`);
            }
        }
        // 若用户没有指定template的话，根据待挂载元素elem的outerHTML生成渲染函数
        else if(elem){
            template = getOuterHTML(elem);
        }

        if(template){
            // 如果存在模板则根据模板生成渲染函数
            const { render, staticRenderFns } = compileToFunctions(template,{
                shouldDecodeNewlines,/*当前环境是否需要属性中的换行符进行解码*/
                shouldDecodeNewlinesForHref,/*当前环境是否需要对a标签的href中的换行符进行解码*/
                delimiters: options.delimiters,/*插值表达式的修饰符*/
                comments: options.comments/* 是否保留模板中的注释 */
            });

            // 将渲染函数挂载到options上
            options.render = render;
            options.staticRenderFns = staticRenderFns;

        }

        // 最后，直接调用原始的mount方法进行挂载
        return originalMount.call(this, elem, hydrating);

    }

};

export default KinerVue;