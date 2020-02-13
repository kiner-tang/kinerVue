import {parseHTML} from "./parse.js";
import SimpleStack from "../shared/SimpleStack.js";
import {isForbiddenTag, warn} from "../shared/utils.js";
import {createASTComment, createASTElement, createASTText} from "./Ast.js";
import {invalidAttributeRE} from "../shared/RE.js";

export const initCompiler = tpl => {

    tpl = tpl.trim();
    console.log('待转换模板：',tpl);
    let res = compilerHtml(tpl);
    console.log('渲染函数字符串：',res);
    return res;
};

export const compilerHtml = tpl => {
    let currentParent = null;
    let nodeStack = new SimpleStack();
    let res = parseHTML(tpl, {
        start(tag, attrs, isUnary, startIndex, endIndex){
            // 当解析到标签开始位置时会执行这个钩子函数，将标签名和对应的属性传过来

            let elem = createASTElement(tag, attrs, currentParent);
            console.log(`解析到开始标签：${tag}`,elem);

            // 检测非法属性并提示
            attrs.forEach(attr=>{
                if(invalidAttributeRE.test(attr.name)){
                    warn(`属性名:${attr.name}中不能包含空格、双引号、单引号、<、>、\/、= 这些字符`);
                }
            });

            // 如果当前标签是一个<style>...</style>或<script></script>、<script type="type/javascript"></script>的话
            // 提示用户这是一个在模板中被禁止使用的标签，因为模板仅仅只是用来描述状态与页面的呈现的，不应该包含样式和脚本标签
            if(isForbiddenTag(elem)){
                elem.forbidden = true;
                warn(`模板文件只是用来建立状态与UI之间的关系，不应该包含样式与脚本标签，当前使用的标签：${elem.tag}是被禁止的，我们不会对他进行便编译`);
            }

            // 处理checkbox、radio等需要预处理的标签


        },
        end(tag, startIndex, endIndex){
            // TODO 触发了两次，未解决
            console.log(`解析到终止标签：${tag}`,startIndex,endIndex);
            nodeStack.pop();
        },
        chars(text, startIndex, endIndex){
            console.log(`解析到文本：${text}`,startIndex,endIndex);
            // 每当解析到文本时会执行这个钩子函数，同时将找到的文本通过参数传过来
            let elem = createASTText(text);
        },
        comment(text, startIndex, endIndex){
            console.log(`解析到注释：${text}`,startIndex,endIndex);
            // 每当解析到注释节点时会触发这个钩子函数，并将注释的文本通过参数传递过来
            let elem = createASTComment(text);
        }
    });
    return res;
};
