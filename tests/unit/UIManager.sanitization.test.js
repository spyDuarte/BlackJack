import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager } from '../../src/ui/UIManager.js';

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toLowerCase();
        this.attributes = {};
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.style = {};
        this._textContent = '';
    }

    set textContent(value) {
        this._textContent = String(value);
        this.children = [];
    }

    get textContent() {
        const childrenText = this.children.map((child) => child.textContent).join('');
        return this._textContent + childrenText;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        nodes.forEach((node) => this.appendChild(node));
    }

    set innerHTML(value) {
        if (value === '') {
            this.children = [];
            this._textContent = '';
            return;
        }
        throw new Error('FakeElement only supports clearing innerHTML in tests');
    }

    get innerHTML() {
        return '';
    }

    _matchesSelector(selector) {
        if (selector.startsWith('.')) {
            const classList = this.className.split(/\s+/).filter(Boolean);
            return classList.includes(selector.slice(1));
        }
        return this.tagName === selector.toLowerCase();
    }

    querySelector(selector) {
        for (const child of this.children) {
            if (child._matchesSelector(selector)) {
                return child;
            }
            const nested = child.querySelector(selector);
            if (nested) {
                return nested;
            }
        }
        return null;
    }
}

class FakeDocument {
    createElement(tagName) {
        return new FakeElement(tagName);
    }
}

describe('UIManager rendering sanitization', () => {
    beforeEach(() => {
        global.document = new FakeDocument();
    });

    it('renderHistoryPanel should render imported/history payload as literal text', () => {
        const manager = new UIManager();
        const historyList = document.createElement('div');
        manager.elements = { historyList };

        const payload = '<img src=x onerror="window.__xss=true">';
        manager.renderHistoryPanel([
            {
                handNumber: payload,
                result: payload,
                playerCards: [[{ value: payload, suit: '</span><script>window.__xss=true</script>' }]],
                dealerUpCard: { value: payload, suit: payload },
                netChange: -10,
            },
        ]);

        expect(historyList.querySelector('script')).toBeNull();
        expect(historyList.querySelector('img')).toBeNull();

        const firstItem = historyList.querySelector('.history-item');
        expect(firstItem).not.toBeNull();
        expect(firstItem.textContent).toContain(payload);
        expect(firstItem.textContent).toContain('</span><script>window.__xss=true</script>');
    });

    it('_renderAdvancedStatsGrid should render values as plain text', () => {
        const manager = new UIManager();
        const statsAdvancedGrid = document.createElement('div');
        manager.elements = { statsAdvancedGrid };

        manager._renderAdvancedStatsGrid({
            winRate: '<svg onload=alert(1)>',
            netROI: 0,
            longestWinStreak: 1,
            longestLossStreak: 1,
            sessionBestBalance: 100,
            sessionWorstBalance: 50,
            doubleDownEfficiency: 10,
            splitEfficiency: 20,
            strategyComplianceRate: 30,
            totalAmountWagered: '</div><script>alert(1)</script>',
        });

        expect(statsAdvancedGrid.querySelector('script')).toBeNull();
        expect(statsAdvancedGrid.textContent).toContain('<svg onload=alert(1)>%');
        expect(statsAdvancedGrid.textContent).toContain('</div><script>alert(1)</script>');
    });
});
