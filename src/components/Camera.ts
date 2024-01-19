import Component from "../core/Components";

export default class Camera extends Component {
    fieldOfView: number;
    nearClipPlane: number;
    farClipPlane: number;

    constructor(fieldOfView: number, nearClipPlane: number, farClipPlane: number) {
        super();
        this.fieldOfView = fieldOfView;
        this.nearClipPlane = nearClipPlane;
        this.farClipPlane = farClipPlane;
    }

    render() {
        // 渲染逻辑
    }

    update() {
        super.update();
        // 相机特有的更新逻辑
    }
}