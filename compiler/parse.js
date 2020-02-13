import {
    canBeLeftOpenTag,
    decodingMap,
    isNonPhrasingTag,
    isPlainTextElement,
    isUnaryTag, makeMap,
    noop
} from "../shared/utils.js";
import {
    attribute,
    comment,
    conditionalComment,
    doctype,
    dynamicArgAttribute, encodedAttr, encodedAttrWithNewLines,
    endTag,
    startTagClose,
    startTagOpen
} from "../shared/RE.js";
import SimpleStack from "../shared/SimpleStack.js";


// #5992 忽略pre和textarea标签的第一个换行符
const isIgnoreNewlineTag = makeMap('pre,textarea', true);
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n';


export const parseHTML = (html, options) => {
    let {
        start: startHook = noop,
        end: endHook = noop,
        chars: charsHook = noop,
        comment: commentHook = noop,
        shouldKeepComment = true,// 是否需要保留注释
        shouldDecodeNewlinesForHref = false,// 是否应该对a标签的href进行一次编码
        shouldDecodeNewlines = false// 是否应该对属性值进行一次编码
    } = options;
    let lastTag, last;
    let endChars;// 截止字符串
    let index = 0;// 当前指针所在的位置
    const stack = new SimpleStack();// 用于存储标签信息的栈，通过将标签信息存储再栈中方便标签的匹配处理和父级标签的寻找


    while (html) {
        last = html;
        if (!lastTag || !isPlainTextElement(lastTag)) {
            // 父元素为正常元素
            let textEnd = html.indexOf('<');
            if (textEnd === 0) {

                // 首先判断标签是否是注释元素
                if (comment.test(html)) {
                    // 找出第一个注释结束标签的索引
                    endChars = '-->';
                    const commentEnd = html.indexOf(endChars);
                    if (commentEnd >= 0) {
                        // 看一下配置是否需要保留注释，如果不需要保留注释，则不触发钩子函数，否则触发
                        if (shouldKeepComment) {
                            // 触发钩子函数
                            // 参数有三个：
                            // 1、注释文本
                            // 2、指针开始位置，即上一个节点的结束位置
                            // 3、指针结束位置，即注释节点的结束位置
                            // 截取注释文本 <!-- 注释文本 -->
                            commentHook(html.substring(4, commentEnd), index, index + commentEnd + endChars.length);

                            // 指针向前，指向注释标签的后面一个节点
                            advance(commentEnd + endChars.length);

                            // 本次处理完毕，继续下一次的字符串切割处理
                            continue;
                        }
                    }
                }

                // 如果不是普通注释，再看看是不是条件注释
                if (conditionalComment.test(html)) {
                    endChars = ']>';
                    // 找到条件注释的截止位置
                    const commentEnd = html.indexOf(endChars);

                    if (commentEnd >= 0) {
                        // 条件注释无需触发commentHook钩子函数，直接跳过即可
                        advance(commentEnd + endChars.length);

                        // 本次处理完毕，继续下一次的字符串切割处理
                        continue;
                    }
                }

                // 如果是文档类型标签,如：<!DOCTYPE html>
                const docTypeMatch = html.match(doctype);
                if (docTypeMatch) {
                    // 如果是文档类型标签，也直接跳过
                    advance(docTypeMatch[0].length);
                    // 本次处理完毕，继续下一次的字符串切割处理
                    continue;
                }

                // 如果是结束标签，如</div>
                const endTagMatch = html.match(endTag);
                if (endTagMatch) {
                    // 记录结束标签开始位置
                    const curIndex = index;
                    // 游标移动到结束标签终止位置
                    advance(endTagMatch[0].length);
                    // 处理结束标签
                    parseEndTag(endTagMatch[1], curIndex, index);
                    // 本次处理完毕，继续下一次的字符串切割处理
                    continue;
                }

                // 解析开始标签，如<div>
                const startTagMatch = parseStartTag();
                if (startTagMatch) {
                    // 处理开始标签
                    handleStartTag(startTagMatch);
                    if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
                        // 如果在pre和textarea内第一个字符是换行符的话，需要忽略这个换行符，否则在解析文本的时候会出问题
                        advance(1);
                    }
                    // 本次处理完毕，继续下一次的字符串切割处理
                    continue;

                }
            }
            // 解析文本
            // 若textEnd>0，说明html字符串不是以标签开头，而是以文本开头
            // e.g.
            // 这是一段文本<</div>
            let text, rest, next;
            if (textEnd > 0) {
                // 将以<开头的字符串取出来，看一下这个字符串是不是开始标签、结束标签、注释、条件注释，
                // 如果都不是，就把他当做是普通文本，然后继续往下找下一个<,知道匹配到开始标签、结束标签、注释、条件注释位置
                rest = html.slice(textEnd);

                while (
                    !endTag.test(rest) && // 是不是终止标签
                    !startTagOpen.test(rest) && // 是不是开始标签
                    !comment.test(rest) && // 是不是注释标签
                    !conditionalComment.test(rest) // 是不是条件注释
                    ) {
                    // 能进入这里，说明rest里面的那个<不是开始标签、结束标签、注释、条件注释中的一种，那我们就把他当做是普通的文本
                    // 然后继续找下一个<
                    next = rest.indexOf('<',1);
                    // 如果找不到下一个<了，说明剩余的这个html就是以一段文字作为结尾的，如：这是一段文本<- _ ->
                    // 那么我们就不需要再往下寻找了，直接退出循环即可
                    if(next<0) break;
                    // <的位置变了，所以要更新一下textEnd，不然textEnd还是指向上一个<
                    textEnd += next;
                    // 以新的<作为起始再次截取字符串，进入下一个循环，看看这一次的<是不是开始标签、结束标签、注释、条件注释中的一种
                    rest = html.slice(textEnd);
                }
                // 当循环结束之后，textEnd就已经指向了文本节点的最后的位置了
                text = html.substring(0, textEnd);
            }

            // 如果textEnd<0,那么说明我们的html中根本就没有开始标签、结束标签、注释、条件注释，他就是一个纯文本
            if(textEnd<0){
                text = html;
            }

            // 我们已经将当前的文本获取到了，如果有文本的话，那么我们就将游标移动到文本末尾，准备进行下一轮的查找
            if(text){
                advance(text.length);
                // 文本节点已经获取到了，触发文本节点钩子
                charsHook(text, index - text.length, index);
            }

        } else {
            // 父级元素是script、style、textarea
            // TODO 特殊标签逻辑暂不处理
        }
    }


    /**
     * 辅助函数，用于让切割文本的指针按照所传的步数不断向前，并在向前的同时不断的切割文本从而清理掉已经处理过或不需要处理的文本，
     * 让指针始终指向待处理的文本
     * @param step  要向前移动几步
     */
    function advance(step) {
        index += step;
        html = html.substring(step);
    }

    /**
     * 用于解析开始标签及其属性等
     * @returns {{tagName: *, attrs: Array, startIndex: number}}
     */
    function parseStartTag() {
        // 解析开始标签
        const start = html.match(startTagOpen);
        if (start) {
            let match = {
                tagName: start[1],
                attrs: [],
                startIndex: index
            };
            // 找到开始标签的标签名了，往后走再看看他都有哪些舒缓型
            advance(start[0].length);

            let tagEnd,// 开始标签是否遇到结束符>，如果遇到了结束符，说明开始标签已经解析完毕了
                attr;// 暂存当前的属性描述字符串，可能是常规的html标签属性，也可能是vue自带的动态属性，如：@click="a"、v-html="b"、:title="title"等

            // 循环只有当遇到了结束符或者是已经再也解析不出属性来的时候才会结束
            while (!(tagEnd = html.match(startTagClose)) && (attr = (html.match(attribute) || html.match(dynamicArgAttribute)))) {
                // 记录每一个属性的开始位置
                attr.start = index;
                // 指针右移到属性末尾的位置
                advance(attr[0].length);
                // 记录属性的结束位置
                attr.end = index;
                // 将找到的属性添加到match中的属性列表中
                match.attrs.push(attr);
            }
            // 当到达结束位置时，看一下这个标签是不是自闭标签，如果是的话，储存他的自闭分隔符/，方便只有用来判断该标签是否自闭
            if (tagEnd) {
                // 存储自闭符号
                match.unarySlash = tagEnd[1];
                // 指针右移至开始标签最后
                advance(tagEnd[0].length);
                // 记录下开始标签的结束位置
                match.endIndex = index;
            }
            // 开始标签解析完成，返回匹配结果
            return match;
        }
    }

    /**
     * 处理开始标签的属性等
     * @param match
     */
    function handleStartTag(match) {
        const {tagName, unarySlash, attrs, startIndex, endIndex} = match;

        // 如果当前标签的上一个标签是一个p标签，并且当前正在解析的标签不是一个段落元素标签，那么我们就直接调用parseEndTag将p标签结束掉
        // 因为在HTML标准中，p标签只能嵌套段落元素，其他元素如果嵌套在p标签中会被自动解析到p标签外面
        // e.g.
        // <p><span>这是内联元素</span><div>这是块级元素</div></p>
        // 在浏览器中会被解析成：
        // <p><span>这是内联元素</span></p><div>这是块级元素</div><p></p>
        // html5标签相关文档链接：https://html.spec.whatwg.org/multipage/indices.html#elements-3
        // 段落标签相关文档链接：https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
        if (lastTag === "p" && isNonPhrasingTag(tagName)) {
            parseEndTag(lastTag);
        }
        // 如果标签的上一个标签跟当前解析的标签名相同并且当前标签属于"可省略闭合标签"，那么，直接调用parseEndTag把上一个标签结束掉
        // e.g.
        // <ul>
        //      <li> 选项1
        //      <li> 选项2
        //      <li> 选项3
        //      <li> 选项4
        // </ul>
        if (canBeLeftOpenTag(tagName) && tagName === lastTag) {
            parseEndTag(lastTag);
        }

        // 当前解析的标签是否为自闭标签
        // 自闭标签分为两种情况，一种是html内置的自闭标签，一种是用户自定义标签或组件时自闭的
        const unaryTag = isUnaryTag(tagName) || !!unarySlash;


        // 由于在不同的浏览器中，对标签属性的处理有所区别，如在IE浏览器中，会将所有的属性值进行一次编码，如：
        // <div name="\n"/>         =>      <div name="&#10;"/>
        // 再如在chrome浏览器中，会对a标签的href属性进行一次编码
        // <a href="\n"/>           =>      <a href="&#10;"/>
        // 因此，我们需要对属性值做一下处理，对这些属性进行解码
        let len = attrs.length;
        let newAttrs = new Array(len);

        for (let i = 0; i < len; i++) {
            let attrMatch = attrs[i];
            const value = attrMatch[3] || // 匹配属性格式：name="kiner"
                attrMatch[4] ||  // 匹配属性格式：name='kiner'
                attrMatch[5] ||  // 匹配属性格式：name=kiner
                "";

            // 若解析的标签是a标签且当前属性名是href，则根据当前浏览器环境看是否需要对\n换行符进行解码（有些浏览器会对属性值进行编码处理）
            const theShouldDecodeNewlines = tagName === 'a' && attrMatch[1] === 'href'
                ? shouldDecodeNewlinesForHref
                : shouldDecodeNewlines;

            // 将处理过的属性放到newAttrs中
            newAttrs[i] = {
                name: attrMatch[1],
                value: decodeAttr(value, theShouldDecodeNewlines)
            }
        }
        // 判断当前标签是否为自闭标签，若不是自闭标签，则需要将解析出来的当前标签的信息压入栈中，方便后续用来匹配标签以及查找父级使用
        if (!unaryTag) {
            stack.push({
                tag: tagName,
                lowerCaseTag: tagName.toLowerCase(),
                attrs: newAttrs,
                startIndex: match.startIndex,
                endIndex: match.endIndex
            });
            // 将当前标签名赋值给lastTag，方便后续的对比操作
            lastTag = tagName;
        }

        // 开始标签的信息已经解析完毕，通知钩子函数
        startHook(tagName, newAttrs, unaryTag, startIndex, endIndex);


    }

    /**
     * 对一些已经被编码的属性值进行解码
     * @param val
     * @param shouldDecodeNewlines
     * @returns {string | * | void}
     */
    function decodeAttr(val, shouldDecodeNewlines) {
        const reg = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
        return val.replace(reg, match => decodingMap[match]);
    }

    function parseEndTag(tagName, startIndex = index, endIndex = index) {
        let pos,// 用于查找当前结束标签对应开始标签的游标变量
            lowerCaseTagName;// 当前结束标签的小写标签名

        if (tagName) {
            lowerCaseTagName = tagName.toLowerCase();
            // 通过结束标签名在标签栈中从上往下查找最近的一个匹配标签，并返回标签的游标索引
            pos = stack.findIndex(tag => tag.lowerCaseTag === lowerCaseTagName);
        } else {
            pos = 0;
        }

        if (pos >= 0) {
            //找到了开始标签了说明这个结束标签是有效的，触发endHook
            endHook(stack.get(pos).tag, startIndex, endIndex);
        } else if (lowerCaseTagName === "br") {
            // br是一个自闭的标签,有三种写法：<br/> 或 <br> 或 </br>
            // 这里就是匹配第三中写法的，虽然这种写法很少见，而且不太推荐使用，
            // 但在html中这么使用确实是不会报错，所以还是要兼容一下
            // 因为br是自闭标签，也没没有什么其他情况需要处理的，我们指直接触发他的startHook就可以了
            startHook(tagName, [], true, startIndex, endIndex);

        } else if (lowerCaseTagName === "p") {
            // 由于通过pos没能在标签栈中找到与当前p标签匹配的开始标签，因此，这个标签应该是一个 </p> 的一个单独的标签
            // 因为在html解析的时候，遇到这样一个单独的闭合p标签，会自动解析为<p></p>,因此，此时既要触发startHook也要出发endHook
            startHook(tagName, [], false, startIndex, endIndex);
            endHook(tagName, startIndex, endIndex);
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
    if (!expRE.test(text)) return;

    // 将正则的游标移动到开始的位置
    let lastIndex = expRE.lastIndex = 0;

    let match, index, res = [];

    while ((match = expRE.exec(text))) {

        index = match.index;

        // 将{{之前的文本加入到结果数组
        if (index > lastIndex) {
            res.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        // 将解析出来的变量转化为调用方法的方式并加入结果数组如：_s(name)
        res.push(`window._s('${match[1].trim()}')`);

        // 设置lastIndex保证下一次循环不会重复匹配已经解析过的文本
        lastIndex = index + match[0].length;

    }

    // 将}}之后的文本加入到结果数组
    if (lastIndex < text.length) {
        res.push(JSON.stringify(text.slice(lastIndex)));
    }

    return res.join('+');
};

