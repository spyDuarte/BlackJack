import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UIManager } from '../../src/ui/UIManager.js';

function createClassList() {
    const classes = new Set();
    return {
        add: (cls) => classes.add(cls),
        remove: (cls) => classes.delete(cls),
        contains: (cls) => classes.has(cls),
    };
}

function createButton(display = 'none') {
    return {
        style: { display },
        disabled: false,
        classList: createClassList(),
    };
}

describe('UIManager action controls and keyboard', () => {
    let ui;

    beforeEach(() => {
        ui = new UIManager();
        ui.elements = {
            gameControls: { style: { display: 'flex' } },
            hitBtn: createButton('inline-block'),
            standBtn: createButton('inline-block'),
            doubleBtn: createButton('inline-block'),
            splitBtn: createButton('none'),
            surrenderBtn: createButton('none'),
            newGameBtn: createButton('none'),
            rebetBtn: createButton('none'),
        };

        ui.game = {
            balance: 200,
            currentBet: 50,
            canDouble: vi.fn(() => true),
            hit: vi.fn(),
            stand: vi.fn(),
            double: vi.fn(),
            split: vi.fn(),
            surrender: vi.fn(),
            newGame: vi.fn(),
            rebetAndDeal: vi.fn(),
            getState: vi.fn(() => null),
        };
    });

    it('applies declarative visibility/disabled rules by turn', () => {
        const playingState = {
            gameStarted: true,
            gameOver: false,
            balance: 200,
            currentHandIndex: 0,
            playerHands: [{
                cards: [{ value: '8', suit: '♠' }, { value: '8', suit: '♥' }],
                bet: 50,
                status: 'playing',
            }],
        };

        ui._updateActionControls(playingState);

        expect(ui.elements.splitBtn.style.display).toBe('inline-block');
        expect(ui.elements.surrenderBtn.style.display).toBe('inline-block');
        expect(ui.elements.doubleBtn.disabled).toBe(false);

        const dealerTurnState = {
            ...playingState,
            playerHands: [{ ...playingState.playerHands[0], status: 'stand' }],
        };

        ui._updateActionControls(dealerTurnState);

        expect(ui.elements.hitBtn.disabled).toBe(true);
        expect(ui.elements.standBtn.disabled).toBe(true);
        expect(ui.elements.splitBtn.style.display).toBe('none');
        expect(ui.elements.surrenderBtn.style.display).toBe('none');
    });

    it('supports valid keyboard shortcuts and ignores removed hint shortcut', () => {
        const event = (key) => ({ key, target: { tagName: 'DIV' }, preventDefault: vi.fn() });

        ui.handleKeyboard(event('h'));
        ui.handleKeyboard(event('s'));
        ui.handleKeyboard(event('d'));
        ui.handleKeyboard(event('p'));
        ui.handleKeyboard(event('r'));
        ui.handleKeyboard(event('?'));

        expect(ui.game.hit).toHaveBeenCalledTimes(1);
        expect(ui.game.stand).toHaveBeenCalledTimes(1);
        expect(ui.game.double).toHaveBeenCalledTimes(1);
        expect(ui.game.split).toHaveBeenCalledTimes(1);
        expect(ui.game.surrender).toHaveBeenCalledTimes(1);
    });

    it('keeps training feedback working without hint button element', () => {
        vi.useFakeTimers();

        const feedbackEl = {
            className: '',
            textContent: '',
            style: { display: 'none' },
            classList: createClassList(),
        };
        ui.elements.trainingFeedback = feedbackEl;
        ui.elements.hintBtn = null;

        ui.showTrainingFeedback({
            isOptimal: false,
            isSuboptimal: false,
            recommendedLabel: 'Parar',
            explanation: 'Mão dura contra carta alta do dealer.',
        });

        expect(feedbackEl.style.display).toBe('block');
        expect(feedbackEl.textContent).toContain('❌ Melhor: Parar');

        vi.advanceTimersByTime(3500);
        expect(feedbackEl.style.display).toBe('none');

        vi.useRealTimers();
    });
});
