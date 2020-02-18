/**
 * VDOM/VNode.js
 * VNode其实就是虚拟节点，他是一个用来描述如何创建dom节点的描述对象，其实就是一个简单的javascript对象，
 * 只是我们都是通过VNode创建一个虚拟节点，从而得到用来创建dom节点的描述信息，然后根据这些描述信息便可创建一个dom节点。
 */
class VNode {
    /**
     * 构造函数
     * @param tag                        标签名称
     * @param data                       数据对象
     * @param children                   子节点
     * @param text                       文本节点
     * @param elem                       元素节点
     * @param context                    上下文
     * @param componentOptions           组件节点的配置
     * @param comment                    是否注释
     * @param isCloned                   是否是克隆节点
     * @param functionalContext          函数式组件的实例
     * @param functionalOptions          函数式组件的配置
     */
    constructor({tag,data,children,text,elem,context,componentOptions,comment=false,isCloned=false, functionalContext, functionalOptions}){
        this.tag = tag;
        this.data = data;
        this.children = children;
        this.text = text;
        this.elem = elem;
        this.context = context;
        this.componentInstance = undefined;
        this.componentOptions = componentOptions;
        this.isComment = comment;
        this.isCloned = isCloned;
        this.functionalContext = functionalContext;
        this.functionalOptions = functionalOptions;
        this.isStatic = false;//是否静态节点，如：<p>这是一个静态节点，因为无论状态如何改变，他都不会变化</p>
    }

    /**
     * 获取子节点
     * @returns {*}
     */
    get child(){
        return this.componentInstance
    }
}

/**
 * 创建一个注释节点
 * 通过此节点最终创建出来的dom节点如：
 * 调用：createEmptyVNode('注释节点')
 * 输出：<!-- 注释节点 -->
 * @param content       注释节点的文本内容
 * @returns {VNode}
 */
export const createEmptyVNode = content => new VNode({text: content, comment: true});

/**
 * 创建一个文本节点
 * 通过此节点最终创建出来的dom节点如：
 * 调用：createTextVNode('文本节点')
 * 输出：文本节点
 * @param content
 * @returns {VNode}
 */
export const createTextVNode = content => new VNode({text: String(content)});

/**
 * 创建一个元素节点
 * 通过此节点最终创建出来的dom节点如：
 * 调用：createElemVNode('p',{className:"tips",style:"color: red;"},[createEmptyVNode('这个操作很6呀'),createTextVNode('只是一个温馨提示')])
 * 输出：<p class="tips" style="color: red;"><!-- 这个操作很6呀 -->只是一个温馨提示</p>
 * @param tag           所创建的dom节点的标签名，如要创建div标签，则tag为 div
 * @param data          节点所包含的数据对象，包括大不限于节点的属性attrs、类名class、行间样式style等
 * @param children      该节点的子节点列表，是一个VNode数组
 * @param context       当前节点在Vue中的实例
 * @returns {VNode}
 */
export const createElemVNode = (tag,data,children,context) => new VNode({tag,data,children,context});

/**
 * 创建一个克隆节点（与被克隆节点唯一的区别就是多了一个isCloned属性用于标记改节点是克隆过来的）
 * @param vnode
 * @returns {VNode}
 */
export const createCloneVNode = (vnode) => new VNode({tag: vnode.tag,data: vnode.data,children: vnode.children && vnode.children.slice(),text: vnode.text,elem: vnode.elem,context: vnode.context,componentOptions: vnode.componentOptions,comment: vnode.comment, isCloned: true});

/**
 * 创建组件节点
 * @param data                  节点所包含的数据对象，包括大不限于节点的属性attrs、类名class、行间样式style等
 * @param children              该节点的子节点列表，是一个VNode数组
 * @param context               当前节点在Vue中的实例
 * @param componentOptions      组件节点的参数选项其中包含了组件的属性props等信息
 * @param componentInstance     当前组件的实例对象
 * @returns {VNode}
 */
export const createComponentVNode = (data,children,context, componentOptions, componentInstance) => {
    let vnode = new VNode({tag,data,children,context,componentOptions,componentInstance});
    vnode.elem = componentInstance.$el;
    return vnode;
};

/**
 * 创建函数型组件，与组件节点类似
 * @param data                   节点所包含的数据对象，包括大不限于节点的属性attrs、类名class、行间样式style等
 * @param children               该节点的子节点列表，是一个VNode数组
 * @param context                当前节点在Vue中的实例
 * @param functionalContext      组件节点的参数选项其中包含了组件的属性props等信息
 * @param functionalOptions      当前组件的实例对象
 * @returns {VNode}
 */
export const createFunctionalVNode = (data,children,context, functionalContext, functionalOptions) => new VNode({data,children,context,functionalContext, functionalOptions});

export default VNode;