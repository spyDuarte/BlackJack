export class UIBindings {
    constructor(ui) {
        this.ui = ui;
    }

    bindEvents() {
        this.ui._bindEventsCore();
    }
}
