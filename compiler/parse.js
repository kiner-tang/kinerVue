import {isPlainTextElement} from "../shared/utils.js";

export const parseHTML = (html,options) => {
    let lastTag;
    while (html){
        if(!lastTag || !isPlainTextElement(lastTag)){
            // 父元素为正常元素
            let textEnd = html.indexOf('<');
            if(textEnd===0){

            }
        }else{
            // 父级元素是script、style、textarea
        }
    }
};
/**
 * 文本解析器，用于解析文本中的变量
 * @param text
 * @returns {string}
 */
export const parseText = text => {
    const expRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
    if(!expRE.test(text)) return;

    // 将正则的游标移动到开始的位置
    let lastIndex = expRE.lastIndex = 0;

    let match,index,res = [];

    while ((match = expRE.exec(text))){

        index = match.index;

        // 将{{之前的文本加入到结果数组
        if(index > lastIndex){
            res.push(JSON.stringify(text.slice(lastIndex,index)));
        }
        // 将解析出来的变量转化为调用方法的方式并加入结果数组如：_s(name)
        res.push(`window._s('${match[1].trim()}')`);

        // 设置lastIndex保证下一次循环不会重复匹配已经解析过的文本
        lastIndex = index + match[0].length;

    }

    // 将}}之后的文本加入到结果数组
    if(lastIndex<text.length){
        res.push(JSON.stringify(text.slice(lastIndex)));
    }

    return res.join('+');
};

