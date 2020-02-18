// compiler/filter-paser.js 提供解析并生成过滤器的相关方法
/**
 * 解析过滤器
 * @param exp
 */
export const parseFilter = exp => {
    // 通过split将表达式切割成过滤器列表
    let filters = exp.split("|");
    // 将第一个参数拿出来，这个就是我们需要通过过滤器处理的原始数据
    let expression = filters.shift().trim();

    if(filters){
        filters.forEach(filter=>{
            expression = wrapFilter(expression, filter.trim());
        });
        return expression;
    }
    return exp;
};

/**
 * 过滤器转换工具
 * @param exp
 * @param filter
 * @returns {string}
 */
export const wrapFilter = (exp, filter) => {
    // 转义引号
    // 看一下过滤器有没有带参数
    const index = filter.indexOf('(');

    if(index<0){// 没带参数
        return `_f("${filter}")(${exp})`;
    }else{
        const filterName = filter.slice(0,index);
        let args = filter.slice(index+1);

        return `_f("${filterName}")(${exp},${args}`;
    }
};