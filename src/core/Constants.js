export const CONFIG = {
    DECKS: 6,
    PENETRATION_THRESHOLD: 0.2, // 20% remaining
    INITIAL_BALANCE: 1000,
    MIN_BET: 10,
    ANIMATION_SPEED: 500,
    PAYOUT: {
        BLACKJACK: 2.5, // 3:2 payout on original bet (1.5 + 1) -> 2.5x total return logic
        REGULAR: 2.0,
        INSURANCE: 3.0
    }
};
