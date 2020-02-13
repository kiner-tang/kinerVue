export const ASSET_TYPES = [
    'component',
    'directive',
    'filter'
];

/**
 * 生命周期钩子
 * @type {string[]}
 */
export const LIFECYCLE_HOOKS = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',
    'deactivated',
    'errorCaptured',
    'serverPrefetch'
];

/**
 * 抽象语法树中节点的类型
 * @type {{ELEMENT: string, TEXT: string, COMMENT: string}}
 */
export const AST_ITEM_TYPE = {
    ELEMENT: 'element',//元素
    TEXT: 'text',//文本
    COMMENT: 'comment'//注释
};
