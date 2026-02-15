export class Feedback {
    constructor(ui) {
        this.ui = ui;
    }

    showMessage(text, type) {
        this.ui._showMessageCore(text, type);
    }

    showError(msg) {
        this.ui._showErrorCore(msg);
    }

    hideError() {
        this.ui._hideErrorCore();
    }

    showToast(message, type = 'info', duration = 3000) {
        this.ui._showToastCore(message, type, duration);
    }
}
