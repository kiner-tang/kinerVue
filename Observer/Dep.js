// Observer/Dep.js 依赖类，用于统一管理观察者，一旦依赖跟新，便可通过此类的notify方法通知其订阅的所有
// 观察者进行更新数据

import {removeArrItem} from "../shared/utils.js";

let uid = 0;
/**
 * 用来管理所有的watcher
 */
class Dep {
    constructor(){
        // 订阅者列表
        this.subs = [];
        // 为每一个依赖定义一个唯一的id
        this.id = uid++;
    }

    /**
     * 触发添加依赖
     */
    depend(){
        //为实现取消订阅的功能，将订阅的方法放在watcher中，此处通过调用watcher的addDep将当前依赖加入到订阅列表，
        Dep.target&&Dep.target.addDep(this);
        // 初版实现，未实现取消订阅功能
        // Dep.target&&this.addDep(Dep.target);
    }

    /**
     * 添加订阅者
     * @param watcher 订阅者
     */
    addSub(watcher){
        // 为解决当调用数组的splice和sort方法时，会触发多次更新的问题，加入订阅时先看一下该依赖是否已经被添加
        if(this.subs.indexOf(watcher)<0){
            this.subs.push(watcher);
        }

    }

    /**
     * 从从订阅列表中移除订阅者
     * @param watcher
     */
    removeSub(watcher){
        removeArrItem(this.subs,watcher);
    }


    /**
     * 通知订阅者更新
     */
    notify(){
        this.subs.forEach(watcher=>{
            watcher.update()
        });
    }
}

export default Dep;