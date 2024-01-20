import Component from "../core/Component";

// Material组件定义
export default class Material extends Component {
    readonly name = "Material";
    
    color: string;

    constructor(color: string) {
        super();
        this.color = color;
    }
}
