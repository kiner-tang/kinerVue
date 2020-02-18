import {hasSymbol, isA, isObject, isString, isUnDef} from "../../shared/utils.js";

/**
 * 用于在运行时渲染v-for
 * @param val       带渲染目标值
 * @param render    渲染函数
 */
export const renderList = (val, render) => {
    let l,i=0, res,keys;
    // 使用v-for循环时，如果带渲染数据是一个数组或字符串，直接循环调用渲染函数并将创建的vnode加入到res数组中
    // e.g.
    // <div v-for="(item) in [1,2,3]" :key="item">{{item}}</div>
    // 或
    // <div v-for="(item) in '123'" :key="item">{{item}}</div>
    // 输出：
    // <div>1</div>
    // <div>2</div>
    // <div>3</div>
    if(isA(val) || isString(val)){

        l = val.length;
        i=0;
        res = new Array(l);
        while (i<l){
            res[i] = render(val[i], i);
            i++;
        }
    }else if(typeof val === "number"){
        // 如果带渲染数据是一个数字，那这个数字就是我们总共要渲染的次数
        // e.g.
        // <div v-for="(item) in 3" :key="item">{{item}}</div>
        // 输出：
        // <div>1</div>
        // <div>2</div>
        // <div>3</div>
        res = new Array(val);
        i=0;
        while (i++<val){
            res[i] = render(i+1, i);
        }
    }else if(isObject(val)){
        // 如果是对象的话，则循环对象的每一个key
        // 在vue源码中，根据当前运行环境是否支持Symbol采用了两种不同的迭代方案
        if(hasSymbol && val[Symbol.iterator]){// 如果支持symbol并且val实现了迭代方法
            res = [];
            const iterator = val[Symbol.iterator]();
            let result = iterator.next();
            while (!result.done){
                res.push(render(result.value, res.length));
                result = iterator.next();
            }
        } else {
            // 如果当前环境不支持symbol获取目标对象没有实现迭代器方法，就直接采用Object.keys
            keys = Object.keys(val);
            res = new Array(keys.length);
            keys.forEach((key, index)=>(res[index] = render(val[key], key, index)));
        }
    }

    // 如果经过了上面几轮处理之后,res还是未定义，那么说明待循环数据不合法，重置一下res
    if(isUnDef(res)){
        res = [];
    }
    // 标记一下res这个数组是通过v-for循环得到的
    res._isVList = true;
    return res;
};