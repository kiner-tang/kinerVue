import {isA, isString} from "../../shared/utils.js";

/**
 * 渲染一个静态节点
 * @param index     当前静态节点的索引
 * @param isInFor   是否在v-for循环中
 * @returns {Array<VNode>|VNode}
 */
export const renderStatic = function(index, isInFor) {

    // 获取缓存的静态虚拟节点树列表，若不存在这初始化一个
    let cachedTrees = this._staticTrees || (this._staticTrees = []);
    // 根据索引获取目标虚拟节点树
    let tree = cachedTrees[index];
    // 如果能够在缓存中获取到虚拟节点树并且不是在v-for中的话，
    // 那么，我们可以确定，缓存中的虚拟节点树就是我们要的虚拟节点树
    // 因为静态的虚拟节点树首次渲染之后是不会再因为状态改变而改变的
    // 所以，如果是这种情况，直接返回这个虚拟节点树就可以了
    if(tree && !isInFor){
        return tree;
    }

    // 否则，我们就要渲染一个新的静态虚拟节点树
    tree = cachedTrees[index] = this.$options.staticRenderFns[index].call(
        this._renderProxy, // 实际上，如果是生产环境，这个就是vue实例
        null,
        this
    );
    // 加一个静态标记
    markStatic(tree, `__static__${index}`, false);

    return tree;
};

/**
 * 标记静态节点树
 * @param tree
 * @param key
 * @param isOnce
 */
export const markStatic = function (tree, key, isOnce) {
    if(isA(tree)){
        tree.forEach((node, index)=>node&&isString(node)&&markStaticNode(node, `${key}_${index}`, isOnce));
    }else{
        markStaticNode(tree, key, isOnce);
    }
};

/**
 * 标记一个仅仅渲染一次的节点
 * @param tree
 * @param index
 * @param key
 * @returns {Array<VNode>|VNode}
 */
export const markOnce = function (tree, index, key) {
    markStaticNode(tree, `__once__${index}${key ? `_${key}` : ``}`, true);
    return tree;
};

/**
 * 标记一个静态节点
 * @param node
 * @param key
 * @param isOnce
 */
export const markStaticNode = function (node, key, isOnce) {
    node.isStatic = true;
    node.key = key;
    node.isOnce = isOnce;
};