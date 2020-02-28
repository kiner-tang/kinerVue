import {isA, isUnDef, removeArrItem} from "../../shared/utils.js";

export const registerRef = (vnode, isRemove) => {
    const key = vnode.data.ref;
    // 如果没定义ref，则无需处理
    if (isUnDef(key)) return;

    const vm = vnode.context;
    const ref = vnode.componentInstance || vnode.elem;
    const refs = vm.$refs;

    // 如果想要删除ref
    if(isRemove){
        if(isA(refs[key])){
            removeArrItem(refs, ref);
        }else if(refs[key]===ref){
            refs[key] = undefined;
        }
    }else{
        // 新增ref
        // ref是否在v-for中被使用，如果是的话，ref对应的应该是一个数组
        if(vnode.data.refInFor){
            if(!isA(refs[key])){
                refs[key] = [ref];
            }else if(refs[key].indexOf(ref)<0){// 如果是数组并且要添加的ref在数组中不存在的话则添加入数组中
                refs[key].push(ref);
            }
        }else{
            refs[key] = ref;
        }
    }
};

export default {
    create(vnode){
        registerRef(vnode)
    },
    update(oleVnode,vnode){
        if(oleVnode.data.ref!==vnode.data.ref){
            // 如果新旧节点的ref不一样，那我们需要删除旧节点的ref,新增到新节点中
            registerRef(oleVnode, true);
            registerRef(vnode);
        }
    },
    destroy(vnode){
        // 销毁时直接移除节点上的vnode
        registerRef(vnode, true);
    }
};