let len, index, tmpStr, expPos, expEndPos, curChar;


/**
 * 用于生成v-model值的跨平台代码生成器助手
 * 设 assignment=$event
 * <input v-model="obj" @click.sync="handle"/>
 * 最终转换位代码片段：
 * `handle=$event`
 * <input v-model="obj['userInfo']['nickName']" @click.sync="handle"/> 或
 * <input v-model="obj.userInfo.nickName" @click.sync="handle"/>
 * 最终转换位代码片段：
 * `$set(handle, "['userInfo']['nickName']","$event")` 或
 * `$set(handle, "userInfo.nickName","$event")`
 * @param value
 * @param assignment
 */
export const genAssignmentCode = (value, assignment) => {
    // 根据事件表达式计算出v-model的最终值描述独享
    const res = parseModel(value);
    // 如果有属性路径的话
    if(res.key){
        // 如果带有属性路径的话，则调用vue的全局api方法$set设置属性
        return `$set(${res.exp}, ${res.key}, ${assignment})`
    }else{// 不存在属性路径 即:v-model="name" 形式
        return `${value}=${assignment}`
    }

};

/**
 * 解析model
 * test
 * test[key]
 * test[test1[key]]
 * test["a"][key]
 * xxx.test[a[a].test1[key]]
 * test.xxx.a["asa"][test1[key]]
 * @param val
 * @returns {*}
 */
export const parseModel = val => {
    val = val.trim();
    len = val.length;

    if (
        val.indexOf('[') < 0 || // 表达式是不是：obj["name"] 这种情况
        val.lastIndexOf("]") < len - 1 // 表达式不是这种情况：[name,age]
    ) {
        // 排除了上面两种情况的表达式，那么就剩下obj.name或name这样的表达式了
        index = val.indexOf('.');
        if (index < 0) { // 如果不存在.说明表达式是：name 这样的形式，直接返回即可
            return {
                exp: val,
                key: null
            };
        } else { // 存在.说明是obj.name的情况
            // 将目标对象提取出来，剩下的部分变是这个目标对象的键值，
            // 我们再运行时可以通过exp[key]的方式获取到目标对象里面指定属性的值
            // 上面实例中返回的应该是：
            // {exp: "obj", key: "name"}
            // 实际运行时将会是：vm[exp][key] 即：vm["obj"]["name"]
            // 这样就可以获取到代理到vue实例上的data上的obj的name属性的值了
            return {
                exp: val.slice(0, index),
                key: `"${val.slice(index + 1)}"`
            }
        }
    }

    tmpStr = val;
    index = expPos = expEndPos = 0;

    // 如果遍历的游标没有到表达式的末尾则进入循环
    while (!isEof()) {
        // 向右截取一个字符
        curChar = next();
        if (isStart()) { // 如果当前字符是引号，那么我们需要从当前位置开始截取当前字符串，直到遇到另一个引号位置
            parseString(curChar);
        }else if(curChar==="["){ // 遇到括号，开始解析括号
            parseBracket(curChar);
        }
    }

    // 解析完成之后，我们已经得到了属性路径的开始位置expPos和结束位置expEndPos
    return {
        exp: val.slice(0, expPos),
        key: val.slice(expPos+1, expEndPos)
    };

};

/**
 * 让指针不断往右走，直至遇到右引号
 */
function parseString(char){
    const tmpQuot = char;
    curChar = next();
    // 不断循环，直至遇到另一个引号
    while (!isEof()) {
        curChar = next();
        if(isEnd(tmpQuot)){
            break;
        }
    }
}

/**
 * 是否到达边界
 * @returns {boolean}
 */
function isEof(){
    return index>len;
}

/**
 * 解析括号
 */
function parseBracket(char){
    // 用于记录左括号出现的次数，如果出现一个右括号，就抵消掉一个，出现次数就可以减一
    // 直到所有的左括号都被右括号抵消完了，leftBracketCount=0时便完成
    let leftBracketCount = 1;
    // 记录第一个左括号的位置
    expPos = index;
    while (!isEof()){
        curChar = next();
        if (isStart(char)) { // 如果当前字符是引号，那么我们需要从当前位置开始截取当前字符串，直到遇到另一个引号位置
            parseString(char);
            continue;// 解析完双引号之后，进入下个循环继续遍历
        }

        curChar==="["&&(leftBracketCount++);// 找到一个左括号，累加
        curChar==="]"&&(leftBracketCount--);// 找到一个右括号，抵消

        if(leftBracketCount===0){// 全部抵消完了，已经到了最后一个右括号的位置了，记录结束位置
            expEndPos = index;
            break;
        }
    }
}

/**
 * 判断是否是引号
 * @returns {boolean}
 */
function isStart(char) {
    return [`"`, `'`].indexOf(char) >= 0;
}

/**
 * 判断是否已经遇到了右引号
 * @param startChar
 * @returns {boolean}
 */
function isEnd(startChar) {
    return curChar === startChar;
}

/**
 * 不断截取下一个字符，游标右移
 * @returns {string}
 */
function next() {
    // 截取一个字符
    return tmpStr.charAt(++index);
}