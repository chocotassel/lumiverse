import Component from "../core/Component";

// Mesh组件定义
export default class Mesh extends Component {
    readonly name = "Mesh";

    geometry: string; // 几何类型，如 "cube", "sphere", "plane" 等
    vertices: Float32Array; // 顶点数组
    indices: Uint16Array; // 索引数组

    constructor(geometry: string) {
        super();
        this.geometry = geometry;
    }
}