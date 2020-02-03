//优化器，对通过解析器生成的抽象语法树中的静态节点和静态根节点进行标记，在渲染阶段便可以跳过这些渲染节点进行渲染，以提升效率
export const optimize = root => {
    // 标记所有静态节点
    markStatic(root);
    // 标记所有静态根节点
    markStaticRoots(root);
};

/**
 * 标记所有静态节点
 * @param node
 */
export const markStatic = node => {
    node.static = isStatic(node);
    if(node.type === 1){// 1-元素节点 2-带变量的文本节点 3-不带变量的文本节点
        let children = node.children;
        for(let i=0,len=children.length;i<len;i++){
            let child = children[i];
            markStatic(child);

            //若子节点不是静态节点，那么其父级节点不可能是静态节点
            if(!child.static){
                node.static = false;
            }
        }
    }
};

/**
 * 标记所有静态根节点
 * @param node
 */
export const markStaticRoots = node => {
    if(node.type === 1) {// 1-元素节点 2-带变量的文本节点 3-不带变量的文本节点
        if(
            node.static &&//当前节点是静态节点
            node.children.length &&//当前节点拥有子节点
            !(node.children.length===1 && node.children[0].type ===3)//排除当前节点的子节点只有一个并且该节点是不带变量的文本节点,因为这种情况优化的成本大于收益，而我们的优化器的目的就是要降低成本
        ){
            node.staticRoot = true;
            return;
        }else{
            node.staticRoot = false;
        }

        if(node.children){
            //循环递归调用，标记当前节点下的所有子节点中满足条件的静态根节点
            node.children.forEach(child=>markStaticRoots(child));
        }

    }
};

export const isStatic = node => {
    // 带变量的文本节点
    if(node.type === 2){
        return false;
    }
    // 不带变量的文本节点
    if(node.type === 3){
        return true;
    }
};