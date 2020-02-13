/**
 * 识别用-作为分隔符的字符串，如："my-new-component"
 * @type {RegExp}
 */
export const camelizeRE = /-(\w)/g;

/**
 * 识别驼峰形式的字符串
 * @type {RegExp}
 */
export const hyphenateRE = /\B([A-Z])/g;

/**
 * 简单类型检测
 * @type {RegExp}
 */
export const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;

/**
 * 用于解析标签名、组件名、属性路径的合法的字母
 * @type {RegExp}
 */
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * 解析原始标签属性
 * 匹配属性格式如：
 * name="kiner" 或
 * name='kiner' 或
 * name=kiner
 * @type {RegExp}
 */
export const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
/**
 * 解析Vue自定义标签属性，如：v-xxx、:value、@click等等
 * @type {RegExp}
 */
export const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
/**
 * 合法标签名
 * @type {string}
 */
export const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
/**
 * 匹配 <rd:DefaultName>sno</rd:DefaultName> 的情况，一般出现在xml中
 * @type {string}
 */
export const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
/**
 * 匹配开始标签
 * <div>这是开始标签
 * @type {RegExp}
 */
export const startTagOpen = new RegExp(`^<${qnameCapture}`);
/**
 * 标签的结束符，如：div> 或 img/>
 * @type {RegExp}
 */
export const startTagClose = /^\s*(\/?)>/;
/**
 * 结束标签
 * @type {RegExp}
 */
export const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
/**
 * 匹配文档类型标签
 * @type {RegExp}
 */
export const doctype = /^<!DOCTYPE [^>]+>/i;
// #7298: escape - to avoid being passed as HTML comment when inlined in page
/**
 * 匹配注释
 * @type {RegExp}
 */
export const comment = /^<!\--/;
/**
 * 匹配条件注释
 * @type {RegExp}
 */
export const conditionalComment = /^<!\[/;

/**
 * 解析普通的属性
 * @type {RegExp}
 */
export const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
/**
 * 解析换行的属性
 * e.g.
 * <MyComp
 *      title="测试标题"
 *      content="测试内容"
 * ></MyComp>
 * @type {RegExp}
 */
export const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

/**
 * 用于检测非法属性名
 * @type {RegExp}
 */
export const invalidAttributeRE = /[\s"'<>\/=]/;

/**
 * 用于解析v-for中的表达式
 * e.g.
 * v-for="item in arr"
 * v-for="(item,index) in arr"
 * v-for="item of arr"
 * v-for="(item,index) of arr"
 * @type {RegExp}
 */
export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;

/**
 * 解析迭代项
 * e.g.
 * v-for="(item,index) in arr"
 * 将item和index解析出来
 * @type {RegExp}
 */
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;

/**
 * 匹配括号
 * @type {RegExp}
 */
export const stripParensRE = /^\(|\)$/g;