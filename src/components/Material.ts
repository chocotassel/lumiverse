import Component from "../core/Components";

// Material组件定义
export default class Material extends Component {
    color: string;

    constructor(color: string) {
        super();
        this.color = color;
    }
}
