// shared/constants.js 对一些全局的静态信息进行存储，如生命周期钩子名称、ast节点类型等


// 资源类型
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
    COMMENT: 'comment',//注释
    EXPRESSION: 'expression',// 表达式文本
};
