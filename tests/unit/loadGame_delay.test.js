import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to share variables with the mock factory
const { mockSingle } = vi.hoisted(() => ({ mockSingle: vi.fn() }));

// Mock Supabase
vi.mock('../../src/utils/supabaseClient.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: mockSingle
                }))
            })),
            upsert: vi.fn()
        })),
        auth: {
            onAuthStateChange: vi.fn(),
            signOut: vi.fn(),
        }
    }
}));

// Mock StorageManager
vi.mock('../../src/utils/StorageManager.js', () => ({
    StorageManager: {
        get: vi.fn(),
        set: vi.fn(),
    }
}));

// Import GameManager after mocks
import { GameManager } from '../../src/core/GameManager.js';

describe('GameManager loadGame Performance', () => {
    let gameManager;

    beforeEach(() => {
        vi.clearAllMocks();

        // Simulate a slow network request (500ms delay)
        mockSingle.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            return { data: { balance: 5000, wins: 10, losses: 5, blackjacks: 2, total_winnings: 1000, updated_at: new Date().toISOString() }, error: null };
        });

        // Initialize GameManager with minimal mocks
        gameManager = new GameManager(null, null);
        gameManager.userId = 'test-user-id';
        gameManager.username = 'test-user';
    });

    it('loadGame should complete quickly even with slow network', async () => {
        const start = Date.now();

        // We call loadGame.
        await gameManager.loadGame();

        const duration = Date.now() - start;
        console.log(`loadGame duration: ${duration}ms`);

        // We expect this to fail before optimization
        expect(duration).toBeLessThan(100);

        // Ensure the network request was initiated
        expect(mockSingle).toHaveBeenCalled();
    });
});
