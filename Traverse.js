// Traverse.js 通过traverse递归访问指定对象，通过触发getter的方式实现依赖收集
import {isA,isObject,hasOb} from "./utils.js";

// 用于存储依赖id
const depIds = new Set();

// 通过这个方法访问一下给定目标对象的子对象，从而触发依赖通知
export const traverse = (val) => {
    _traverse(val,depIds);
    depIds.clear();
};

function _traverse(val,depIds){
    let len,keys;
    // 所传对象如果类型不是非冻结对象或数组,就直接终止
    if((!isA(val) && !isObject(val)) || Object.isFrozen(val)){
        return;
    }
    // 判断当前对象是否已经是响应化对象
    if(hasOb(val)){
        const  depId = val.__ob__.dep.id;
        if(depIds.has(depId)){//已经访问过了，直接终止
            return;
        }
        //若未访问过，则将依赖id加入到depIds中
        depIds.add(depId);
    }

    if(isA(val)){//如果是数组，则循环访问其子项并递归访问
        len = val.length;
        while (len--) _traverse(val,depIds);
    }else{//循环对象下的所有属性并递归访问
        keys = Object.keys(val);
        len = keys.length;
        while (len--) _traverse(val,depIds);
    }
}