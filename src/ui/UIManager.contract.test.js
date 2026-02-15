import { describe, it, expect, vi } from 'vitest';
import { UIManager } from './UIManager.js';

describe('UIManager facade contract', () => {
    it('routes rendering and bindings through extracted modules', () => {
        const ui = new UIManager();
        ui.uiBindings = { bindEvents: vi.fn() };
        ui.renderer = { render: vi.fn() };

        ui.bindEvents();
        ui.render({ balance: 1000 });

        expect(ui.uiBindings.bindEvents).toHaveBeenCalled();
        expect(ui.renderer.render).toHaveBeenCalledWith({ balance: 1000 });
    });

    it('routes feedback methods through Feedback module', () => {
        const ui = new UIManager();
        ui.feedback = {
            showMessage: vi.fn(),
            showError: vi.fn(),
            hideError: vi.fn(),
            showToast: vi.fn(),
        };

        ui.showMessage('ok', 'info');
        ui.showError('erro');
        ui.hideError();
        ui.showToast('toast', 'success', 1500);

        expect(ui.feedback.showMessage).toHaveBeenCalledWith('ok', 'info');
        expect(ui.feedback.showError).toHaveBeenCalledWith('erro');
        expect(ui.feedback.hideError).toHaveBeenCalled();
        expect(ui.feedback.showToast).toHaveBeenCalledWith('toast', 'success', 1500);
    });
});
