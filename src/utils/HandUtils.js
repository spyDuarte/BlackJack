/**
 * Utility functions for Blackjack hand calculations.
 */

/**
 * Returns the numeric blackjack value of a card.
 * A=11, Face=10, others=number.
 * @param {Object} card - The card object {value, suit}.
 * @returns {number} Numeric value (1-11).
 */
export function getCardNumericValue(card) {
    if (!card) return 0;
    if (card.value === 'A') {
        return 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
        return 10;
    } else {
        return parseInt(card.value);
    }
}

/**
 * Calculates the total value and properties of a hand.
 * Handles Ace conversion from 11 to 1.
 * @param {Array<Object>} hand - Array of card objects.
 * @returns {Object} { value: number, isSoft: boolean, aces: number }
 */
export function getHandStats(hand) {
    let value = 0;
    let aces = 0;

    if (!hand || !Array.isArray(hand)) {
        return { value: 0, isSoft: false, aces: 0 };
    }

    for (const card of hand) {
        if (!card) continue;
        const cardValue = getCardNumericValue(card);
        value += cardValue;
        if (cardValue === 11) aces++;
    }

    // Downgrade Aces if busted
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return { value, isSoft: aces > 0, aces };
}

/**
 * Calculates the final numeric value of a hand.
 * @param {Array<Object>} hand - Array of card objects.
 * @returns {number} Hand value (best possible <= 21).
 */
export function calculateHandValue(hand) {
    return getHandStats(hand).value;
}

/**
 * Checks if a hand is "soft" (contains an Ace counted as 11).
 * @param {Array<Object>} hand - Array of card objects.
 * @returns {boolean} True if soft.
 */
export function isSoftHand(hand) {
    return getHandStats(hand).isSoft;
}

/**
 * Checks if a hand is a "Natural Blackjack" (Ace + 10/Face on first 2 cards).
 * @param {Array<Object>} hand - Array of card objects.
 * @param {number} handsCount - Total number of player hands (to invalidate split BJ).
 * @returns {boolean} True if natural blackjack.
 */
export function isNaturalBlackjack(hand, handsCount) {
    if (!hand || !Array.isArray(hand) || hand.length !== 2) return false;
    if (handsCount > 1) return false; // 21 after split is not natural BJ
    return calculateHandValue(hand) === 21;
}

/**
 * Returns the Hi-Lo counting value for a card.
 * 2-6: +1
 * 7-9: 0
 * 10-A: -1
 * @param {Object} card - The card object.
 * @returns {number} The Hi-Lo value.
 */
export function getHiLoValue(card) {
    if (!card) return 0;
    const val = getCardNumericValue(card);
    if (val >= 2 && val <= 6) return 1;
    if (val >= 10 || val === 11 || card.value === 'A') return -1; // 10, J, Q, K, A
    return 0; // 7, 8, 9
}
