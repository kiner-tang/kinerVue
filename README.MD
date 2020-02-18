# KinerVue

> KinerVue是本人在学习Vue源码时尝试实现的一个简易版的Vue项目，其中加入了部分自己的理解

## 目录结构与解析

```bash
.
├── Observer	        将之前的数据响应化相关代码都统一归集到了这个目录
│   ├── Array.js      在复制出来的一份数组原型上实现了操作拦截器，对会改变数组元素的方法进行拦截与通知更新操作
│   ├── Dep.js        Dep.js 依赖类，用于统一管理观察者，一旦依赖跟新，便可通过此类的notify方法通知其订阅的所有观察者进行更新数据
│   ├── Observer.js   数据响应化对象:Vue数据响应化的核心，Vue2.0时代通过Object.defineProperty方式进行数据响应化，而Vue3.0时代则采用Proxy和Reflect方式实现,无论采用哪种方式，但其实现原理都是一样的，都是通过数据劫持的方式实现响应化
│   ├── Traverse.js   traverse递归访问指定对象，通过触发getter的方式实现深度依赖收集
│   └── Watcher.js    观察者对象：它相当于是依赖Dep与具体的更新操作的一个中介，也可以理解为他是一个物流中转站，依赖就像是快递，具体更新操作就是快递的目的地，具体流程是这样的：*我们把快递(更新)交给快递代收点（Dep）,当快递代收点（Dep）接收到快递之后，会有人来收集快递送到快递中转站(watcher),然后再由快递中转账再统一派发到不同的地址。
├── README.MD
├── VDOM                    虚拟DOM相关代码
│   ├── VNode.js						VNode其实就是虚拟节点，他是一个用来描述如何创建dom节点的描述对象，其实就是一个简单的javascript对象，只是我们都是通过VNode创建一个虚拟节点，从而得到用来创建dom节点的描述信息，然后根据这些描述信息便可创建一个dom节点。
│   ├── createElement.js    定义了用于创建VNode一些方法，便在创建是做一些抽象语法树传过来的数据做一些预处理，方便后续用于渲染页面
│   ├── helpers.js          helpers.js 生成虚拟dom时的助手，这里定义了规格化子节点的方法，用于处理一些如因为v-for导致子节点列表children中出现嵌套数组的情况，规格化子节点就是将这个数组打平，同时对子节点做一些优化（如：将相邻的文本节点合并，从而减少虚拟节点的常见以及之后对比与渲染的开销等）
│   └── patch.js            （*此文件暂未实现）此文件实现虚拟DOM的patching算法，对新旧虚拟DOM进行diff，找出最少的更新
├── compiler                此目录存放的是模板编译器、优化器、代码生成器的相关代码
│   ├── Ast.js							抽象语法树相关操作，此文件定义了一些创建抽象语法树节点的便捷方法
│   ├── codegen             此目录存放代码生成器相关代码
│   │   ├── event.js        此文件用于处理事件代码片段生成的相关逻辑，由于事件处理代码片段的生成相对复杂，因此单独拆分出来一个文件
│   │   └── index.js        本文件实现了出事件代码片段生成器主体逻辑之外的其他情况的代码生成，如：元素代码片段生成、属性代码片段生成、v-for、v-if等特殊指令的代码生成等
│   ├── compile-tpl-to-ast.js   本文件用于将一个html模板生成一个抽象语法树
│   ├── create-compiler.js      本文件是用来构建编译器创建方法的工厂，可以根据提供的基础编译器返回一个能够生成优化过的编译器和能够直接生成渲染函数的编译器
│   ├── directives              存放一些内置基础指令的代码生成
│   │   ├── bind.js						  将v-bind指令生成代码片段
│   │   ├── index.js            默认指令的归集，将内部指令统一导出
│   │   ├── model.js            提供一些能够解析并生成与v-model相关的代码片段
│   │   └── on.js               v-on指令生成代码片段
│   ├── filter-paser.js         提供解析并生成过滤器的相关方法
│   ├── helper.js               定义了一些在解析模板生成抽象语法树时的助手方法
│   ├── index.js                通过编译器创建工厂创建一个可以统一生成编译器的方法，调用创建的方法可以返回我们期待的渲染函数
│   ├── optimize.js             优化器，对通过解析器生成的抽象语法树中的静态节点和静态根节点进行标记，在渲染阶段便可以跳过这些渲染节点进行渲染，以提升效率
│   ├── parse.js                定义了用于真正解析html模板和解析文本（包括静态文本和带参数的动态文本）的方法
│   └── to-function.js          提供了将我们代码生成器的代码转换为渲染函数的方法
├── config.js                   用于存放改一些全局的配置信息，如内置键盘键码别名映射表、全局错误handler等
├── demo.html										用于测试与方便调试的示例页面
├── demo.js                     示例页面的相关js,在这里示例话vue
├── globalApi.js                globalApi.js 将全局api如extent、set、del、filter、directive、component、use、mixin等挂载到KinerVue上
├── kinerVue.js                 简易版小程序入口
├── mixins											KinerVue在实例化阶段时需要混入的逻辑
│   ├── eventMixin.js           对事件对象的初始化，并提供了在KinerVue原型上挂载事件相关的方法如：$on,$off,$emit,$once等方法
│   ├── initMixin.js            对KinerVue的一些内置属性进行初始化，并在这里对我们的根数据对象data进行观察
│   ├── initProvide.js          初始化依赖提供者provide，实际上只需要将依赖提供者挂载到KinerVue实例上的_provide上即可，剩下的就交给inject自己去获取了
│   ├── initState.js            初始化状态，在vue中，所谓的状态其实包括props、methods、data、computed、watch，也就是我们再实例化vue时传过去的属性、方法、数据、计算属性以及观察方法
│   ├── inject.js               初始化注入的依赖的收集逻辑
│   ├── lifecycleMixin.js				实现了一些跟vue生命周期有关的方法，如强制更新：$forceUpdate、卸载实例：$destroy等
│   └── renderMixin.js          mixins/renderMixin.js
├── platform                    vue同时支持web端和weex端，此目录便是用来存放两端差异化代码的目录（KinerVue仅实现web端，创建此目录只是为了更好的区分与平台相关的逻辑）
│   └── web
│       └── compiler								将web平台的编译器导出
│       │   ├── index.js						调用编译器创建者撞见编译器，并导出编译后的结果供外部调用
│       │   └── options.js					创建编译器时的一些与平台有关的基础选项
│       └── runtime									web运行时相关代码
│           ├── index.js						实现针对web端的$mount方法并挂在全局api,导出KinerVue，web端引用KinerVue的入口文件
│           ├── modules             *本次尚未涉及，暂不实现
│           │   └── events.js       *本次更新未使用，以后将更新
│           ├── nodeOps.js					本文件便是web渲染引擎，所有涉及到浏览器渲染dom节点的操作，都在此处定义，那么，当需要渲染出web页面时，只需要指定本引擎便可渲染出web页面
│           └── utils								web平台运行时的一些工具方法，如兼容性处理等
│               └── compat.js				判断目标环境，对一些有差异的浏览器操作进行一些兼容性处理和判断
├── render-helpers									渲染时的助手，即生成虚拟DOM的助手集合
│   ├── helpers											
│   │   ├── bind-dynamic-keys.js         即运行时执行的_d方法，用于处理一些东岱的属性
│   │   ├── bind-object-listeners.js     运行时使用的_g方法，用于绑定一个事件监听对象
│   │   ├── bind-object-props.js         运行时的_b方法，用于绑定一个对象属性
│   │   ├── check-keycodes.js            运行时的_k方法，用于检测目标键名或键值是否在内置键名或键值以及自定义键值中不存在
│   │   ├── render-list.js               运行时的_l方法，用于渲染v-for的标签
│   │   ├── render-slot.js               *本次暂未实现，用于实现插槽功能的渲染
│   │   ├── render-static.js             用于渲染与标记一个静态节点树
│   │   ├── resolve-filter.js            用于从全局options中找到目标过滤器
│   │   ├── resolve-scoped-slots.js      *本次暂不实现，作用域插槽的渲染
│   │   └── resolve-slots.js             *本次暂不实现
│   └── index.js                         提供一个方法，将helpers目录中助手方法的所有挂载到目标对象上
└── shared                               全局共享的工具目录
    ├── RE.js                            存放了几乎整个项目要用到的正则表达式
    ├── SimpleStack.js                   实现了一个简单的栈
    ├── constants.js                     对一些全局的静态信息进行存储，如生命周期钩子名称、ast节点类型等
    ├── he.js                            一个第三方的用于处理html文本的工具库
    ├── nextTick.js                      通过宏任务原理实现nextTick的底层逻辑
    └── utils.js                         全局的一些公共方法，如isDef、isLooseEqual等

16 directories, 59 files
```



## 目前已实现功能

1. 数据响应化-Observe.js(Array.js-数组响应化的一些相关处理)
2. 数据观察者-Watcher.js（Traverse.js-通过traverse递归访问指定对象，通过触发getter的方式实现依赖收集）
3. 依赖管理者-Dep.js
4. 工具方法\$watch-观察属性变化的方法、​\$set-为对象添加属性或者为数组添加子项，并通知依赖更新、$delete-删除对象属性或删除数组子项并通知依赖更新
5. 虚拟Dom(VNode)
6. 编译器、优化器、代码生成器
7. Vue生命周期钩子、工具方法、全局Api实现
8. 指令的解析
9. 过滤器的实现

## 将要实现的功能

1. 对组件的支持

2. 函数式组件

3. 插槽

4. 虚拟dom的patching算法

5. 将patch后的虚拟dom挂载到真实的dom中

6. 整个项目的工程优化

   


