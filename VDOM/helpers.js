// VDOM/helpers.js 生成虚拟dom时的助手，这里定义了规格化子节点的方法，用于处理一些如因为v-for导致子节点列表children中出现嵌套数组的情况，
// 规格化子节点就是将这个数组打平，同时对子节点做一些优化（如：将相邻的文本节点合并，从而减少虚拟节点的常见以及之后对比与渲染的开销等）
import {isA, isDef, isPrimitive, isUnDef} from "../shared/utils.js";
import {createTextVNode} from "./VNode.js";

/**
 * 对子节点进行规格化
 * @param children
 * @returns {*[]}
 */
export const normalizeChildren = children => {
    return isPrimitive(children)?[createTextVNode(children)]:isA(children)?normalizeArrayChildren(children):undefined;
};

/**
 * 判断是否是文本节点
 * @param node
 * @returns {boolean}
 */
function isTextNode(node){
    return isDef(node) && isDef(node.text) && !node.comment;
}

/**
 * 规格化数组类子节点
 * @param children
 * @param nestedIndex
 * @returns {Array}
 */
export const normalizeArrayChildren = (children, nestedIndex) => {
    const res = [];
    let i,child,lastIndex,lastChild;
    // 循环子节点列表
    for(i=0;i<children.length;i++){
        child = children[i];
        if(isUnDef(child) || typeof child === "boolean") continue;
        lastIndex = res.length-1;
        lastChild = res[lastIndex];

        // 如果当前的子节点是一个数组
        if(isA(child)){
            if(child.length>0){
                // 递归child
                child = normalizeArrayChildren(child, `${nestedIndex || ''}_${i}`);
                // 优化，合并两个相邻的文本节点，这样就可以创建一次文本节点，减少内存开销
                if(isTextNode(child[0]) && isTextNode(lastChild)){
                    res[lastIndex] = createTextVNode(`${lastChild.text}${child[0].text}`);
                    // 合并之后记得把他从数组中删掉，以免重复
                    child.shift();
                }
                // 由于child是数组，这里用了一个很巧妙的方法将数组里面的元素放进res中，就是利用apply接收的第二个参数也是数组
                // 通过push的apply方法便可将数组里面的元素放到res中
                res.push.apply(res, child);
            }
        }else if(isPrimitive(child)){// 如果当前子节点是原始数据的话
            // res如果最后一个节点是文本节点，那么，同理进行文本合并
            if(isTextNode(lastChild)){
                res[lastIndex] = createTextVNode(lastChild.text+child);
            }else{// 否则创建一个文本节点加入到结果数组
                res.push(createTextVNode(child));
            }
        }else{
            // 如果当前节点和数组最后一个节点都是文本，同理进行合并
            if(isTextNode(lastChild) && isTextNode(child)){
                res[lastIndex] = createTextVNode(lastChild.text+child.text);
            }else{
                // 嵌套数组子元素的默认键(可能由v-for生成)
                if(children._isVList && isDef(child.tag) && isDef(child.key) && isDef(nestedIndex)){
                    child.key = `__vlist${nestedIndex}_${i}__`;
                }
                res.push(child);
            }
        }
    }
    return res;
};