import GameObject from "../core/GameObject";

// Scene.js
export class Scene {
    gameObjects: GameObject[];
    
    constructor() {
        this.gameObjects = [];
    }

    // 添加对象到场景
    addObject(object: GameObject) {
        this.gameObjects.push(object);
    }

    // 更新场景状态
    update() {
        // 更新场景中的每个对象
        this.gameObjects.forEach(object => {
            object.update();
        });

        // 更新光源和相机（如果需要）
    }

    // 获取场景中的所有对象
    getObjects() {
        return this.gameObjects;
    }
}
