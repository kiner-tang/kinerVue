export default {
    // 调试选项
    debug:{
        // 是否显示警告
        showWarn: false
    },
    // 用于v-on中定义键值的别名
    // e.g.
    // keyCodes: {'my-key-alias': 123}
    // <input v-on:input.my-key-alias="handler"/>
    // 如上实例中，只有当输入字符的键值是123的时候才会触发handler
    keyCodes: Object.create(null)
};