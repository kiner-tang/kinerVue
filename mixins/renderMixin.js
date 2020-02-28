// mixins/renderMixin.js 实现一些在渲染过程中可能用到的方法，如$nextTick
import {nextTick} from "../shared/nextTick.js";
import {createASTElement} from "../compiler/Ast.js";
import {defineReactive} from "../Observer/Observer.js";
import {emptyObject, handleError, isA} from "../shared/utils.js";
import VNode, {createEmptyVNode} from "../VDOM/VNode.js";
import {createElement} from "../VDOM/createElement.js";


export const initRender = vm => {
    vm._vnode = null;// 虚拟子树的根节点
    vm._staticTrees = null;// 标记了v-once的缓存节点树
    const options = vm.$options;
    // 父节点的占位符节点
    const parentVnode = vm.$vnode = options._parentVnode;


    // 将创建元素节点的方法绑定在当前实例上
    vm.$createElement = vm._c = (tag, data,children,textContent) => createElement(tag,data, children, textContent, false, vm);

    // 获取父组件的属性和事件监听列表，并将他们进行响应化处理
    const parentData = parentVnode && parentVnode.data;

    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject);
    defineReactive(vm, '$listeners', parentData && parentData.attrs || emptyObject);
};

// 当前正在渲染的实例
export let currentRenderingInstance = null;

export const initRenderMixin = KinerVue => {
    KinerVue.prototype.$nextTick = nextTick;

    /**
     * 渲染方法，此处调用编译器生成的渲染函数生成虚拟节点树
     * @returns {VNode}
     * @private
     */
    KinerVue.prototype._render = function () {
        const vm = this;
        // 将生成的渲染函数从options中取出来
        const {render, _parentVnode} = vm.$options;

        // 将_parentVnode设置到当前实例的$vnode上，这使得渲染函数能够访问到占位符节点上的数据
        vm.$vnode = _parentVnode;

        // 尝试开始渲染
        let vnode;

        try{
            currentRenderingInstance = vm;
            vnode = render.call(vm._renderProxy, vm.$createElement);
        }catch (e) {
            handleError(e, vm, 'render');
            // 渲染失败，将旧的vnode赋值给vnode
            vnode = vm._vnode;
        }finally {
            // 无论成功还是失败，完成了都要讲当前正在渲染的实例置为空
            currentRenderingInstance = null;
        }

        // 修正一下vnode的格式，如果vnode返回是一个只有一个元素的数组，将他的元素取出来
        if(isA(vnode) && vnode.length===1){
            vnode = vnode[0];
        }

        // 如果vnode不是VNode类的实例
        if(vnode instanceof VNode){
            vnode = createEmptyVNode();
        }

        // 设置vnoe的父级
        vnode.parent = _parentVnode;

        return vnode;

    }
};