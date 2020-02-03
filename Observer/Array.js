// Array.js 定义一些针对数组响应化时需要用到的辅助数据以及定义了
import {def} from "../shared/utils.js";

// 数组原型，在对数组方法打补丁的时候，需要用到数组原型方法用于实现原本的数组操作
export const arrayProto = Array.prototype;

/**
 * 需要打补丁的数组方法，即会改变数组的方法
 * @type {string[]}
 */
export const needPatchArrayMethods = [
    "push",
    "pop",
    "unshift",
    "shift",
    "sort",
    "reverse",
    "splice"
];


// 根据数组原型创建一个新的基础数组对象，避免为数组方法打补丁的时候污染原始数组
export const arrayMethods = Object.create(arrayProto);


// 实现数组拦截器，通过这个拦截器实现拦截数组操作方法操作
needPatchArrayMethods.forEach(method=>{
    // 从数组原型中将原始方法取出
    const originalMethod = arrayProto[method];

    def(arrayMethods,method,function mutator(...args){
        // const oldVal = [...this];
        // 调用数组原始方法实现数组操作
        const res = originalMethod.apply(this,args);
        // 若当前数组已经是响应化后的数组，则将其Observe实例取出，用户后续通知更新操作
        const ob = this.__ob__;

        // 若执行的是会新增数组元素的方法，我们需要对新增的元素也进行响应化处理
        // 其中push和unshift接收的所有参数都是新增元素，因此直接将参数对象传递给defineReactiveForArray进行响应化处理
        // splice第2个之后的参数便为新增或替换的元素，因此将第2个之后的参数提取出来，传递给defineReactiveForArray进行响应化处理
        let inserted;
        switch (method){
            case "push":
            case "unshift":
                inserted = args;
                break;
            case "splice":
                inserted = args.splice(2);
                break;
        }
        inserted && ob.defineReactiveForArray(inserted);


        //通知依赖更新
        ob&&ob.dep.notify();
        // console.log(`---->触发了数组的${method}方法：新值：`,this,`；旧值：`,oldVal);
        return res;
    });
});
