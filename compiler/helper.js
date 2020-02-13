import {parseFilter} from "./filter-paser.js";
import {extend, hasDynamicAttr, warn} from "../shared/utils.js";
import {cloneAstElement} from "./Ast.js";
import {forAliasRE, forIteratorRE, stripParensRE} from "../shared/RE.js";

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

        //// 如果当前elem是radio的情况

        //// 如果当前elem是其他类型的input

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
 * @returns {*}
 */
export const getBindingAttr = (elem, attrName) => {
    // 获取动态属性值的同时把改动态属性从attrList中删除掉，以免后面重复解析
    const dynamicValue = getAndRemoveAttr(elem, `:${attrName}`) || getAndRemoveAttr(elem, `v-bind:${attrName}`);

    // 如果动态属性值存在，说明确实是一个动态属性
    if (dynamicValue) {
        // 如果是动态属性值，还需要看看这个值有没有使用过滤器，如果有，我们还需要解析过滤器
        return parseFilter(dynamicValue);
    } else {
        // 如果动态属性值不存在的话，说明要获取的属性可能是一个静态的属性，我们尝试获取一下静态属性看看能不能获取得到，
        // 如果可以，就把静态舒缓型获取回来并在attrList中删除该属性，并将该属性值返回
        let staticValue = getAndRemoveAttr(elem, attrName);
        if (staticValue) {
            return JSON.stringify(staticValue);
        }

    }
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
 * 注：在vue源码中还有一个range参数，但我全局搜索了一下其内部使用addRawAttr的情况，
 * 并没有看到有哪里传入了这个参数，也不清楚这个参数具体有什么作用，因此，在此处便省略了此参数
 * @param elem
 * @param name
 * @param value
 */
export const addRawAttr = (elem, name, value) => {
    elem.attrList.push({name, value});
    elem.attrsMap[name] = value;
};

/**
 * 对v-for语句进行处理
 * @param elem
 */
export const processFor = (elem) => {
    let exp;// v-for的表达式,只有当表达式不为空时才需要解析
    if((exp = getAndRemoveAttr(elem, 'v-for'))!==null){
        // 解析表达式
        let res = parseFor(exp);
        if(res){
            // 如果表达式解析成功，说明是一个合法的v-for表达式，则将解析出来的for语句描述对象合并到抽象语法树节点中
            extend(elem, res);
        }else{
            // 解析失败，说明表达式错误，警告提示
            warn(`您在标签${elem.tag}上绑定的v-for="${exp}"存在语法错误，请检查并修正错误`);
        }
    }
};

/**
 * 解析v-for的表达式，并返回一个for语句的描述对象
 * @param exp
 */
export const parseFor = exp => {
    const match = exp.match(forAliasRE);
    // 如果v-for提供的表达式不合法，直接退出解析
    if(!match) return;

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
    const alias = match[1].replace(stripParensRE,'');

    // 获取迭代子项 item 、 index
    const iteratorMatch = alias.match(forIteratorRE);
    // iteratorMatch输出：[",index","index",null]
    if(iteratorMatch){
        // 获取当前索引表达式
        res.iterator1 = iteratorMatch[1].trim();
        // 获取当前子项表达式
        // "item,index".replace(/,([^,\}\]]*)(?:,([^,\}\]]*))?$/,'') => item
        res.alias = alias.replace(forIteratorRE,'').trim();
        // 当v-for循环的是一个对象时，支持如下写法
        // v-for="(name,value,index) in obj"
        if(iteratorMatch[2]){
            res.iterator2 = iteratorMatch[2].trim();
        }
    }else{// 如果迭代子项与预期格式不符，说明用户是这样使用的：v-for="item in arr"，那么，我们就把item默认当做是数组子项或者是obj的value
        res.alias = alias;
    }
    // 解析完成，返回for语句的描述信息
    return res;
};

export const processElement = (elem, options) => {
    // 处理当前元素的key
    processKey(elem);

    // 在删除结构属性之前，先确定一下当前元素是不是一个普通的元素如：<div></div>
    elem.isPlainElement = (!elem.key && !elem.attrList.length && !elem.scopedSlots);

    

};

/**
 * 处理ref属性
 * @param elem
 */
export const processRef = elem => {
    const ref = getBindingAttr(elem, 'ref');
    if(ref){
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
    while (parent){
        if(parent.for !== undefined){
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

    if(elem.tag === "template"){// template并不是一个真实的标签，在编译过程中会被移除掉的，所以，不能把key放在template上
        warn(`template并不是一个真实的标签，在编译过程中会被移除掉的，请把key绑定到一个真实的标签上`);
    }

    // 如果当前标签存在v-for，那么，如果他的父级标签是 transition-group 并且使用了循环的索引或对象的key作为key的值，则警告提示
    // 因为这样做跟没有加key属性是一样的
    if(elem.for){
        const parent = elem.parent;
        const iterator = elem.iterator2 || elem.iterator1;
        if(iterator && iterator === exp && parent && parent.tag === 'transition-group'){
            warn(`当transition-group的子标签是通过循环渲染时，请不用直接使用数组的索引或者是对象的key值作为他的key，因为这样相当于没有加key`);
        }
    }

    return exp;
};