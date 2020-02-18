// 为实现平台渲染组件，vue将对页面组件的渲染操作与具体的实现解耦，并抽离出来单独实现渲染引擎，已实现写一套Vue代码便可打包web、android、ios的端代码的目的
// 本文件便是web渲染引擎，所有涉及到浏览器渲染dom节点的操作，都在此处定义，那么，当需要渲染出web页面时，只需要指定本引擎便可渲染出web页面

/**
 * 创建一个Dom元素
 * @param tag   标签名
 * @param vnode     虚拟节点，用于描述这个对象的详细信息
 * @returns {HTMLElement | HTMLSelectElement | HTMLLegendElement | HTMLTableCaptionElement | HTMLTextAreaElement | HTMLModElement | HTMLHRElement | HTMLOutputElement | HTMLPreElement | HTMLEmbedElement | HTMLCanvasElement | HTMLFrameSetElement | HTMLMarqueeElement | HTMLScriptElement | HTMLInputElement | HTMLUnknownElement | HTMLMetaElement | HTMLStyleElement | HTMLObjectElement | HTMLTemplateElement | HTMLBRElement | HTMLAudioElement | HTMLIFrameElement | HTMLMapElement | HTMLTableElement | HTMLAnchorElement | HTMLMenuElement | HTMLPictureElement | HTMLParagraphElement | HTMLTableDataCellElement | HTMLTableSectionElement | HTMLQuoteElement | HTMLTableHeaderCellElement | HTMLProgressElement | HTMLLIElement | HTMLTableRowElement | HTMLFontElement | HTMLSpanElement | HTMLTableColElement | HTMLOptGroupElement | HTMLDataElement | HTMLDListElement | HTMLFieldSetElement | HTMLSourceElement | HTMLBodyElement | HTMLDirectoryElement | HTMLDivElement | HTMLUListElement | HTMLHtmlElement | HTMLAreaElement | HTMLMeterElement | HTMLAppletElement | HTMLFrameElement | HTMLOptionElement | HTMLImageElement | HTMLLinkElement | HTMLHeadingElement | HTMLSlotElement | HTMLVideoElement | HTMLBaseFontElement | HTMLTitleElement | HTMLButtonElement | HTMLHeadElement | HTMLParamElement | HTMLTrackElement | HTMLOListElement | HTMLDataListElement | HTMLLabelElement | HTMLFormElement | HTMLTimeElement | HTMLBaseElement}
 */
export const createElement = (tag,vnode) => {
    //创建一个dom元素
    let elem = document.createElement(tag);

    //TODO ????为啥要将select的multiple拎出来做特殊处理呢？
    //若创建的元素不是<select>标签则直接返回该元素
    if(tag!=="select"){
        return elem;
    }
    //若创建的标签是select,则判断标签属性中是否包含multiple字段并且它的值不能为undefined,如果是，则为元素加上multiple标签,否则直接返回
    if(vnode.data&&vnode.data.attrs&&vnode.data.attrs.multiple!==undefined){
        elem.setAttribute("multiple","multiple");
    }
    return elem;
};

/**
 * 创建一个文本节点
 * @param text          文本内容
 * @returns {Text}
 */
export const createTextNode = text => document.createTextNode(text);

/**
 * 创建一个注释节点
 * @param comment       注释文本
 * @returns {Comment}
 */
export const createComment = comment => document.createComment(comment);

/**
 * 在父节点parentNode下的子节点targetNode之前插入一个新节点newNode
 * @param parentNode    父节点
 * @param newNode       待插入子节点
 * @param targetNode    目标子节点
 * @returns {Node | ActiveX.IXMLDOMNode}
 */
export const insertBefore = (parentNode, newNode, targetNode) => parentNode.insertBefore(newNode,targetNode);

/**
 * 将给定父节点parentNode下的子节点child移除
 * @param parentNode        父节点
 * @param child             子节点
 * @returns {ActiveX.IXMLDOMNode | Node}
 */
export const removeChild = (parentNode, child) => parentNode.removeChild(child);

/**
 * 将子节点child追加到父节点parentNode的最后
 * @param parentNode        父节点
 * @param child             子节点
 * @returns {Node | ActiveX.IXMLDOMNode}
 */
export const appendChild = (parentNode, child) => parentNode.appendChild(child);

/**
 * 获取当前节点的父级节点
 * @param node
 * @returns {Node | (() => (Node | null)) | ActiveX.IXMLDOMNode | SVGElementInstance}
 */
export const parentNode = node => node.parentNode;

/**
 * 获取给定节点之后的兄弟节点
 * @param node
 * @returns {Node | SVGElementInstance | ActiveX.IXMLDOMNode | (() => (Node | null))}
 */
export const nextSibling = node => node.nextSibling;

/**
 * 获取给定节点的标签名
 * @param node
 * @returns {string}
 */
export const tag = node => node.tag;

/**
 * 获取给定节点的文本节点
 * @param node
 * @returns {string}
 */
export const textContent = node => node.textContent;

/**
 * 为元素设置scopeId属性，即为指定元素设置作用域
 * @param node
 * @param scopeId
 */
export const setStyleScope = (node, scopeId) => node.setAttribute(scopeId,'');