import Component from "../core/Components";

// Mesh组件定义
export default class Mesh extends Component {
    geometry: string; // 几何类型，如 "cube", "sphere", "plane" 等

    constructor(geometry: string) {
        super();
        this.geometry = geometry;
    }
}