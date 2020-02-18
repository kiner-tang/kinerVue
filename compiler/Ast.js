// compiler/Ast.js 抽象语法树相关操作，此文件定义了一些创建抽象语法树节点的便捷方法

import {makeAttrsMap, makeRawAttrsMap} from "../shared/utils.js";
import {AST_ITEM_TYPE} from "../shared/constants.js";

/**
 * 创建一个抽象语法树的元素节点
 * @param tag
 * @param attrs
 * @param parent
 * @returns {{type: string, tag: *, attrList: *, parent: Window, children: Array}}
 */
export const createASTElement = (tag, attrs, parent) => {
    return {
        type: AST_ITEM_TYPE.ELEMENT,
        tag,
        attrList: attrs,
        // 将数组类型的attrList转化为键为name,值为value的map,方便使用
        // e.g.
        // attrList: [{name:"v-for",value:"(item,index) in friends"},{name:":key",value:"index+'_'+item"}]
        // 转换为：
        // {"v-for": "(item,index) in friends", ":key":"index+'_'+item" }
        attrsMap: makeAttrsMap(attrs),
        // 用于警告提示的时候根据属性名获取该属性的配置
        // e.g.
        // attrList: [{name:"v-for",value:"(item,index) in friends"},{name:":key",value:"index+'_'+item"}]
        // 转换为：
        // {"v-for":{"name":"v-for","value":"(item,index) in friends"},":key":{"name":":key","value":"index+'_'+item"}}
        rawAttrsMap: makeRawAttrsMap(attrs),
        parent,
        children:[]
    }
};

/**
 * 赋值一个抽象语法树元素节点
 * @param elem
 * @returns {{type: string, tag: *, attrList: *, parent: Window, children: Array}}
 */
export const cloneAstElement = (elem) => createASTElement(elem.tag, [...elem.attrList], elem.parent);

/**
 * 创建一个抽象语法树的表达式文本节点
 * @param text
 * @param exp           如果是插值表达式的话，会解析出表达式
 * @param tokens        ext = JSON.stringify(tokens)
 * @returns {{type: string, text: *}}
 */
export const createASTExpression = (text, exp, tokens) => ({type: AST_ITEM_TYPE.EXPRESSION, text, exp, tokens});
/**
 * 创建一个抽象语法树的文本节点
 * @param text
 * @returns {{type: string, text: *}}
 */
export const createASTText = (text) => ({type: AST_ITEM_TYPE.TEXT, text});

/**
 * 创建一个抽象语法树的注释节点
 * @param text
 * @returns {{type: string, text: *, isComment: boolean}}
 */
export const createASTComment = text => ({type: AST_ITEM_TYPE.COMMENT, text, isComment: true});