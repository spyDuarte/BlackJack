export class Renderer {
    constructor(ui) {
        this.ui = ui;
    }

    render(state) {
        this.ui._renderCore(state);
    }
}
