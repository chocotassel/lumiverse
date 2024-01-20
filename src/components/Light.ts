import Component from "../core/Component";

export default class Light extends Component {
    readonly name = "Light";

    type: string;
    color: string;
    intensity: number;

    constructor(type: string, color: string, intensity: number) {
        super();
        this.type = type;
        this.color = color;
        this.intensity = intensity;
    }

    illuminate() {
        // 光照计算逻辑
    }

    update() {
        super.update();
        // 光照特有的更新逻辑
    }
}