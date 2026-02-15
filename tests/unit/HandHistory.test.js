import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandHistory } from '../../src/utils/HandHistory.js';

// Mock StorageManager so we don't depend on localStorage
vi.mock('../../src/utils/StorageManager.js', () => ({
    StorageManager: {
        set: vi.fn(),
        get: vi.fn(() => null),
    },
}));

import { StorageManager } from '../../src/utils/StorageManager.js';

function makeEntry(n, result = 'win', net = 50) {
    return {
        handNumber: n,
        timestamp: Date.now(),
        playerCards: [[{ value: 'A', suit: '♠' }, { value: 'K', suit: '♥' }]],
        dealerCards: [{ value: '10', suit: '♦' }],
        dealerUpCard: { value: '10', suit: '♦' },
        actions: ['stand'],
        result,
        betAmount: 100,
        netChange: net,
        hadBlackjack: false,
        wasStrategyOptimal: null,
    };
}

describe('HandHistory', () => {
    let history;

    beforeEach(() => {
        history = new HandHistory(5);
        vi.clearAllMocks();
    });

    describe('addHand', () => {
        it('adds entries and keeps newest at index 0', () => {
            history.addHand(makeEntry(1));
            history.addHand(makeEntry(2));
            expect(history.entries[0].handNumber).toBe(2);
            expect(history.entries[1].handNumber).toBe(1);
        });

        it('trims to maxEntries when exceeded', () => {
            for (let i = 1; i <= 7; i++) history.addHand(makeEntry(i));
            expect(history.entries.length).toBe(5);
            // Newest entry should be #7
            expect(history.entries[0].handNumber).toBe(7);
        });

        it('keeps exactly maxEntries after trim', () => {
            for (let i = 0; i < 10; i++) history.addHand(makeEntry(i));
            expect(history.entries.length).toBe(5);
        });
    });

    describe('getHistory', () => {
        it('returns all entries newest first', () => {
            history.addHand(makeEntry(1));
            history.addHand(makeEntry(2));
            history.addHand(makeEntry(3));
            const all = history.getHistory();
            expect(all.map(e => e.handNumber)).toEqual([3, 2, 1]);
        });

        it('returns empty array for new history', () => {
            expect(history.getHistory()).toEqual([]);
        });
    });

    describe('getRecentHands', () => {
        it('returns at most n entries, newest first', () => {
            for (let i = 1; i <= 5; i++) history.addHand(makeEntry(i));
            const recent = history.getRecentHands(3);
            expect(recent.length).toBe(3);
            expect(recent[0].handNumber).toBe(5);
            expect(recent[2].handNumber).toBe(3);
        });

        it('returns all entries when n >= total count', () => {
            history.addHand(makeEntry(1));
            history.addHand(makeEntry(2));
            expect(history.getRecentHands(10).length).toBe(2);
        });
    });

    describe('clear', () => {
        it('removes all entries', () => {
            history.addHand(makeEntry(1));
            history.addHand(makeEntry(2));
            history.clear();
            expect(history.entries).toEqual([]);
        });
    });

    describe('saveToLocalStorage / loadFromLocalStorage', () => {
        it('calls StorageManager.set with the key and entries', () => {
            history.addHand(makeEntry(1));
            history.saveToLocalStorage('test-key');
            expect(StorageManager.set).toHaveBeenCalledWith(
                'test-key',
                { entries: history.entries }
            );
        });

        it('does nothing when storageKey is null or empty', () => {
            history.saveToLocalStorage(null);
            expect(StorageManager.set).not.toHaveBeenCalled();
        });

        it('loads entries from StorageManager', () => {
            const mockEntries = [makeEntry(10), makeEntry(9)];
            StorageManager.get.mockReturnValue({ entries: mockEntries });
            history.loadFromLocalStorage('test-key');
            expect(history.entries.length).toBe(2);
            expect(history.entries[0].handNumber).toBe(10);
        });

        it('starts with empty history when storage returns null', () => {
            StorageManager.get.mockReturnValue(null);
            history.loadFromLocalStorage('test-key');
            expect(history.entries).toEqual([]);
        });

        it('handles corrupt data without throwing', () => {
            StorageManager.get.mockReturnValue({ entries: 'not-an-array' });
            expect(() => history.loadFromLocalStorage('test-key')).not.toThrow();
        });
    });


    describe('Supabase sync', () => {
        it('ignores PGRST116 on load without showing sync notice', async () => {
            const onSyncNotice = vi.fn();
            const supabase = {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })),
                        })),
                    })),
                })),
            };

            const cloudHistory = new HandHistory(5, onSyncNotice);
            await cloudHistory.loadFromSupabase(supabase, 'user-id');

            expect(onSyncNotice).not.toHaveBeenCalled();
        });

        it('shows friendly warning for schema errors when saving', async () => {
            const onSyncNotice = vi.fn();
            const supabase = {
                from: vi.fn(() => ({
                    upsert: vi.fn(async () => ({ error: { code: '42P01' } })),
                })),
            };

            const cloudHistory = new HandHistory(5, onSyncNotice);
            cloudHistory.addHand(makeEntry(1));
            await cloudHistory.saveToSupabase(supabase, 'user-id');

            expect(onSyncNotice).toHaveBeenCalledWith(
                'Histórico na nuvem indisponível. Atualize as migrations do Supabase.',
                'warning'
            );
        });

        it('shows friendly error for generic save failure', async () => {
            const onSyncNotice = vi.fn();
            const supabase = {
                from: vi.fn(() => ({
                    upsert: vi.fn(async () => ({ error: { code: 'XX000', message: 'boom' } })),
                })),
            };

            const cloudHistory = new HandHistory(5, onSyncNotice);
            await cloudHistory.saveToSupabase(supabase, 'user-id');

            expect(onSyncNotice).toHaveBeenCalledWith('Erro ao salvar histórico na nuvem.', 'error');
        });
    });


    describe('maxEntries enforcement', () => {
        it('constructor defaults to 50 entries', () => {
            const h = new HandHistory();
            expect(h.maxEntries).toBe(50);
        });

        it('respects custom maxEntries', () => {
            const h = new HandHistory(3);
            for (let i = 0; i < 5; i++) h.addHand(makeEntry(i));
            expect(h.entries.length).toBe(3);
        });
    });
});
