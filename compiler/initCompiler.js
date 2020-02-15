import {parseHTML, parseText} from "./parse.js";
import SimpleStack from "../shared/SimpleStack.js";
import {cached, isForbiddenTag, isIE, isPreTag, isTextTag, warn} from "../shared/utils.js";
import {createASTComment, createASTElement, createASTExpression, createASTText} from "./Ast.js";
import {invalidAttributeRE, lineBreakRE, whitespaceRE} from "../shared/RE.js";
import {
    addIfCondition,
    preTransformNode, processElement,
    processFor,
    processIf, processIfConditions,
    processOnce,
    processPre,
    processRawAttrs
} from "./helper.js";
import {AST_ITEM_TYPE} from "../shared/constants.js";
// 第三方html编码解码库
import he from "../shared/he.js";
import {optimize} from "./optimize.js";



// 将解码方法加入到缓存中
const decodeHTMLCached = cached(he.decode);

export const initCompiler = (tpl, options) => {

    tpl = tpl.trim();
    console.log('待转换模板：', tpl);
    let ast = compilerHtml(tpl, options);
    console.log('抽象语法树：', ast);

    // 如果配置为禁止优化器，则使用优化器对抽象语法树进行优化，将所有的静态节点标记出来
    // 在编译的时候，静态节点除了第一次需要渲染之外，其他时候都是不需要重复渲染的
    if (options.optimize !== false) {
        optimize(ast, options)
    }
    console.log('经过优化器优化过后的抽象语法树：', ast);

    return ast;
};
let currentParent = null;
let nodeStack = new SimpleStack();
let inVPre = false;// 是否标记了v-pre,若标记了，则编译时可以跳过内部文本的编译工作，加快编译效率
let inPre = false;// 当前标签是否为pre标签
let root;// 根节点

export const compilerHtml = (tpl, options) => {

    parseHTML(tpl, {
        ...options,
        start(tag, attrs, isUnary, startIndex, endIndex) {
            // 当解析到标签开始位置时会执行这个钩子函数，将标签名和对应的属性传过来

            let elem = createASTElement(tag, attrs, currentParent);


            // 检测非法属性并提示
            attrs.forEach(attr => {
                if (invalidAttributeRE.test(attr.name)) {
                    warn(`属性名:${attr.name}中不能包含空格、双引号、单引号、<、>、\/、= 这些字符`);
                }
            });

            // 如果当前标签是一个<style>...</style>或<script></script>、<script type="type/javascript"></script>的话
            // 提示用户这是一个在模板中被禁止使用的标签，因为模板仅仅只是用来描述状态与页面的呈现的，不应该包含样式和脚本标签
            if (isForbiddenTag(elem)) {
                elem.forbidden = true;
                warn(`模板文件只是用来建立状态与UI之间的关系，不应该包含样式与脚本标签，当前使用的标签：${elem.tag}是被禁止的，我们不会对他进行便编译`);
            }

            // 处理checkbox、radio等需要预处理的标签
            preTransformNode(elem);

            // 如果inVPre为false,可能还没有解析当前标签是否标记了v-pre
            if (!inVPre) {
                // 解析一下
                processPre(elem);
                // 如果解析过后发现elem上标记有pre=true,说明标签确实标记了v-pre
                if (elem.pre) {
                    // 修正inVPre
                    inVPre = true;
                }
            }

            // 当然，除了vue的指令v-pre之外，我们html也自带一个pre标签，
            // 如果标签名是pre,那也要将inPre标记为true
            isPreTag(elem.tag) && (inPre = true);


            if (inVPre) {
                // 如果一个标签被标记了v-pre,那我们只需要把attrList中剩余的属性复制到elem的attrs中去即可
                // 因为attrList中的其他属性都在刚刚进行预处理的时候已经处理并从attrList中删除了
                processRawAttrs(elem);
            } else if (!elem.processed) {
                // 如果还有没有处理的结构指令，如v-for、v-if等，就处理一下
                processFor(elem);
                processIf(elem);
                processOnce(elem);
            }

            // 如果不存在根节点，则当前节点就是根节点
            !root && (root = elem);

            // 判断当前节点是不是一个自闭标签，如果是一个自闭标签，那么直接结束当前标签解析
            // 如果是不是自闭标签，我们需要记录下当前节点当做是下个节点的父级元素，并加这个元素压入栈中
            if (isUnary) {
                closeElement(elem);
            } else {
                currentParent = elem;
                nodeStack.push(elem);
            }

        },
        end(tag, startIndex, endIndex) {
            // TODO 触发了两次，未解决
            // console.log(`解析到终止标签：${tag}`, startIndex, endIndex);
            // 当前标签已经解析结束了，将标签从栈中弹出
            let elem = nodeStack.pop();
            // 此时栈顶元素便是我们下一个元素的父级
            currentParent = nodeStack.top();
            // 关闭标签
            closeElement(elem);
        },
        chars(text, startIndex, endIndex) {
            // console.log(`解析到文本：${text}`, startIndex, endIndex);
            // 如果不存在父级节点，那么我们可以得知，
            // 这个解析出来的文本，要么就是在根节点之外，要么，压根就没有根节点，所给的tpl直接就是一段文本
            if (!currentParent) {
                // 如果解析出来的文本跟传入的模板完全相同，那么，说明直传进来一个文本内容，警告提示
                if (text === tpl) {
                    warn(`组件模板需要一个根元素，而不仅仅是文本。`);
                } else if ((text = text.trim())) { // 文本定义在了根节点的外面，警告提示
                    warn(`定义在根节点之外的文本：${text}将会被忽略掉`);
                }
                // 没有父节点的文本，压根就没有存在的意义，直接人道毁灭，不管他吧
                return;
            }

            // 在IE浏览器中的textarea的placeholder有一个bug,浏览器会将placeholder的内容会被作为textarea的文本节点放入到textarea中
            // 如果是这种情况框，直接忽略他吧，IE太难伺候了
            if (isIE &&
                currentParent.tag === 'textarea' &&
                currentParent.attrsMap.placeholder === text
            ) {
                return;
            }

            const children = currentParent.children;
            // 如果当前文本在pre标签里或者是文本去掉前后空白后依然不为空
            if (inPre || text.trim()) {
                // 如果父级标签是纯文本标签，那么解析出来的文本就是我们要的内容
                // 如果不是的话，需要进行一定的解码，这里使用的是一个第三方的html编解码库：he
                // he链接为：https://www.npmjs.com/package/he
                text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
            } else if (!children.length) {
                // 如果当前文本父级元素下面没有子节点的话并且当前文本删除前后空格之后为空字符串的话，我们就清空文本
                // 请注意，判断当前文本删除前后空格之后是否为空字符串是在上线的if语句中判断的，我刚开始看的时候不理解，
                // 为啥父元素没有子节点就要清空文本呢，那要是他是<div>这是一段文字</div>呢？原来是因为我漏了上面的if判断里面
                // 还有一个text.trim()，如果一个文本去除前后空白之后不为空的话，那他就应该进入到if的分支，而不会进入到这里。正是
                // 因为他去除空白之后是空的，所以才会进入到这个判断逻辑，那么，结果就很明显了，现在正在判断的情况是：
                // <div>        </div>，那么我们直接把text清空就可以了。
                text = '';

            } else if (options.whitespaceOption) {// 根据不同的去空白选项将空白去掉
                //   ``` html
                //      <!-- source -->
                //      <div>
                //        <span>
                //          foo
                //        </span>   <span>bar</span>
                //      </div>
                //
                //      <!-- whitespace: 'preserve' -->
                //      <div> <span>
                //        foo
                //        </span> <span>bar</span> </div>
                //
                //      <!-- whitespace: 'condense' -->
                //      <div><span> foo </span> <span>bar</span></div>
                //   ```
                if (options.whitespaceOption === 'condense') {
                    text = lineBreakRE.test(text) ? '' : ' '
                } else {
                    text = ' ';
                }
            } else {// 其他情况：看看是不是需要保留空格
                text = options.preserveWhitespace ? ' ' : '';
            }

            if (text) {
                // 如果不是在pre标签中且删除空白的选项是condense，则删除文本中的换行符
                if (!inPre && options.whitespaceOption === "condense") {
                    text = text.replace(whitespaceRE, '');
                }

                let res, elem;
                // 如果当前节点没有v-pre属性且是一个空白符并且可以解析出动态变量
                if (!inPre && text !== ' ' && (res = parseText(text, options.delimiters))) {
                    elem = createASTExpression(text, res.exp, res.tokens);
                } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
                    elem = createASTText(text);
                }
                // 将创建的文本节点或表达式节点加入到父级节点的children中
                if (elem) {
                    children.push(elem);
                }
            }

        },
        comment(text, startIndex, endIndex) {
            // 只有在根节点下创建注释才有效，只要不在根节点内部的注释都会被忽略
            if (currentParent) {
                let elem = createASTComment(text);
                currentParent.children.push(elem);
            }
        }
    });
    return root;
};

let warned = false;

function warnOnce(message) {
    if (!warned) {
        warn(message);
        warned = true;
    }
}

/**
 * 关闭标签并做一些收尾工作
 * @param elem
 */
export const closeElement = elem => {
    if(!elem) return;
    // 若当前元素不是pre元素，则删除元素尾部的空白文本节点
    trimEndingWhitespace(elem);

    // 如果当前标签没有v-pre并且没有编译过，则编译一下
    if (!inVPre && !elem.processed) {
        processElement(elem);
    }

    // 当我们的元素存储栈为空并且当前元素不是根节点时
    // 即模板中的元素都是自闭标签，如：
    // 正确的做法（由于加上了判断，因此，同时只可能有一个元素被输出）：<input v-if="value===1"/><img v-else-if="value===2"/><br v-else="value===3"/>
    // 错误的做法(因为vue模板始终需要一个根元素包裹，这里已经有三个元素了)：<input/><img/><br/>
    // 此时根节点root=input,但当前元素是br,由于元素都是自闭标签，因此不存在父子关系，大家都是平级，
    // 因此，也就不会想用于维护层级关系的nodeStack中添加元素
    if (!nodeStack.size() && root !== elem) {
        if (root.if && (elem.elseIf || elem.else)) {
            addIfCondition(root, {
                exp: elem.elseIf,
                block: elem
            });
        } else {
            warnOnce(`模板必须保证只有一个根元素，如果你想用v-if动态渲染元素，请将其他元素也用v-else-if串联成条件链`);
        }
    }

    // 如果不是根节点且不是script或style之类被禁止的标签的话
    if (currentParent && !elem.forbidden) {
        // 如果当前标签绑定有v-else-if或v-else,则需要解析一下
        if (elem.elseIf || elem.else) {
            processIfConditions(elem);
        } else {
            // 如果当前标签是一个作用域插槽
            if (elem.slotScope) {
                // 获取插槽名称
                const name = elem.slotTarget || '"default"';
                // 将它保留在子列表中，以便v-else(-if)条件可以
                // 找到它作为prev节点。
                (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = elem;
            }
            // 把当前元素加入到父级元素的子节点列表中，从而创建AST的父子层级关系
            currentParent.children.push(elem);
            // 同时也将当前节点的父级节点标记为当前的父级节点
            elem.parent = currentParent
        }
    }

    // 最后，因为作用域插槽并不是一个真实的标签，我们需要把他从子节点中移除掉
    elem.children = elem.children.filter(item => !item.slotScope);

    // 因为我们上线又操作过元素了，可能会在后面产生一些空白文本节点，我们再清理一下
    trimEndingWhitespace(elem);

    // 然后，因为我们的inVPre和inPre是公共变量，一个标签解析结束之后，需要重置一下，否则会影响下一个标签的解析
    if (elem.pre) {
        inVPre = false;
    }
    if (isPreTag(elem.tag)) {
        inPre = false;
    }
    // 注：vue还有这样一个不走，不过我看了一下，这个步骤好像只对weex环境才有注入方法postTransforms，因此此处就不实现了
    // // apply post-transforms
    // for (let i = 0; i < postTransforms.length; i++) {
    //   postTransforms[i](element, options)
    // }
};

/**
 * 若当前元素不是pre元素，则删除元素尾部的空白文本节点
 * @param elem
 */
function trimEndingWhitespace(elem) {
    if (inPre) {
        let lastNode;
        while (
            (lastNode = elem.children[elem.children.length - 1]) && // 节点存在
            lastNode.type === AST_ITEM_TYPE.TEXT && // 是文本节点
            lastNode.text === ' ' // 文本节点的内容是空白符
            ) {
            // 弹出该元素
            elem.children.pop();
        }
    }
}
