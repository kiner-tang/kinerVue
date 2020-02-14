import {parseFilter} from "./filter-paser.js";
import {
    camelize,
    emptyObject,
    extend,
    hasDynamicAttr, hyphenate,
    isA,
    mustUseProp,
    parseStyleText,
    warn
} from "../shared/utils.js";
import {cloneAstElement} from "./Ast.js";
import {
    argRE,
    bindRE,
    dirRE,
    dynamicArgRE,
    forAliasRE,
    forIteratorRE,
    modifierRE,
    onRE,
    propBindRE,
    stripParensRE
} from "../shared/RE.js";
import {genAssignmentCode} from "./directives/model.js";
import {AST_ITEM_TYPE} from "../shared/constants.js";

export const preTransformNode = (elem, options) => {
    const {tag, attrsMap} = elem;
    // 当且仅当标签名是input且有绑定v-model属性时需要预处理
    if (tag === 'input' && attrsMap['v-model']) {

        // 获取动态绑定的类型
        let targetAttrName = 'type';
        let typeBindingValue;
        // 若attrsMap中存在动态绑定的type属性，则直接获取该属性表达式
        if (hasDynamicAttr(elem, targetAttrName)) {
            typeBindingValue = getBindingAttr(elem, targetAttrName);
        }
        // 若attrsMap中既不存在静态属性type，也不存在动态属性type,但存在使用v-bind绑定的属性，
        // 那么，我们尝试从v-bind绑定的对象中看看能不能找到目标type
        // e.g.
        // <div v-bind="{type:'checkbox', title:'is a checkbox'}"></div>
        // 将被解析为：
        // <div title="kiner" type="home"></div>
        // 因此，在没办法直接找到动态属性:type也没办法直接找到静态属性type时，便可尝试在v-bind锁绑定的对象下寻找看看
        if (!attrsMap[targetAttrName] && !typeBindingValue || attrsMap['v-bind']) {
            typeBindingValue = `(${attrsMap['v-bind']}).${targetAttrName}`;
        }

        // 如果经过上面两轮查找都没有找到type,那就不用找了，使用者压根就没有绑定type，直接退出即可
        if (typeBindingValue !== null) {
            return;
        }

        // 从attrsMap中尝试获取if条件语句
        // 因为此处已经预先将v-if解析了，因此以后的代码生成其实也已经用不到v-if这个属性了，
        // 因此，将条件表达式拿出来之后，便直接同时将attrList和attrsMap中的响应属性删除即可
        const ifCondition = getAndRemoveAttr(elem, 'v-if', true);
        // 拿到v-if的表达式后，
        // 如果存在该表达式，将该表达式转化为代码生成表达式片段，以便之后生成渲染函数
        // 如果不存在，就直接赋值为空字符串
        // 那么，要如何生成代码片段呢？因为条件语句使用与判断用的，因此，我们直接把条件语句的表达式放入到一个短路语句中，
        // 那么，由于我们针对checkbox和radio类型的input需要做特殊处理，因此，之后还需要判断typeBindingValue是不是等于checkbox或radio
        // 只有类型是checkbox或radio走后面的逻辑才有意义
        // e.g.
        // 假设：data={formData:{checkbox: 0, radio: 1}, type: 'checkbox'}
        // 假设模板为：<input :type="type" v-model="formData[type]"/>
        // 那么，我们编译输出的结果应该是这样的：
        //
        // <input v-if="type === 'checkbox'" type="checkbox" v-model="formData[type]">
        // <input v-else-if="type === 'radio'" type="radio" v-model="formData[type]">
        // <input v-else :type="type" v-model="formData[type]">
        //
        // 因此，除了模板自身自带的条件语句表达式ifCondition外，我们还需要在这个条件之前加上一些前置条件用来判断input的类型
        // 所以我们在这里用一个&&将多个条件连接成一个短路语句
        const ifConditionCodeFragment = ifCondition ? `&&(${ifCondition})` : ``;
        // 看看有没有v-else-if语句
        const elseIfCondition = getAndRemoveAttr(elem, 'v-else-if', true);
        // 看看有没有v-else语句,由于v-else语句没有表达式，因此我们只要看看有没有这个属性即可，不用看他的值是否存在
        const elseConfition = getAndRemoveAttr(elem, 'v-else', true) !== null;

        //// 如果当前elem是checkbox的情况

        // 克隆一份当前的抽象语法树节点用于操作，避免影响到原先的节点
        const branch0 = cloneAstElement(elem);

        // 处理虚拟节点中的v-for的情况
        processFor(branch0);
        // 在克隆出来的新节点上加上原生type为checkbox
        addRawAttr(branch0, targetAttrName, 'checkbox');
        // 解析处理虚拟节点标签
        processElement(branch0, options);
        // 如果通过双线程处理，可能会导致重复解析，因此将其标记为已解析了
        branch0.processed = true;
        // 拼接条件语句，用于判断当前元素是否是一个checkbox
        branch0.if = `(${typeBindingValue})==='checkbox'` + ifConditionCodeFragment;

        // 将拼接好的条件语句加入到抽象语法树节点中
        addIfCondition(branch0, {
            exp: branch0.if,
            block: branch0
        });

        //// 如果当前elem是radio的情况
        // 同理处理radio
        const branch1 = cloneAstElement(elem);
        // 这句代码的意义就是单纯的将克隆出来的元素描述对象中的 v-for 属性移除掉，
        // 因为在复选按钮中已经使用 processFor 处理过了 v-for 指令，由于它们本是互斥的，
        // 其本质上等价于是同一个元素，只是根据不同的条件渲染不同的标签罢了，所以 v-for 指令处理一次就够了。
        getAndRemoveAttr(elem, 'v-for', true);
        // 将新克隆出来的节点标记为radio
        addRawAttr(branch1, 'type', 'radio');
        // 解析处理元素
        processElement(elem, options);
        // 将当前节点的判断加入到branch0的条件语句中
        addIfCondition(branch0, {
            exp: `(${typeBindingValue})==='radio'` + ifConditionCodeFragment,
            block: branch1
        });

        //// 如果当前elem是其他类型的input
        const branch2 = cloneAstElement(elem);
        getAndRemoveAttr(branch2, 'v-for', true);
        addRawAttr(branch2, ':type', typeBindingValue);
        processElement(branch2, options);
        addIfCondition(branch0, {
            exp: ifCondition,
            block: branch2
        });

        // 如果元素省本身就含有v-else或v-else-if,那么将他们记录起来
        branch0.else = elseConfition;
        (elseIfCondition && (branch0.elseIf = elseIfCondition));

        // 已经将需要预处理的情况都预处理好了，将处理好的branch0返回即可
        return branch0;

    }
};


/**
 * 获取抽象语法树节点上绑定的指定属性值，并同时将该属性从attrList中移除
 * 本方法同时支持获取动态属性与静态属性，因此，要获取属性值时，传入的attrName无需带上动态属性符号:或v-bind等
 * e.g.
 * 需要获取 <div :type='type' title='title'></div> 的:type属性和title属性，则只需要分别调用：
 * getBindingAttr(elem, 'type');    =>  返回值： type
 * getBindingAttr(elem, 'title');   =>  返回值： title
 * @param elem
 * @param attrName
 * @param getStatic     当取不到动态属性是，是否尝试获取静态属性，默认为true
 * @returns {*}
 */
export const getBindingAttr = (elem, attrName, getStatic = true) => {
    // 获取动态属性值的同时把改动态属性从attrList中删除掉，以免后面重复解析
    const dynamicValue = getAndRemoveAttr(elem, `:${attrName}`) || getAndRemoveAttr(elem, `v-bind:${attrName}`);

    // 如果动态属性值存在，说明确实是一个动态属性
    if (dynamicValue) {
        // 如果是动态属性值，还需要看看这个值有没有使用过滤器，如果有，我们还需要解析过滤器
        return parseFilter(dynamicValue);
    } else if (getStatic) {
        // 如果动态属性值不存在的话，说明要获取的属性可能是一个静态的属性，我们尝试获取一下静态属性看看能不能获取得到，
        // 如果可以，就把静态舒缓型获取回来并在attrList中删除该属性，并将该属性值返回
        let staticValue = getAndRemoveAttr(elem, attrName);
        if (staticValue) {
            return JSON.stringify(staticValue);
        }

    }
};

/**
 * 根据属性名从抽象语法树节点的rawAttrsMap中获取属性值
 * @param elem
 * @param attrName
 * @returns {*}
 */
export const getRawBindingAttr = (elem, attrName) => {
    return elem.rawAttrsMap[`:${attrName}`] || elem.rawAttrsMap[`v-bind:${attrName}`] || elem.rawAttrsMap[attrName];
};

/**
 * 获取属性值并将该属性值从抽象语法树节点的attrList中移除
 * 注意：只有当我们明确要求要将该属性从attrsMap中移除时才将该属性从attrsMap中移除，
 * 否则仅仅只需要从attrList中移除就可以了，因为我们再代码生成阶段还需要用到attrsMap中的属性数据
 * @param elem
 * @param attrName
 * @param removeFromMap
 * @returns {*}
 */
export const getAndRemoveAttr = (elem, attrName, removeFromMap) => {
    let attrVal;
    // 只有属性存在才执行
    if ((attrVal = elem.attrsMap[attrName]) !== null) {
        // 从attrList中查找并删除后该属性
        let list = elem.attrList;
        for (let i = 0, l = list.length; i < l; i++) {
            if (list[i].name === attrName) {
                list.splice(i, 1);
                break;
            }
        }
    }
    // 只有明确要求需要从map中删除属性时才从map中删除
    if (removeFromMap) {
        delete elem.attrsMap[attrName];
    }
    return attrVal;
};

/**
 * 为抽象语法树节点增加一个原生的属性
 * @param elem      待插入属性的元素
 * @param name      属性名
 * @param value     属性值
 * @param range     插入的位置 range.startIndex~range.endIndex
 */
export const addRawAttr = (elem, name, value, range) => {
    elem.attrList.push(setItemWithRange({name, value}, range));
    elem.attrsMap[name] = value;
};

/**
 * 在抽象语法树节点中增加条件语句描述
 * @param elem
 * @param condition
 * @param range
 */
export const addIfCondition = (elem, condition, range) => {
    (elem.ifConditions || (elem.ifConditions = [])).push(setItemWithRange(addIfCondition, range));
};

/**
 * 插入一个属性（使用setAttribute方式）
 * @param elem      待插入属性的元素
 * @param name      属性名
 * @param value     属性值
 * @param range     插入的位置 range.startIndex~range.endIndex
 * @param dynamic   插入的是否是动态属性
 */
export const addAttr = (elem, name, value, range, dynamic) => {
    // 如果要插入的属性是动态属性，则获取动态属性列表（不存在则新建），否则获取静态属性列表（不存在则新建）
    const attrs = dynamic ? (elem.dynamicAttrs || (elem.dynamicAttrs = [])) : (elem.attrs || (elem.attrs = []));
    // 将要添加的属性加入到目标属性列表中
    attrs.push(setItemWithRange({name, value, dynamic}, range));
    // 因为已经动态插入属性了，所以当前元素不再是一个普通元素
    elem.plain = false;
};
/**
 * 插入一个属性（使用props方式）
 * @param elem
 * @param name
 * @param value
 * @param range
 * @param dynamic
 */
export const addProp = (elem, name, value, range, dynamic) => {
    // 将属性加入到抽象语法树节点的props列表中（不存在props列表则新建）
    (elem.props || (elem.props = [])).push(setItemWithRange({name, value, dynamic}, range));
    // 新增了指令，当前元素不再是普通元素
    elem.plain = false;
};

/**
 * 插入一个指令
 * @param elem          待插入指令的元素
 * @param name          指令名称（将一些修饰符解析后删除掉了）
 * @param rawName       指令原始名称
 * @param value         指令表达式
 * @param arg           指令的参数
 * @param dynamic       参数是否是动态的
 * @param modifier      修饰符
 * @param range         插入范围
 */
export const addDirective = (elem, name, rawName, value, arg, dynamic, modifier, range) => {
    // 将指令加入到抽象语法树节点的指令列表中（不存在指令列表则新建）
    (elem.directives || (elem.directives = [])).push(setItemWithRange({}, range));
    // 新增了指令，当前元素不再是普通元素
    elem.plain = false;
};

/**
 * 属性修饰符与修饰标记对照map
 * @type {{capture: string, passive: string, once: string}}
 */
export const mapModifierSymbol = {
    capture: "!",
    passive: "&",
    once: "~"
};

/**
 * 添加事件绑定
 * @param elem
 * @param name
 * @param value
 * @param range
 * @param dynamic
 * @param modifiers
 * @param important
 */
export const addHandler = (elem, name, value, range, dynamic, modifiers, important) => {
    modifiers = modifiers || emptyObject;
    // 以下为所有修饰符的对照
    // .stop - 调用 event.stopPropagation()。
    // .prevent - 调用 event.preventDefault()。
    // .capture - 添加事件侦听器时使用 capture 模式。
    // .self - 只当事件是从侦听器绑定的元素本身触发时才触发回调。
    // .{keyCode | keyAlias} - 只当事件是从特定键触发时才触发回调。
    // .native - 监听组件根元素的原生事件。
    // .once - 只触发一次回调。
    // .left - (2.2.0) 只当点击鼠标左键时触发。
    // .right - (2.2.0) 只当点击鼠标右键时触发。
    // .middle - (2.2.0) 只当点击鼠标中键时触发。
    // .passive - (2.3.0) 以 { passive: true } 模式添加侦听器

    // 如果在一个事件中同事使用prevent和passive两种修饰符，则警告提示
    if (modifiers.prevent && modifiers.passive) {
        warn(`同一个事件不能同时绑定'prevent'和'passive'修饰符，因为他们是互斥的`);
    }
    // 对点击事件的修饰符进行规格化处理使得"click.right"和"click.middle"不会相互冲突
    // 这是只针对浏览器的一个操作，但至少到目前为止的浏览器都是支持右键点击或中键点击中的一种的
    if (modifiers.right) {// 当有定义右键点击修饰符时
        if (dynamic) {
            // 如果事件名称是动态的，那么我们没办法直接得到他的事件名
            // 只能通过生成一串表达式，在运行时进行判断是否是点击事件
            // 如果事件名是点击事件，那么因为指定了right修饰符，说明监听的是右键点击
            // 而通常情况下，右键点击都是触发contextmenu(右键菜单)显示的
            name = `(${name})==='click'?'contextmenu':'${name}'`;
        } else if (name === 'click') {
            // 如果事件名不是动态的，那么当事件名是click时直接将当前事件名该为contextmenu，并删除右键修饰符即可
            name = 'contextmenu';
            // 之所以要删除右键修饰符是因为上面已经解释了，在浏览器中，目前为止只能支持监听右键点击或中建点击中的一种
            // 我们已经把右键点击修饰符转换为使用contextmenu事件名进行描述了，也就不需要right这个修饰符了
            delete modifiers.right;
        }
    } else if (modifiers.middle) {
        if (dynamic) {
            // 如果动态属性，则生成一串表达式在运行时判断是否是点击事件，如果是的话将事件面修正为mouseup
            name = `(${name})==='click'?'mouseup':(${name})`
        } else if (name === 'click') {
            // 非动态属性名则直接修正即可
            name = 'mouseup'
        }
    }


    // 对于capture、once、passive这三个修饰符，vue在编译时会分别将他们转换为一个修饰符号缀在事件名之前
    // e.g.
    // <div @click.capture="handle"></div>  => {"!click": handle}
    // <div @click.once="handle"></div>  => {"~click": handle}
    // <div @click.passive="handle"></div>  => {"&click": handle}
    // 对capture修饰符的处理
    if (modifiers.capture) {
        // 对事件名进行修正，修正为"!eventName"
        name = prependModifierMarker(mapModifierSymbol["capture"], name, dynamic);
        // 已经修正完事件名，删除修饰符
        delete modifiers.capture;
    }
    if (modifiers.passive) {
        // 对事件名进行修正，修正为"&eventName"
        name = prependModifierMarker(mapModifierSymbol["passive"], name, dynamic);
        // 已经修正完事件名，删除修饰符
        delete modifiers.passive;
    }
    if (modifiers.once) {
        // 对事件名进行修正，修正为"~eventName"
        name = prependModifierMarker(mapModifierSymbol["once"], name, dynamic);
        // 已经修正完事件名，删除修饰符
        delete modifiers.once;
    }

    // 事件对象
    let events;

    // 如果有native修饰符，说明希望触发的是原生的事件，而非vue的包装事件
    if (modifiers.native) {
        events = elem.nativeEvents || (elem.nativeEvents = {});
        // 已经获得了原生事件对象，将native修饰符删除
        delete modifiers.native;
    } else {
        // 未指定native,则返回一个vue的events对象
        events = elem.events || (elem.events = {});
    }

    // 创建一个handler对象
    const handler = setItemWithRange({value: value.trim(), dynamic}, range);

    // 如果存在修饰符，则把修饰符也挂载到这个handler对象上
    modifiers !== emptyObject && (handler.modifiers = modifiers);

    // 将当前事件的事件队列取出来
    const handlers = events[name];

    if (isA(handlers)) { // 如果当前事件的事件队列已经存在并且是一个数组
        // 根据重要性选择新事件加入的位置，如果指定了important且不为false,则将当前事件放在事件队列的最前面，反之放在最后面
        important ? handlers.unshift(handler) : handlers.push(handler);
    } else if (handlers) { // 如果当前事件的事件队列不是一个数组，但是是一个对象
        // 根据重要性选择新事件加入的位置，如果指定了important且不为false,则将当前事件放在事件队列的最前面，反之放在最后面
        events[name] = important ? [handler, handlers] : [handlers, handler];
    } else { // 如果当前事件的事件队列不存在，那么直接把创建的handler对象复制给他
        events[name] = handler;
    }

    // 事件处理完了，当前抽象语法树节点已经不再是普通元素了，修正一下
    elem.plain = false;
};


/**
 * 为事件名修饰标记
 * @param symbol        修饰标记符号：capture=>!  once=>~     passive=>&
 * @param eventName     事件名
 * @param isDynamic     是否动态属性名
 * @returns {string}
 */
export const prependModifierMarker = (symbol, eventName, isDynamic) => {
    return isDynamic ? `_p(${eventName},"${symbol}")` : symbol + eventName;
};

/**
 * 为待处理的元素设置他应该插入的源码所在的位置
 * @param item
 * @param range
 * @returns {*}
 */
export const setItemWithRange = (item, range) => {
    if (range) {
        if (range.startIndex !== null) {
            item.startIndex = range.startIndex;
        }
        if (range.endIndex !== null) {
            item.endIndex = range.endIndex;
        }
    }
    return item;
};

/**
 * 解析v-pre
 * 若当前元素含有v-pre指令，则在元素上标记pre为true
 * @param elem
 */
export const processPre = elem => {
    (getAndRemoveAttr(elem, 'v-pre') !== null) && (elem.pre = true);
};

/**
 * 处理原始属性
 * @param elem
 */
export const processRawAttrs = elem => {
    let {attrList} = elem;
    let len = attrList.length;
    // 如果在attrList中存在属性的话，将他都赋值到elem.attrs中去
    if (len) {
        const attrs = elem.attrs = new Array(len);
        while (len--) {
            attrs[len] = {
                name: attrList[len].name,
                value: JSON.stringify(attrList[len].value)
            };
            if (attrList[len].startIndex !== null) {
                attrs[len].startIndex = attrList[len].startIndex;
                attrs[len].endIndex = attrList[len].endIndex;
            }
        }
    } else if (!elem.pre) {// 如果元素不是没有v-pre属性并且没有任何其他属性的话，说明这个元素是个普通的元素
        elem.plain = true;
    }
};

/**
 * 对v-for语句进行处理
 * @param elem
 */
export const processFor = (elem) => {
    let exp;// v-for的表达式,只有当表达式不为空时才需要解析
    if ((exp = getAndRemoveAttr(elem, 'v-for')) !== null) {
        // 解析表达式
        let res = parseFor(exp);
        if (res) {
            // 如果表达式解析成功，说明是一个合法的v-for表达式，则将解析出来的for语句描述对象合并到抽象语法树节点中
            extend(elem, res);
        } else {
            // 解析失败，说明表达式错误，警告提示
            warn(`您在标签${elem.tag}上绑定的v-for="${exp}"存在语法错误，请检查并修正错误`);
        }
    }
};

/**
 * 处理once的情况
 * @param elem
 */
export const processOnce = (elem) => {
    let once;
    (once = getAndRemoveAttr(elem, 'v-once')) && (elem.once = true);
};

/**
 * 处理v-if的情况
 * @param elem
 */
export const processIf = elem => {
    // 从attrList读取盈移除v-if
    let exp = getAndRemoveAttr(elem, 'v-if');
    if(exp){// 如果存在v-if,就将其描述信息添加到当前节点的ifConditions中
        elem.if = exp;
        addIfCondition(elem, {
            exp,
            block: elem
        });
    }else{// 不存在v-if，再看看有没有v-else-if或v-else
        let elseIf;
        (elseIf = getAndRemoveAttr(elem, 'v-else-if')) && (elem.elseIf = elseIf);
        (getAndRemoveAttr(elem, 'v-else') != null) && (elem.eles = true);
    }
};

/**
 * 查找上一个元素
 * 如果放在v-if和v-else[-if]之间的文本节点将被忽略掉
 * @param elems
 * @returns {*}
 */
const findPrevElem = (elems) => {
    let i = elems.length;
    while (i--){
        if(elems[i].type===AST_ITEM_TYPE.ELEMENT){
            return elems[i];
        }else if(elems[i].text === ' '){
            warn(`放在v-if和v-else[-if]之间的文本节点将被忽略掉，文本内容：${elems[i].text.trim()}`);
            elems.pop();
        }
    }

};

/**
 * 处理if条件分支
 * @param elem
 * @param parent
 */
export const processIfConditions = (elem, parent) => {
    const prevElem = findPrevElem(parent.children);
    // 如果找到了上一个元素并且上一个元素绑定了v-if，说明是合法的条件语句链
    if(prevElem && prevElem.if){
        addIfCondition(prevElem, {
            exp: elem.elseIf,
            block: elem
        })
    }else{
        warn(`在元素：${elem.tag}上定义了v-${elem.elseIf ? ('else-if="' + elem.elseIf + '"') : 'else'} ，但没有找到相应的v-if语句与之对应`)
    }
};


/**
 * 解析v-for的表达式，并返回一个for语句的描述对象
 * @param exp
 */
export const parseFor = exp => {
    const match = exp.match(forAliasRE);
    // 如果v-for提供的表达式不合法，直接退出解析
    if (!match) return;

    // 若表达式为：(item,index) in arr
    // match 输出
    // 0: "(item,index) in arr"
    // 1: "(item,index)"
    // 2: "arr"
    // index: 0
    // input: "(item,index) in arr"
    // groups: undefined

    // 用于存储for语句的一些描述信息
    const res = {};

    // 将待循环数组加入到res中
    res.for = match[2].trim();

    // 去除(item,index)中的括号 => item,index
    const alias = match[1].replace(stripParensRE, '');

    // 获取迭代子项 item 、 index
    const iteratorMatch = alias.match(forIteratorRE);
    // iteratorMatch输出：[",index","index",null]
    if (iteratorMatch) {
        // 获取当前索引表达式
        res.iterator1 = iteratorMatch[1].trim();
        // 获取当前子项表达式
        // "item,index".replace(/,([^,\}\]]*)(?:,([^,\}\]]*))?$/,'') => item
        res.alias = alias.replace(forIteratorRE, '').trim();
        // 当v-for循环的是一个对象时，支持如下写法
        // v-for="(name,value,index) in obj"
        if (iteratorMatch[2]) {
            res.iterator2 = iteratorMatch[2].trim();
        }
    } else {// 如果迭代子项与预期格式不符，说明用户是这样使用的：v-for="item in arr"，那么，我们就把item默认当做是数组子项或者是obj的value
        res.alias = alias;
    }
    // 解析完成，返回for语句的描述信息
    return res;
};
/**
 * 解析处理元素标签
 * @param elem
 * @param options
 * @returns {*}
 */
export const processElement = (elem, options) => {
    // 处理当前元素的key
    processKey(elem);

    // 在删除结构属性之前，先确定一下当前元素是不是一个普通的元素如：<div></div>
    elem.isPlainElement = (!elem.key && !elem.attrList.length && !elem.scopedSlots);

    // 处理当前元素的ref属性
    processRef(elem);
    // 处理被插槽传递给组件的内容
    processSlotContent(elem);
    // 处理插槽节点
    processSlotOutlets(elem);
    // 处理组件属性
    processComponent(elem);

    // 处理行间样式
    // 在vue中，因为需要兼容weex的样式形式，因此采用如下的方式处理样式
    // transforms = pluckModuleFunction(options.modules, 'transformNode')
    // for (let i = 0; i < transforms.length; i++) {
    //   element = transforms[i](element, options) || element
    // }
    // 我们这里就不考虑weex平台的情况了，直接处理网页中的行间样式即可
    processStyle(elem);

    // 上面已经将需要特殊处理的属性处理完了，但不要忘了，除了上面这些属性之外，用户还可以自定义属性以及一些原生自有但无需特殊处理的属性，如title
    // 接下来，我们就对上面没有处理的属性进行统一处理
    processAttrs(elem);

    // 处理完毕，返回抽象语法树节点
    return elem;
};

/**
 * 解析属性（原始属性和动态指令属性）
 * @param elem
 */
export const processAttrs = elem => {
    // 由于我们的上面处理那些特殊属性时调用的是getAndRemoveAttr方法，会在获取属性的同时，将该属性从attrList中移除
    // 因此，现在我们的arrList中保存的属性，就是没有被处理过的属性
    const {attrList} = elem;

    let i,
        len,
        name, // 属性名称
        rawName, // 原始的名称，由于name在循环操作时有可能会被解析转换，因此保存一份原始的属性名称
        value, // 属性值
        modifiers, // 属性修饰符,如<text-document v-bind.sync="doc"></text-document>中的sync
        syncGen,
        isDynamic;// 是否是动态属性

    for (let i = 0, len = attrList.length; i < len; i++) {
        name = rawName = attrList[i].name;
        value = attrList[i].value;

        if (dirRE.test(name)) {// 如果是合法的指令属性

            // 标记当前属性是一个动态的元素，及拥有动态属性的元素
            elem.hasBindings = true;
            // 解析指令描述符
            modifiers = parseModifiers(name.replace(dirRE, ''));

            // 如果属性描述符是使用简写的方式，即：<div .title="title"></div>
            if (propBindRE.test(name)) {
                // tips: .prop - 作为一个 DOM property 绑定而不是作为 attribute 绑定。
                // 那我们需要对modifiers进行修正，因为上面解析指令描述符时是没有考虑这种情况的
                (modifiers || (modifiers = {})).prop = true;
                // 修正完属性描述符后将.从属性描述符上干掉
                // 下面之所以还要再调用一次replace(modifierRE, '')是为了兼容同事存在两个修饰符的简写写法，如：
                // <div .title.sync="title"></div>
                // 此时除了把首位的.干掉之外，还需要吧后面的.sync也干掉（.sync在上面的parseModifiers方法中已经解析出来了，所以这里直接去掉就可以了）
                name = name.substring(1).replace(modifierRE, '');
            } else {
                // 指令描述符已经解析出来了，需要把他从name干掉，以免干扰下一步的解析
                name = name.replace(modifierRE, '');
            }

            // 若是v-bind:或:
            if (bindRE.test(name)) {
                // 既然已经知道这个是什么类型的指令了，那便可以把v-bind:或:去掉了，方便后面解析
                name = name.replace(bindRE, '');
                // 动态绑定的值有可能使用了过滤器，所以要获取属性值的话，需要解析一下指令中的过滤器
                value = parseFilter(value);

                // 动态特性名 (2.6.0+) v-bind:[key]="value"或:[key]="value"
                // vue中支持动态指定属性名，如：
                // 模板：<div v-bind:[attrName]="attrValue"></div>
                // 数据：data:{attrName: 'title', attrValue:'kiner'}
                // 解析完之后：
                // <div title="kiner"></div>
                isDynamic = dynamicArgRE.test(name);
                if (isDynamic) {
                    // 修正属性名
                    name = name.slice(1, -1);
                }

                // 属性值为空判断
                if (value.trim().length === 0) {
                    warn(`动态绑定的属性属性值不能为空，请检查属性v-bind:${name}`);
                }

                //// 对属性描述符的逻辑进行处理
                // 如果有属性描述符的话
                if (modifiers) {
                    // .prop 作为一个 DOM property 绑定而不是作为 attribute 绑定。
                    // 如果存在prop这个属性修饰符，并且属性名不是动态的
                    if (modifiers.prop && !isDynamic) {
                        // 现将属性名转成小驼峰形式
                        name = camelize(name);
                        // 为了实现v-html能够输出一段html代码，vue会在属性列表中插入一个innerHtml的属性
                        // function html (el, dir) {
                        //     if (dir.value) {
                        //       addProp(el, 'innerHTML', ("_s(" + (dir.value) + ")"), dir);
                        //     }
                        // }
                        // 由于innerHTML不是小驼峰形式，比较特殊，为确保属性名没有因为别的处理导致其变成innerHtml
                        // 在此判断一下
                        if (name === "innerHtml") name = "innerHTML";
                    }

                    // .camel (2.1.0+) 修饰符允许在使用 DOM 模板时将 v-bind 属性名称驼峰化
                    // 如果存在camel修饰符并且不是动态属性
                    if (modifiers.camel && !isDynamic) {
                        // 现将属性名转成小驼峰形式
                        name = camelize(name);
                    }

                    // .sync (2.3.0+) 语法糖，会扩展成一个更新父组件绑定值的 v-on 侦听器。
                    // 如果存在sync修饰符
                    // <div @click.sync="handle"></div>
                    if (modifiers.sync) {
                        // 这个方法主要是用来解析v-model并在触发某些事件时动态更新value用的，如：
                        // <input v-model='userName'/>
                        // 看上去只有这么点代码，其实通过转换后会变成：
                        // <input v-bind:value='userName.target.value' v-on:input="userName=$event"/>
                        // 而下面这行代码便是用来生成userName=$event用的
                        syncGen = genAssignmentCode(value, `$event`);

                        if (!isDynamic) {
                            addHandler(
                                elem,
                                `update:${camelize(name)}`,
                                syncGen,
                                null,
                                false,
                                warn,
                                attrList[i]
                            );
                            // 如果事件名不是单个单词组成的，那么有可能有不同的表达方式
                            // 如：myEvent和my-event，上面只是绑定了myEvent，但卫队my-event进行处理
                            // 因此需要处理一下
                            // 下面判断的是，name无论转成驼峰还是转成-分隔的形式都不相等就满足条件，
                            // 像：click这样就不满足下面的判断条件，因为不管怎么转都是click
                            if (hyphenate(name) !== camelize(name)) {
                                addHandler(
                                    elem,
                                    `update:${hyphenate(name)}`,
                                    syncGen,
                                    null,
                                    false,
                                    warn,
                                    attrList[i]
                                );
                            }
                        } else {
                            // 如果参数名是动态的，那么不管他是驼峰还是-分隔，我们并不关心，因为他并不是最终值，
                            // 他需要在运行时计算后才知道的，因此直接用原始的name即可
                            addHandler(
                                elem,
                                `update:${name}`,
                                syncGen,
                                null,
                                false,
                                warn,
                                attrList[i],
                                true
                            );
                        }
                    }
                }

                if (
                    (modifiers && modifiers.prop) || // 如果有专门指定prop修饰符
                    (
                        !elem.component && // 不是动态标签
                        mustUseProp(elem.tag, elem.attrsMap.type, name) // 是否是必须使用props定义属性的标签
                    )
                ) {// 如果需要将属性绑定到props上就用addProp
                    addProp(elem, name, value, attrList[i], isDynamic);
                } else {// 其他情况直接把属性绑定在attr上
                    addAttr(elem, name, value, attrList[i], isDynamic);
                }

            }
            // 若是v-on或@
            else if (onRE.test(name)) {
                // 修正属性名
                name = name.replace(onRE, '');
                // 是否存在动态参数
                isDynamic = dynamicArgRE.test(name);
                // 将动态参数的[]删除
                if (isDynamic) {
                    name = name.slice(1, -1);
                }

                // 将当前事件进行预处理(即根据不同的事件修饰符分类处理)后加入到抽象语法树节点的事件队列中
                addHandler(elem, name, value, attrList[i], isDynamic, modifiers);

            }
            // 普通指令
            else {
                // 修正属性名
                name = name.replace(dirRE, '');
                // 将属性参数化解析出来
                // 只有类似如下场景arg才会存在
                // 静态参数: <svg><a :xlink:special="foo"></a></svg>
                // 动态参数: <svg><a :xlink:[special]="foo"></a></svg>
                // 也就是说第一个:说的的其实是属性名，而第二个冒号后面才是参数
                // 由于上面 `name = name.replace(dirRE,'');`已经把第一个冒号去掉了
                // 因此`name.match(argRE);`只能匹配出第二个冒号后面的字符，也就是我们要的参数
                // 如上面实例中解析出来的arg=['special']
                let argMatch = name.match(argRE);
                let arg = argMatch && argMatch[1];
                // 设置普通指令默认为静态的，如果在进一步解析arg时发现这个参数是动态的，再去修正
                isDynamic = false;
                if (arg) {
                    // 修正属性名（解析完参数之后需要把参数干掉，即干掉:special，也就是从开始截取到-(arg.length + 1)位）
                    name = name.slice(0, -(arg.length + 1));
                    // 判断参数是否是动态的
                    if (dynamicArgRE.test(arg)) {
                        // 是动态参数，修正
                        isDynamic = true;
                        // 修正参数名，将[]干掉
                        arg = arg.slice(1, -1);
                    }
                }

                // 新增指令到抽象语法树节点当中
                addDirective(elem, name, rawName, value, arg, isDynamic, modifiers, attrList[i]);

            }


        } else {// 非指令属性
            // 如果不是指令属性，我们直接把属性加入到抽象语法树节点中即可
            addAttr(elem, rawName, JSON.stringify(value), attrList[i]);

            // 如果当前标签不是动态组件，且属性名是：muted（切换多媒体标签，如video、audio的静音状态）
            // 之所加这个逻辑是因为在火狐浏览器，如果通过setAttribute方式设置该属性无法改变多媒体标签的静音状态
            // vue issue: #6887
            if (
                !elem.component && // 不是动态标签
                name === "muted" && // 属性名为muted
                mustUseProp(elem.tag, elem.attrsMap.type, name) // 是否是必须使用props定义属性的标签
            ) {
                addProp(elem, name, "true", attrList[i]);
            }

        }
    }

};


/**
 * 解析属性名中的属性描述符
 * @param name
 */
export const parseModifiers = name => {
    let modifierMatch = name.match(modifierRE);
    // "v-bind.sync.prop".match(modifierRE)
    // 输出结果为：
    // [".sync", ".prop"]
    if (modifierMatch) {
        // 用于储存当前属性都包含了那些属性描述符，可能有一个，也可能有多个
        const res = {};
        modifierMatch.forEach(item => {
            res[item.substring(1)] = true;
        });
        // 如上述事例，res为：
        // {sync: true, prop: true}
        return res;
    }
};

/**
 * 处理行间样式
 * @param elem
 */
export const processStyle = elem => {
    // 首先，看一下当前标签有没有静态的行间样式，即：<div style="color: red;"></div>
    const staticStyle = getAndRemoveAttr(elem, 'style');
    // 如果存在静态行间样式，就把他转化成一个map形式的字符串保存在抽象语法树节点的staticStyle中
    staticStyle && (elem.staticStyle = JSON.stringify(parseStyleText(staticStyle)));

    // 然后再看一下有没有动态绑定的行间样式，即：<div :style="{{paddingTop: '5px'}}"></div>
    // 由于getBindingAttr方法默认会在找不到动态属性时尝试查询相同名称的静态属性，但因为我们上面已经处理过静态属性了，无需再处理了
    // 因此getBindingAttr方法传入第三个参数false，即getStatic=false,也就是说取不到动态属性就直接结束
    const dynamicStyle = getBindingAttr(elem, 'style', false);
    // 保存动态属性
    dynamicStyle && (elem.dynamicStyle = dynamicStyle);
};

/**
 * 处理组件属性
 * @param elem
 */
export const processComponent = elem => {
    let dynamicTarget;

    // 如果组件存在is属性，说明当前组件是一个动态组件，会跟随者is内指定的组件变化而变化
    if ((dynamicTarget = getBindingAttr(elem, 'is'))) {
        elem.component = dynamicTarget;
    }
    // 如果组件存在inline-template属性，说明该组件使用了内联模板，标记一下
    if (getBindingAttr(elem, 'inline-template') !== null) {
        elem.inlineTemplate = true;
    }
};

/**
 * 处理被插槽传递给组件的内容
 * @param elem
 */
export const processSlotContent = elem => {
    let slotScope;
    if (elem.tag === "template") {// 如果当前标签是模板标签
        // 获取scope属性
        // 注：用于表示一个作为带作用域的插槽的 <template> 元素，它在 2.5.0+ 中被 slot-scope 替代。
        slotScope = getAndRemoveAttr(elem, 'scope');

        // 由于在vue2.5.0+之后已经移除了这个属性，用slot-scope替代，但用户可能已经习惯使用scope属性了，所以，这里做一下兼容，同事兼容这两种写法
        elem.slotScop = slotScope || getAndRemoveAttr(elem, 'slot-scope');
    } else if ((slotScope = getAndRemoveAttr(elem, 'slot-scope'))) {// 如果元素不是template,但有slot-scope属性
        if (elem.for) { // 如果在v-for中使用slot-scope的话警告提示
            warn(`请不要循环一个带有'slot-scope'的元素，如果需要循环，可以把v-for加入一层包装元素，然后循环这个包装元素`);
        }
        elem.slotScop = slotScope;
    }

    // 看一下是否存在slot属性
    // 注：用于标记往哪个具名插槽中插入子组件内容。已经被废弃，推荐使用2.6.0的v-slot
    const slotTarget = getBindingAttr(elem, 'slot');

    if (slotTarget) {
        elem.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
        // 绑定slot是否是动态绑定，即是否使用的是:slot或v-bind:slot这样的绑定方式
        elem.slotTargetDynamic = hasDynamicAttr(elem, 'slot');
        // 如果当前元素不是template并且绑定的插槽是费作用域插槽，那么我们需要在这个标签上插入插槽属性
        addAttr(elem, 'slot', slotTarget, getRawBindingAttr(elem, 'slot'));
    }

    // TODO 2.6以后新增了v-slot属性,此处暂不实现

};

/**
 * 处理插槽节点
 * <slot/> 或 <slot name='name'/>
 * @param elem
 */
export const processSlotOutlets = elem => {
    // 如果当前标签是一个插槽，那我们看看他是不是一个具名插槽，如果是的话，把插槽名称取出来保存在抽象语法树节点中
    if (elem.tag === "slot") {
        elem.slotName = getBindingAttr(elem, 'name');
        if (elem.key) {// 如果在插槽上使用了key属性，则警告提示
            warn(`<slot/>是一个抽象节点，不是真实存在的节点，将key绑定在它上面没有任何意义，你可以尝试将key绑定在它的包装元素上`);
        }
    }

};

/**
 * 处理ref属性
 * @param elem
 */
export const processRef = elem => {
    const ref = getBindingAttr(elem, 'ref');
    if (ref) {
        // 如果存在ref属性，则吧ref加入到抽象语法树节点中
        elem.ref = ref;
        // 不断往上查看当前元素的父级是否有v-for表达式，如果是的话，做一个标记，因为在for循环中的ref需要一些特殊处理
        // 当 v-for 用于元素或组件的时候，引用信息将是包含 DOM 节点或组件实例的数组。
        elem.refInFor = checkInFor(elem);

    }
};
/**
 * 判断传入的元素是不是在for循环里边
 * @param elem
 * @returns {boolean}
 */
export const checkInFor = elem => {
    let parent = elem.parent;
    while (parent) {
        if (parent.for !== undefined) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
};

/**
 * 处理标签的key属性
 * @param elem
 * @returns {*}
 */
export const processKey = (elem) => {
    // 将标签上的key和:key拿出来
    const exp = getBindingAttr(elem, 'key');

    if (elem.tag === "template") {// template并不是一个真实的标签，在编译过程中会被移除掉的，所以，不能把key放在template上
        warn(`template并不是一个真实的标签，在编译过程中会被移除掉的，请把key绑定到一个真实的标签上`);
    }

    // 如果当前标签存在v-for，那么，如果他的父级标签是 transition-group 并且使用了循环的索引或对象的key作为key的值，则警告提示
    // 因为这样做跟没有加key属性是一样的
    if (elem.for) {
        const parent = elem.parent;
        const iterator = elem.iterator2 || elem.iterator1;
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
            warn(`当transition-group的子标签是通过循环渲染时，请不用直接使用数组的索引或者是对象的key值作为他的key，因为这样相当于没有加key`);
        }
    }

    return exp;
};