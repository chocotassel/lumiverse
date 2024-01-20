import Component from "./Component";
import { Transform } from "./type";

export default class GameObject {
    name: Symbol;
    transform: Transform;
    components: Map<Symbol, Component>;
    enabled: boolean;

    constructor(name) {
        this.name = name;
        this.components = new Map();
        this.enabled = true;
    }

    addComponent(componentType, component) {
        this.components.set(componentType, component);
        component.gameObject = this; // 设置组件的父对象引用
    }

    getComponent(componentType) {
        return this.components.get(componentType);
    }

    update() {
        // 更新该对象的所有组件
        this.components.forEach(component => {
            if (component.enabled) {
                component.update();
            }
        });
    }

    // 其他必要的方法...
}
