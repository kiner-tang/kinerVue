import {hasOb, isDef, warn} from "../shared/utils.js";
import {createElemVNode, createEmptyVNode, createTextVNode} from "./VNode.js";
import {normalizeChildren} from "./helpers.js";

export const createElement = (tag,data,children,textContent,isComment,ctx) => {
    return _createElement(tag,data,children,textContent,isComment,ctx);
};

export const _createElement = (tag,data,children,textContent,isComment,ctx) => {

    if(isDef(data) && hasOb(data)){
        warn(`避免使用已经被Observer观察的数据作为元素的数据对象`);
        return createEmptyVNode();
    }
    if(isDef(data) && isDef(data.is)){
        tag = data.is;
    }

    children = normalizeChildren(children);

    let vnode;
    //判断tag是否存在，若存在，则为元素或组件节点
    if(isDef(tag)){
        // 若tag为字符串时为元素节点
        if(typeof tag === "string"){
            vnode = createElemVNode(tag,data,children,ctx);
        }else{//否则便是组件节点
            //TODO 暂不处理
        }
    } else {//若tag不存在，则判断是否
        if(isComment){//注释节点
            vnode = createEmptyVNode(textContent);
        }else{//文本节点
            vnode = createTextVNode(textContent);
        }
    }

    return vnode;
};