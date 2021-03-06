import KinerVue from './platform/web/runtime/entry.js'

let tpl = `<div id="root">
<div class="message">你好，{{name|myName('我的名字叫：')}}</div>
    <p><span>这是内联元素</span><div>这是块级元素</div></p>
    <!--这是一个注释-->
    <ul>
        <li v-for="(item,index) in friends" :key="item+'_'+index"> {{item|iterator(index)}}
        <li v-if="sex<0.3" :title="sex"> b
        <li v-else-if="sex>=0.3&&sex<0.6" :title="sex"> c
        <li v-else :title="sex"> d
        <li @keydown.enter="enterHandler"> e
    </ul>
    <br/>
    <br>
    </br>
    地方发生反倒是</p>
</div>`;

KinerVue.filter('myName',(val,pre)=>{
    let res = `${pre}${val}`;
    console.log(`调用过滤器：`,val,pre,res);
    return res;
});

KinerVue.filter('iterator',(value,index)=>{
    return `选项${index}：${value}`;
});

// console.dir(KinerVue.options.filters);
let vue = new KinerVue({
    // el: '#root',
    // template: tpl,
    comments: true,
    data() {
        return {
            name: "kiner",
            sex: Math.random(),
            userInfo: {
                age: 20
            },
            classify:[3,5,2,6,3,5,6,7,1,4],
            friends: ['bbb','aaa','ddd','ccc']
        }
    },
    beforeMount(){
        console.log('准备挂载');
        //test 生命周期钩子内代码报错
        aaa
    },
    mounted(){
        console.log('已经挂载');
    },
    errorCaptured(err, vm, info){
        console.log(info,err,vm);
    },
    methods:{
        enterHandler(){
            alert('按下了enter键');
        }
    }

}).$mount('#root');

if(vue.$options.render){
    let vdom = vue.$options.render.call(vue);
    console.log('虚拟节点树：',vdom);
}
vue.$watch(function () {
    return this.userInfo.age+this.classify[1];
},(newVal, oldVal) => {
    console.log(`=====>新值：${newVal}；旧值：${oldVal}；`);
},{immediate: true});
vue.userInfo.age = 30;
vue.$mount();

// test KinerVue.filter、KinerVue.directive、KinerVue.component start
KinerVue.filter('my-filter',()=>{
    console.log('这是一个过滤器');
});
KinerVue.directive('my-directive',()=>{
    console.log('这是一个指令');
});
KinerVue.component('my-component',()=>{
    console.log('这是一个组件');
});

console.dir(KinerVue);
// test KinerVue.filter、KinerVue.directive、KinerVue.component end

// test KinerVue.use start
KinerVue.use({
    install(KVue,...args){
        KVue.myPlugins = function () {
            console.log('这是一个插件',args);
        }
    }
},'插件1');
KinerVue.myPlugins();
console.dir(KinerVue);
// test KinerVue.use end

// test KinerVue.mixin start
KinerVue.mixin({
    created(){
        console.log(`mixin created`);
    }
});
// test KinerVue.mixin end


// test KinerVue.extend start
let Sub = KinerVue.extend({
    created(){
        console.log('sub created');
    },
    data(){
        return {
            school: 'gdzit'
        }
    },
    props:{
        msg: 'hello'
    }
});
let sub = new Sub();
console.log(sub);
sub.$watch('school',(newVal, oldVal)=>{
    console.log(`===>检测到school属性发生变化，新值为:${newVal};旧值为：${oldVal}；`);
});
sub.school = 'zsdx';
// test KinerVue.extend end