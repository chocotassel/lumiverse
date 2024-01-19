import GameObject from "./GameObject";

export default class Component {
    gameObject: GameObject | null = null;
    enabled: boolean = true;

    start() {
        // 初始化代码
    }

    update() {
        // 每帧更新代码
    }
}