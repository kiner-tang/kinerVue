import {emptyNode} from "../patch.js";
import {handleError, resolveAsset} from "../../shared/utils.js";
import {mergeVNodeHook} from "../helpers/merge.js";

function updateDirectives(oldVnode, vnode){
    // 当且仅当新旧节点中至少有一个节点存在指令时才需要处理
    if(oldVnode.data.directives || vnode.data.directives){
        _update(oldVnode, vnode);
    }
}

function _update(oldVnode, vnode){
    // 如果旧节点是空的，说明当前操作是新增节点
    const isCreate = oldVnode === emptyNode;
    // 如果新节点时空的，说明当前操作是删除节点
    const isRemove = vnode === emptyNode;

    // 将新旧指令进行规格化
    const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context);
    const newDirs = normalizeDirectives(vnode.data.directives, vnode.context);

    // 用于保存绑定时的钩子函数
    const dirsWithInsert = [];
    // 用于保存update的钩子函数
    const dirsWithPostPatch = [];

    // 更新都是以新的为基准，因此循环新指令集的每一个指令，根据不同情况出发不同的钩子函数
    for(let key in newDirs){
        let oldDir = oldDirs[key];
        let newDir = newDirs[key];
        if(!oldDirs){// 如果不存在旧指令，则说明该指令是一个新增的指令，我们进行绑定操作
            callDirHook(newDir,'bind', vnode, oldVnode);
            // 如果有指定inserted，则将其加入到数组中
            if (newDir.def && newDir.def.inserted) {
                dirsWithInsert.push(newDir);
            }
        }else{
            // 如果存在旧指令，则执行更新操作
            newDir.oldValue = oldDir.value;
            newDir.oldArg = oldDir.arg;
            callDirHook(newDir, 'update', vnode, oldVnode);
            if(newDir.def && newDir.def.update){
                dirsWithPostPatch.push(newDir);
            }
        }
    }

    // 循环结束，如果dirsWithInsert中存在钩子函数
    if(dirsWithInsert.length){
        const callInsert = () => {
            for(let i=0;i<dirsWithInsert.length;i++){
                callDirHook(dirsWithInsert[i], 'inserted', vnode, oldVnode);
            }
        };

        // 如果是新建或初始化组件，则使用mergeVNodeHook方法将invest绑定上去，等待更新组件时调用
        if(isCreate){
            mergeVNodeHook(vnode, 'insert', callInsert);
        }else{
            // 否则立即调用callInsert执行钩子函数
            callInsert();
        }

        // 如果dirsWithPostPatch存在钩子函数的话，由于这些钩子函数都是在组件更新阶段才会触发的
        // 所以将他们合并到vnode中，等待组件更新时触发
        if(dirsWithPostPatch.length){
            mergeVNodeHook(vnode, 'postpatch', ()=>dirsWithPostPatch.forEach(hook=>callDirHook(hook,'componentUpdated', vnode, oldVnode)));
        }

        // 如果旧的指令不为空，那我们看看新的指令是否为空，如果是，说明需要解除绑定
        if(!isCreate){
            for(let key in oldDirs){
                if(!newDirs[key]){
                    callDirHook(oldDirs[key],'unbind', vnode, oldVnode, isRemove);
                }
            }
        }

    }






}

// 空修饰符对象
const emptyModifiers = Object.create(null);

/**
 * 规格化指令对象
 * @param dirs
 * @param vm
 * @returns {any}
 */
function normalizeDirectives(dirs,vm){
    const res = Object.create(null);
    // 不存在指令集，返回一个空对象
    if(!dirs){
        return res;
    }
    // 循环指令集，并将指令按照原始指令名为key,当前指令对象为value加入到res中
    let i,dir;
    for(i=0;i<dirs.length;i++){
        dir = dirs[i];
        // 若不存在指令修饰符，则初始化一个空对象复制给他
        if(!dir.modifiers){
            dir.modifiers = emptyModifiers;
        }
        res[getRawDirName(dir)] = dir;
        // 将指令的具体定义获取拿出来挂载到dir的def上
        dir.def = resolveAsset(vm.$options, 'directives', dir.name);
    }
    return res;
}

/**
 * 获取原始指令名
 * @param dir
 * @returns {string}
 */
function getRawDirName(dir){
    return dir.rawName || `${dir.name}${Object.keys(dir.modifiers||{}).join(".")}`
}

/**
 * 执行指令钩子函数
 * @param dir
 * @param hook
 * @param vnode
 * @param oldVnode
 * @param isDestroy
 */
function callDirHook(dir, hook, vnode, oldVnode, isDestroy){
    // 从指令定义中获取钩子函数
    const fn = dir.def && dir.def[hook];
    if(fn){
        try{
            fn(vnode.elem, dir, vnode, oldVnode, isDestroy);
        }catch (e) {
            handleError(e, vnode.context, `指令: ${dir.name} ${hook} 执行异常`);
        }
    }
}

export default {
    create: updateDirectives,
    update: updateDirectives,
    destroy: function unbindDirectives (vnode) {
        updateDirectives(vnode, emptyNode)
    }
}