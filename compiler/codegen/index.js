// compiler/codegen/index.js 本文件实现了出事件代码片段生成器主体逻辑之外的其他情况的代码生成，如：元素代码片段生成、属性代码片段生成、v-for、v-if等特殊指令的代码生成等
import {extend, isA, isNative, isReservedTag, isUnDef, no, warn} from "../../shared/utils.js";
import baseDirectives from "../directives";
import {bindDynamicKeys} from "../../render-helpers/helpers/bind-dynamic-keys.js";
import {genHandlers} from "./event.js";
import {AST_ITEM_TYPE} from "../../shared/constants.js";
import VNode from "../../VDOM/VNode.js";

/**
 * 代码生成器的状态管理类
 */
export class CodegenState {
    // 编译器选项
    compilerOption;
    // 用于在代码生成阶段做一些拦截处理，我们暂时不需要他
    // transforms;
    // 用于生成data字符串表示形式，如：
    // function genData(el){
    //      let data = ''
    //      if (el.staticClass) {
    //        data += `staticClass:${el.staticClass},`
    //      }
    //      if (el.classBinding) {
    //        data += `class:${el.classBinding},`
    //      }
    //      return data
    // }
    // `staticClass:${el.staticClass},class:${el.classBinding},`
    // 最终生成的是：`staticClass:"box",class:"myclass",`类似这样的字符串
    dataGenFns;
    // 指令集，会将内置指令(on、bind、cloak)和用户指定一直都合并在这里
    directives;
    // 当前元素可能是一个组件，只是一个模糊的判断，只要节点上有component或者不是内置标签他就是true
    maybeComponent;
    // v-once生成代码时用于记录被渲染的次数
    onceId;
    // 用于渲染静态内容的函数数组
    staticRenderFns;
    // 节点是否有v-pre
    pre;

    constructor(options={}) {
        this.compilerOption = options;
        this.dataGenFns = [genData];
        this.directives = extend(extend({}, baseDirectives), options.directives);
        const isReservedTag = options.isReservedTag || no;
        this.maybeComponent = (elem) => !!elem.component || !isReservedTag(elem.tag);
        this.onceId = 0;
        this.staticRenderFns = [];
        this.pre = false
    }
}

/**
 * 代码生成器的入口
 * @param ast
 * @param options
 * @returns {{render: string, staticRenderFns: *}}
 */
export const generate = (ast, options) => {
    // 根据配置生成一个代码生成器状态类实例
    const state = new CodegenState(options);
    // 如果抽象语法树不为空，我们就用这个抽象语法树渲树生成代码，否则直接生成一个空的div
    const code = ast ? genElement(ast, state) : `_c('div')`;

    return {
        render: `with(this){return ${code}}`,
        staticRenderFns: state.staticRenderFns
    };
};

/**
 * 生成属性代码片段
 * @param ast
 * @param state
 * @returns {string}
 */
export const genData = (ast, state) => {
    let data = '{';

    // 先生成指令指令代码，因为指令可能会在其他属性生成之前发生改变
    const dirs = genDirectives(ast, state);
    dirs && (data += dirs + ',');

    // 生成key
    data += `key:${ast.key},`;

    // 生成ref
    data += `ref:${ast.ref},`;
    if (ast.refInFor) {
        data += `refInFor: true,`;
    }

    // 生成pre
    data += `pre:${ast.pre},`;

    // 组件名
    // 使用“is”属性记录组件的原始标签
    if (ast.component) {
        data += `tag:'${ast.tag}'`;
    }

    // 如果有集成进来的模块，运行模块的代码生成方法生成代码
    // for (let i = 0; i < state.dataGenFns.length; i++) {
    //     data += state.dataGenFns[i](ast);
    // }

    // 生成属性字符串
    if (ast.attrs) {
        data += `attrs:${genProps(ast.attrs)}`;
    }

    // 解析DOM props
    if (ast.props) {
        data += `domProps:${genProps(ast.props)}`;
    }

    // 生成事件处理函数代码片段
    if (ast.events) {
        data += `${genHandlers(ast.events, false)},`;
    }
    // 同理生成原生事件处理函数代码片段
    if (ast.nativeEvents) {
        data += `${genHandlers(ast.nativeEvents, true)},`;
    }

    // 插槽相关逻辑暂不实现
    // // only for non-scoped slots
    // if (ast.slotTarget && !ast.slotScope) {
    //     data += `slot:${ast.slotTarget},`
    // }
    // // scoped slots
    // if (ast.scopedSlots) {
    //     data += `${genScopedSlots(ast, ast.scopedSlots, state)},`
    // }

    // 如果有v-model
    if (ast.model) {
        data += `model:{value:${ast.model.value},callback:${ast.model.callback},expression:${ast.model.exp}},`;
    }

    // 内联模板
    if (ast.inlineTemplate) {
        const inlineTemplateCode = genInlineTemplate(ast, state);
        if (inlineTemplateCode) {
            data += inlineTemplateCode + ',';
        }
    }

    // 如果最后一个字符是逗号，把逗号删掉
    data = data.replace(/,$/, '');
    // 把最后的右括号封回去
    data += "}";


    // 基础的data对象已经封装好了，但如果v-bind存在动态参数的话，还需要用工具方法_b将动态参数处理一下整合到data中
    if (ast.dynamicAttrs) {
        data = `_b(${data},'${ast.tag}',${ast.dynamicAttrs})`;
    }

    // 如果v-on有定义数据包装器的话，用数据包装器处理一下
    if (ast.wrapData) {
        data = ast.wrapData(data);
    }
    // 如果v-bind有定义事件包装器的话，也用包装器处理一下
    if (ast.wrapListeners) {
        data = ast.wrapListeners(data);
    }

    return data;
};

/**
 * 创建内联模板代码片段
 * @param ast
 * @param state
 * @returns {string}
 */
export const genInlineTemplate = (ast, state) => {
    const child = ast.children[0];
    // 如果子节点的数量不是一个或者第一个子节点不是元素类型，则警告提示
    if (ast.children.length !== 1 || child.type !== AST_ITEM_TYPE.ELEMENT) {
        warn(`内联模板只能有一个元素标签作为子节点`);
    }
    if (child && child.type === AST_ITEM_TYPE.ELEMENT) {
        // 使用内联模板内唯一的元素节点构建渲染函数代码片段
        const inlineRenderFns = generate(child, state.options);
        return `inlineTemplate:{render:function(){${
            inlineRenderFns.render
            },staticRenderFns:[${
            inlineRenderFns.staticRenderFns.map(code => `function(){${code}}`).join(',')
            }]}`;
    }
};

/**
 * 生成属性代码片段
 * @param attrs
 * @returns {string}
 */
export const genProps = attrs => {
    // 由于属性分为静态属性和动态属性，两种属性生成的代码不一样，因此需要 分开处理
    let staticAttr = '';
    let dynamicAttr = '';

    for (let i = 0, l = attrs.length; i < l; i++) {
        const attr = attrs[i];
        // vue源码中根据是在weex环境还是web环境做了不同的处理，我们这边就只处理web环境的情况
        const value = transformSpecialNewlines(attr.value);

        if (attr.dynamic) {
            // 由于处理动态属性的时候，是需要借助工具方法_d也就是bindDynamicKeys处理的
            // 我们在这里拼接的参数实际上需要传给bindDynamicKeys这个方法的第二个参数values中
            // /**
            //  * 将动态属性绑定在目标对象上
            //  * @param {Object} elemAttrs     目标对象，通常是抽象语法树节点的attrs对象
            //  * @param {Array} values        动态属性键值数组，一般是这样的形式：[key1,value1,key2,value2]
            //  * @returns {*}
            //  */
            // export const bindDynamicKeys = (elemAttrs, values) => {...}
            // 如上可见，values是一个数组，他是键值成对按顺序排列的特殊数组
            // 所以，我们在这里拼接属性名和属性值的时候，他们之间不是用冒号，而是用逗号，就是为了拼接成类似 key1,value1,key2,value2, 这样的字符串
            dynamicAttr += `${attr.name},${attr.value},`;
        } else {
            staticAttr += `"${attr.name}": ${attr.value},`;
        }
    }

    // 所有属性都凭借好后，静态属性还需要将拼接好的字符串包裹在{},形成一个json对象
    staticAttr = `{${staticAttr.slice(0, -1)}}`;

    // 最后，如果存在动态属性，则交由_d辅助函数解析动态属性,将动态属性解析后合并到静态属性中去，如果不存在动态属性，则直接返回
    if (dynamicAttr) {
        return `_d(${staticAttr},[${dynamicAttr.slice(0, -1)}])`;
    } else {
        return staticAttr;
    }
};

/**
 * 将特殊换行胡转义
 * @param val
 * @returns {string}
 */
function transformSpecialNewlines(val) {
    return val
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

/**
 * 生成指令代码
 * @param ast
 * @param state
 * @returns {*}
 */
export const genDirectives = (ast, state) => {
    let dirs = ast.directives;
    if (!dirs) return;
    let res = 'directives:[';

    let hasRuntime = false;

    let i, l, needRuntime, dir;

    for (i = 0, l = dirs.length; i < l; i++) {
        dir = dirs[i];
        needRuntime = true;
        // 根据指令名称获取对应指令的代码生成器，内置只有on、bind、cloak三个
        const gen = state.directives[dir.name];
        if (gen) {
            // 如果找到了指定的代码生成器，用代码生成器生成代码，根据生成代码是否空，修正needRuntime
            needRuntime = !!gen(ast, dir);
        }
        if (needRuntime) {
            hasRuntime = true;
            res += `{name:"${dir.name}",rawName:"${dir.rawName}${
                dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.exp)}` : ''
                }${
                dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''
                }${
                dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
                }"},`;
        }
    }

    // 如果已经生成了运行时代码，才返回
    if (hasRuntime) {
        return res.slice(0, -1) + ']';
    }
};
/**
 * 生成元素代码片段
 * @param ast
 * @param state
 * @returns {*}
 */
export const genElement = (ast, state) => {
    // 如果当前元素存在父级，那么，如果他的父级被标记为v-pre，那么作为子元素的ast也肯定不会被编译的
    if (ast.parent) {
        ast.pre = ast.pre || ast.parent.pre;
    }
    // 如果当前元素是静态根节点并且没有被出合理过的话，处理一下
    if (ast.staticRoot && !ast.staticProcessed) {
        return genStatic(ast, state);
    } else if (ast.once && !ast.onceProcessed) {
        // 如果有未处理的v-once就处理一下
        return genOnce(ast, state);
    } else if (ast.for && !ast.forProcessed) {
        // 若存在未处理的v-for属性则处理
        return genFor(ast, state);
    } else if (ast.if && !ast.ifProcessed) {
        // 若存在未处理的v-if属性则处理一下
        return genIf(ast, state);
    } else if (ast.tag === 'template' && !ast.slotTarget && !state.pre) {
        // 若是非插槽模板标签并且没有v-pre属性修饰，则对子节点进行处理
        return genChildren(ast, state) || `void 0`;
    } else if (ast.tag === "slot") {
        // 暂不实现插槽功能
        return '';
    } else {
        let code;
        // 如果不是上面的情况，那么，说明节点有可能是一个组件或是一个普通元素
        if (ast.component) {
            code = genComponent(ast.component, ast, state);
        } else {
            let data;
            // 如果ast不是一个普通元素或者他虽然有v-pre属性，但他可能是一个组件，我们就需要解析他的data
            if (!ast.plain || (ast.pre && state.maybeComponent(ast))) {
                data = genData(ast, state)
            }
            const children = ast.inlineTemplate ? null : genChildren(ast, state, true);

            // 代码生成
            code = `_c('${ast.tag}'${
                data ? `,${data}` : ',{}'
                }${
                children ? `,${children}` : ''
                })`;

            // vue源码中一步是transforms
            // 用于在代码生成阶段做一些拦截处理，我们暂时不需要他
        }
        return code;
    }
};

/**
 * 组件代码构建器
 * @param componentName 实际上就是ast.component
 * @param ast
 * @param state
 * @returns {string}
 */
export const genComponent = (componentName, ast, state) => {
    const children = ast.inlineTemplate ? null : genChildren(ast, state, true /*因为我们确定他就是一个组件，因此直接跳过检查即可*/);
    // _c=createElemVNode
    // /**
    //  * 创建一个元素节点
    //  * 通过此节点最终创建出来的dom节点如：
    //  * 调用：createElemVNode('p',{className:"tips",style:"color: red;"},[createEmptyVNode('这个操作很6呀'),createTextVNode('只是一个温馨提示')])
    //  * 输出：<p class="tips" style="color: red;"><!-- 这个操作很6呀 -->只是一个温馨提示</p>
    //  * @param tag           所创建的dom节点的标签名，如要创建div标签，则tag为 div
    //  * @param data          节点所包含的数据对象，包括大不限于节点的属性attrs、类名class、行间样式style等
    //  * @param children      该节点的子节点列表，是一个VNode数组
    //  * @param context       当前节点在Vue中的实例
    //  * @returns {VNode}
    //  */
    // export const createElemVNode = (tag,data,children,context) => new VNode({tag,data,children,context});
    return `_c(${componentName},${genData(ast, state)}${
        ast.children ? `,${children}` : ''
        })`;
};

/**
 * 子节点代码构建器
 * @param ast
 * @param state
 * @param skipCheck         是否需要跳过检查元素是否可能是数组，用于确定规格化等级
 * @param altGenElement     自定义元素构建器
 * @param altGenNode        自定义节点构建器
 * @returns {string}
 */
export const genChildren = (ast, state, skipCheck, altGenElement, altGenNode) => {
    const children = ast.children;
    // 只处理有子节点的情况
    if (children.length) {
        const child = children[0];

        // 如果只有一个非template和slot的子节点并且带有v-for属性的话，对这样的情况做一下优化出合理
        if (children.length === 1 && child.for && !["template", "slot"].includes(child.tag)) {
            // 如果没有强制指定跳过检查当前子节点是否是组件的话，那么，判断当且节点是否有可能是一个组件，
            // 如果是，则规格化类型为1,即需要被部分规格化，如果不是，则规格化类型为0，即完全不需要规格化
            let normalizationType = skipCheck ? state.maybeComponent(ast) ? ',1' : ',0' : '';
            return `${(altGenElement || genElement)(ast, state)}${normalizationType}`;
        }

        // 如果没有强制指定跳过检查当前子节点是否是组件的话，那么根据子节点的不同情况判断应该使用何种规格化等级
        // 如果跳过检查的话，规格化等级为0
        const normalizationType = skipCheck ? getNormalizationType(children, state.maybeComponent) : 0;

        // 如果有指定代码构建器，则使用指定的构建器，否则默认使用节点构建器
        const gen = altGenNode || genNode;

        return `[${children.map(elem => gen(elem, state)).join(',')}]${
            normalizationType ? `,${normalizationType}` : ''
            }`;
    }
};

/**
 * 注释代码构建器
 * @param ast
 * @param state
 * @returns {string}
 */
export const genComment = (ast, state) => {
    // _e=createEmptyVNode
    // /**
    //  * 创建一个注释节点
    //  * 通过此节点最终创建出来的dom节点如：
    //  * 调用：createEmptyVNode('注释节点')
    //  * 输出：<!-- 注释节点 -->
    //  * @param content       注释节点的文本内容
    //  * @returns {VNode}
    //  */
    // export const createEmptyVNode = content => new VNode({text: content, comment: true});
    return `_e(${JSON.stringify(ast.text)})`;
};

/**
 * 文本代码构建器
 * @param ast
 * @param state
 * @returns {string}
 */
export const genText = (ast, state) => {
    // 如果是文本节点，我们还要看一下是不是有表达式
    // _v=createTextVNode
    // /**
    //  * 创建一个文本节点
    //  * 通过此节点最终创建出来的dom节点如：
    //  * 调用：createTextVNode('文本节点')
    //  * 输出：文本节点
    //  * @param content
    //  * @returns {VNode}
    //  */
    // export const createTextVNode = content => new VNode({text: String(content)});
    return `_v(${ast.type === AST_ITEM_TYPE.EXPRESSION ? ast.exp : transformSpecialNewlines(JSON.stringify(ast.text))})`;
};

/**
 * 根据节点类型不同判断使用哪一种代码构建器
 * @param ast
 * @param state
 * @returns {*}
 */
function genNode(ast, state) {
    // 根据节点类型不同采用不同的代码构建器
    switch (ast.type) {
        case AST_ITEM_TYPE.ELEMENT:
            return genElement(ast, state);
        case AST_ITEM_TYPE.COMMENT:
            return genComment(ast, state);
        default:
            return genText(ast, state);
    }
}

/**
 * 循环子节点判断需要的规格化等级
 * @param children
 * @param maybeComponent       用于判断一个节点是否可能是一个组件
 * @returns {number}
 */
function getNormalizationType(children, maybeComponent) {
    let res = 0;// 默认为0，即完全不需要规格化
    let l = children.length, i = 0;
    while (i < l) {
        let child = children[i];
        i++;
        // 如果子节点类型不是元素的，那就看继续下一次子节点
        if (child.type !== AST_ITEM_TYPE.ELEMENT) {
            continue;
        }
        // 如果当前子节点需要被规格化或者是如果当前子节点有if分支，那么他的分支节点至少有一个需要被规格化的话，设置它的规格化等级为2，即需要全部规格化
        if (needsNormalization(child) || (child.ifConditions && child.ifConditions.some(item => needsNormalization(item.block)))) {
            res = 2;
            break;
        }
        // 如果当前子节点可能是一个组件或者当前子节点有if分支的话，他的分支节点是否至少有一个可能是组件，如果是的话，设置他的规格化等级为1，即部分需要规格化
        if (maybeComponent(child) || (child.ifConditions && child.ifConditions.some(item => maybeComponent(item.block)))) {
            res = 1;
            break;
        }

    }
    return res;
}

/**
 * 判断目标节点是否需要规格化
 * @param ast
 * @returns {boolean}
 */
function needsNormalization(ast) {
    return isUnDef(ast.for) || ast.tag === "template" || ast.tag === "slot";
}

/**
 * 生成v-for相关代码片段
 * @param ast           抽象语法树节点
 * @param state         当前状态
 * @param altGen        原始代码构造器，构建代码时用这个方法构建
 * @param altHelper     迭代方法，若明确指定，则用这个方法，否则使用_l方法迭代
 * @returns {string}
 */
export const genFor = (ast, state, altGen, altHelper) => {
    ast.forProcessed = true;

    const exp = ast.for;
    const alias = ast.alias;
    const iterator1 = ast.iterator1 ? `,${ast.iterator1}` : '';
    const iterator2 = ast.iterator2 ? `,${ast.iterator2}` : '';


    // 用于循环列表的方法，如果指定方法则直接用指定的altHelper，
    // 否则用默认的工具函数_l=renderList
    // /**
    //  * 用于在运行时渲染v-for
    //  * @param val       带渲染目标值
    //  * @param render    渲染函数
    //  */
    // export const renderList = (val, render) => {
    const renderList = altHelper || `_l`;
    // 若有提供代码构建器则用提供的代码构建器，否则使用元素构建器
    const gen = altGen || genElement;

    return `${renderList}((${exp}),function(${alias}${iterator1}${iterator2}){return ${
        gen(ast, state)
    }})`;
};

/**
 * 生成带有v-once属性相关的代码片段
 * @param ast
 * @param state
 * @returns {*}
 */
export const genOnce = (ast, state) => {
    // 标记为已处理，以免重复处理
    ast.onceProcessed = true;

    // 如果当前节点存在未处理的if语句
    if (ast.if && !ast.ifProcessed) {
        return genIf(ast, state);
    } else if (ast.staticInFor) {// 如果当前节点是在for循环中的静态代码
        // 我们不断往上查找父级，直至查找到for标签定义的节点位置
        let parent = ast.parent;
        let key = '';// 因为在for循环如果要使用v-once语句，则必须添加key用于区分，记录下key值以便后续判断
        while (parent) {
            if (parent.for) {
                key = parent.key;
            }
            parent = parent.parent;
        }
        if (!key) {
            warn(`for循环如果要使用v-once语句，则必须添加key。`);
            // 没有key,没办法创建once,直接创建一个普通元素返回
            return genElement(ast, state);
        }

        // 如果有key的话，那我们就可以调用工具方法生成once的代码片段了
        // _o=markOnce
        // /**
        //  * 标记一个仅仅渲染一次的节点
        //  * @param tree
        //  * @param index
        //  * @param key
        //  * @returns {Array<VNode>|VNode}
        //  */
        // export const markOnce = function (tree, index, key) {...}
        return `_o(${genElement(ast, state)},${state.onceId++},${key})`;
    } else {// 如果不是上面的情况，说明就是普通的静态节点
        return genStatic(ast, state);
    }
};

/**
 * 生成if语句代码片段
 * @param ast           当前抽象语法树节点
 * @param state         当前状态
 * @param altGen        原始代码生成器，即谁调用genIf，便是谁
 * @param altEmpty      原始的空代码片段，如："null"
 * @returns {*}
 */
export const genIf = (ast, state, altGen, altEmpty) => {
    ast.ifProcessed = true;
    return genIfConditions(ast.ifConditions,state, altGen, altEmpty);
};

/**
 * 生成if分支语句代码片段
 * 生成三目表达式语句
 * @param conditions        if条件分支数组
 * @param state             当前状态
 * @param altGen            原始代码生成器，即谁调用genIf，便是谁
 * @param altEmpty          原始的空代码片段，如："null"
 * @returns {*}
 */
export const genIfConditions = (conditions, state, altGen, altEmpty) => {
    // 如果if没有分支条件，就返回指定的空分支代码，如"null"，若没指定空分支代码，则调用工具方法生成一个空节点
    // _c=createEmptyVNode
    // /**
    //  * 创建一个注释节点
    //  * 通过此节点最终创建出来的dom节点如：
    //  * 调用：createEmptyVNode('注释节点')
    //  * 输出：<!-- 注释节点 -->
    //  * @param content       注释节点的文本内容
    //  * @returns {VNode}
    //  */
    // export const createEmptyVNode = content => new VNode({text: content, comment: true});
    if (!conditions.length) {
        return altEmpty || `_c()`;
    }

    // 每次取出一个条件出来，递归调用genIfConditions直至所有条件都已经放入到三目表达式中
    const condition = conditions.shift();
    if (condition.exp) {
        // 如果存在表达式
        return `(${condition.exp})?(${genTernaryExp(condition.block)}):(${genIfConditions(conditions, state, altGen, altEmpty)})`;
    } else {
        return `${genTernaryExp(condition.block)}`;
    }

    // 带有v-once的v-if分支将编译成类似这样的代码：(a)?_m(0):_m(1)
    function genTernaryExp(elem) {
        let gen = altGen || elem.once ? genOnce : genElement;
        return gen(elem, state);
    }
};

/**
 * 生成静态节点代码片段
 * @param ast
 * @param state
 * @returns {string}
 */
export const genStatic = (ast, state) => {
    // 将当前ast标记为已经处理静态节点，以免重复处理
    ast.staticProcessed = true;
    // 先把当前状态的pre缓存起来
    let originalPre = state.pre;
    // 如果当前节点被标记为v-pre了，那么我们就一当前节点是否有v-pre为生成静态渲染函数
    if (ast.pre) {
        state.pre = ast.pre;
    }
    state.staticRenderFns.push(`with(this){return ${genElement(ast, state)}}`);
    // 生成之后，将状态中的pre恢复
    state.pre = originalPre;
    // _m=renderStatic
    // /**
    //  * 渲染一个静态节点
    //  * @param index     当前静态节点的索引
    //  * @param isInFor   是否在v-for循环中
    //  * @returns {Array<VNode>|VNode}
    //  */
    // export const renderStatic = function(index, isInFor) {...}
    return `_m(${
    state.staticRenderFns.length - 1
        }${
        ast.staticInFor ? ',true' : ''
        })`;
};
