// compiler/optimize.js 优化器，对通过解析器生成的抽象语法树中的静态节点和静态根节点进行标记，在渲染阶段便可以跳过这些渲染节点进行渲染，以提升效率
import {AST_ITEM_TYPE} from "../shared/constants.js";
import {cached, isBuiltInTag, isReservedTag, makeMap} from "../shared/utils.js";

const genStaticKeysCached = cached(genStaticKeys);
let isStaticKey;

export const optimize = root => {

    // 将所有的静态属性都罗列出来，方便区分动态属性
    isStaticKey = genStaticKeysCached('');
    // 标记所有静态节点
    markStatic(root);
    // 标记所有静态根节点
    markStaticRoots(root, false);
};

/**
 * 标记所有静态节点
 * @param node
 */
export const markStatic = node => {
    // 标记当前节点是不是静态标签
    node.static = isStatic(node);
    if (node.type === AST_ITEM_TYPE.ELEMENT) {// 1-元素节点 2-带变量的文本节点 3-不带变量的文本节点

        if (
            !isReservedTag(node.tag) && //如果不是网页保留标签
            node.tag !== 'slot' && // 不是一个插槽
            node.attrsMap['inline-template'] === null // 不是一个内联模板
        ) {
            return;
        }

        // 循环标记所有子节点，并适时修正当前节点
        let children = node.children;
        for (let i = 0, len = children.length; i < len; i++) {
            let child = children[i];
            markStatic(child);

            //若子节点不是静态节点，那么其父级节点不可能是静态节点
            if (!child.static) {
                node.static = false;
            }
        }

        // 如果当前节点绑定了v-if
        if (node.ifConditions) {
            // 将除了他自己之外的条件链节点都进行以下标记
            for (let i = 1, l = node.ifConditions.length; i < l; i++) {
                const block = node.ifConditions[i].block;
                markStatic(block);
                // 如果条件链的分支节点不是静态的，那当前节点也不可能是静态的，修正一下
                if (!block.static) {
                    node.static = false;
                }
            }
        }
    }
};

/**
 * 标记所有静态根节点
 * @param node
 * @param isInFor 是否在循环体重
 */
export const markStaticRoots = (node, isInFor) => {
    if (node.type === AST_ITEM_TYPE.ELEMENT) {// 1-元素节点 2-带变量的文本节点 3-不带变量的文本节点
        // 如果当前节点是静态节点或者当前节点标记为只渲染一次，那么标记一下改节点在for循环中是否是静态的
        if (node.static || node.once) {
            node.staticInFor = isInFor;
        }
        if (
            node.static &&//当前节点是静态节点
            node.children.length &&//当前节点拥有子节点
            !(node.children.length === 1 && node.children[0].type === AST_ITEM_TYPE.TEXT)//排除当前节点的子节点只有一个并且该节点是不带变量的文本节点,因为这种情况优化的成本大于收益，而我们的优化器的目的就是要降低成本
        ) {
            node.staticRoot = true;
            return;
        } else {
            node.staticRoot = false;
        }

        if (node.children) {
            //循环递归调用，标记当前节点下的所有子节点中满足条件的静态根节点
            node.children.forEach(child => markStaticRoots(child, isInFor || !!child.for));
        }

        // 如果当前节点绑定了v-if
        if (node.ifConditions) {
            // 将除了他自己之外的条件链节点都进行以下标记
            for (let i = 1, l = node.ifConditions.length; i < l; i++) {
                markStaticRoots(node.ifConditions[i].block, isInFor);
            }
        }

    }
};

/**
 * 判断目标节点是否为静态节点
 * @param node
 * @returns {boolean}
 */
export const isStatic = node => {
    // 带变量的文本节点
    if (node.type === AST_ITEM_TYPE.EXPRESSION) {
        return false;
    }
    // 不带变量的文本节点
    if (node.type === AST_ITEM_TYPE.TEXT) {
        return true;
    }

    return !!(
        node.pre || // 如果带有v-pre的标签必定是静态标签
        (
            !node.hasBindings && // 没有动态绑定的属性
            !node.if && !node.for && // 没有 v-if 、 v-for 、 v-else
            !isBuiltInTag(node.tag) && // 不是一个vue内置标签
            isReservedTag(node.tag) && // 是html或svg的保留标签
            !isDirectChildOfTemplateFor(node) && // 不是循环template的直接子节点
            Object.keys(node).every(isStaticKey) // 含有指定属性
        )
    )
};

/**
 * 是否是循环template的直接子节点
 * @param node
 * @returns {boolean}
 */
function isDirectChildOfTemplateFor (node) {
    while (node.parent) {
        node = node.parent;
        if (node.tag !== 'template') {
            return false
        }
        if (node.for) {
            return true
        }
    }
    return false
}

/**
 * 获取静态key值
 * @param keys
 * @returns {function(*): *}
 */
function genStaticKeys (keys) {
    return makeMap(
        'type,tag,attrList,attrsMap,plain,parent,children,attrs,startIndex,endIndex,rawAttrsMap' +
        (keys ? ',' + keys : '')
    )
}