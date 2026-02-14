export const CONFIG = {
    DECKS: 6,
    PENETRATION_THRESHOLD: 0.2, // 20% remaining
    SHUFFLE_MODE: 'fair', // 'fair' (Fisher-Yates) | 'casino' (riffle/strip/cut simulation)
    CASINO_SHUFFLE_PASSES: 4,
    BURN_CARDS_AFTER_SHUFFLE: 1,
    INITIAL_BALANCE: 1000,
    MIN_BET: 10,
    MAX_SPLITS: 3, // Maximum number of splits allowed (standard casino rule)
    FIVE_CARD_CHARLIE: false, // Set to true to enable 5-Card Charlie rule
    ANIMATION_SPEED: 500,
    STORAGE_VERSION: 2, // Data version for migration support
    PAYOUT: {
        BLACKJACK: 2.5, // 3:2 payout on original bet (1.5 + 1) -> 2.5x total return logic
        REGULAR: 2.0,
        INSURANCE: 3.0
    },
    DELAYS: {
        DEAL: 500,
        TURN: 500,
        DEALER_TURN: 500,
        GAME_OVER: 750,
        RESET: 2000,
        NEXT_HAND: 250,
        LOADING: 400,
        INSURANCE_MODAL: 1000
    }
};

export const RULES = {
    ACTIVE_PROFILE: 'vegas_strip',
    PROFILES: {
        vegas_strip: {
            dealerHitsSoft17: true,
            blackjackPayout: 2.5,
            doubleAfterSplit: true,
            resplitAces: false,
            holeCardPolicy: 'peek',
            surrenderType: 'late'
        },
        atlantic_city: {
            dealerHitsSoft17: false,
            blackjackPayout: 2.5,
            doubleAfterSplit: true,
            resplitAces: true,
            holeCardPolicy: 'peek',
            surrenderType: 'late'
        },
        european_no_hole_card: {
            dealerHitsSoft17: false,
            blackjackPayout: 2.2,
            doubleAfterSplit: true,
            resplitAces: false,
            holeCardPolicy: 'no_peek',
            surrenderType: 'none'
        }
    },
    // Set to 'any' for any 2-card hand, or an array like [9, 10, 11].
    DOUBLE_TOTALS: 'any'
};

export function getActiveRuleProfile() {
    return RULES.PROFILES[RULES.ACTIVE_PROFILE] || RULES.PROFILES.vegas_strip;
}
