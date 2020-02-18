// shared/SimpleStack.js 实现了一个简单的栈

class SimpleStack {
    constructor() {
        this.stack = [];
    }

    push(item) {
        this.stack.push(item);
    }

    pop() {
        return this.stack.pop();
    }

    size(){
        return this.stack.length;
    }

    empty(){
        return this.size()===0;
    }

    top(){
        return this.stack[this.size()-1];
    }

    findIndex(handle){
        let pos = this.size() - 1;
        for(;pos>=0;pos--){
            let cur = this.stack[pos];
            if(cur&&handle(cur)){
                return pos;
            }
        }
        return -1;
    }
    get(pos){
        return this.stack[pos];
    }

    popItemByStartIndex(index){
        return this.stack.splice(index).reverse();
    }

    clear(){
        this.stack = [];
    }

    print(){
        console.log(`%c当前栈的数据结构是：`,'color: green', JSON.stringify(this.stack));
    }
}

export default SimpleStack;