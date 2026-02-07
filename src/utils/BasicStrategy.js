import * as HandUtils from './HandUtils.js';

export class BasicStrategy {
    static getBestMove(playerHand, dealerUpCard) {
        if (!playerHand || !playerHand.cards || playerHand.cards.length === 0) return 'stand';
        if (!dealerUpCard) return 'stand';

        const pVal = HandUtils.calculateHandValue(playerHand.cards);
        const pSoft = HandUtils.isSoftHand(playerHand.cards);
        const dVal = HandUtils.getCardNumericValue(dealerUpCard);

        // Split Pairs
        if (playerHand.cards.length === 2 &&
            playerHand.cards[0].value === playerHand.cards[1].value) {
            const cardVal = HandUtils.getCardNumericValue(playerHand.cards[0]);

            // Ace-Ace -> Split
            if (cardVal === 11) return 'split';
            // 10-10 -> Stand
            if (cardVal === 10) return 'stand';
            // 9-9 -> Split (except vs 7, 10, A)
            if (cardVal === 9) {
                if (dVal === 7 || dVal === 10 || dVal === 11) return 'stand';
                return 'split';
            }
            // 8-8 -> Split
            if (cardVal === 8) return 'split';
            // 7-7 -> Split (vs 2-7)
            if (cardVal === 7 && dVal >= 2 && dVal <= 7) return 'split';
            // 6-6 -> Split (vs 2-6)
            if (cardVal === 6 && dVal >= 2 && dVal <= 6) return 'split';
            // 5-5 -> Double (treat as Hard 10) -> handled below as hard total
            if (cardVal === 5) { /* fall through to hard total */ }
            // 4-4 -> Split (vs 5-6 only)
            if (cardVal === 4) {
                 if (dVal === 5 || dVal === 6) return 'split';
                 // otherwise hit
                 return 'hit';
            }
            // 3-3, 2-2 -> Split (vs 2-7)
            if ((cardVal === 2 || cardVal === 3) && dVal >= 2 && dVal <= 7) return 'split';
        }

        // Soft Totals (Ace + X)
        if (pSoft) {
            // Soft 20 (A-9) -> Stand
            if (pVal >= 19) return 'stand';
            // Soft 18 (A-7) -> Double vs 3-6, Stand vs 2,7,8, Hit vs 9,10,A
            if (pVal === 18) {
                if (dVal >= 3 && dVal <= 6) return 'double';
                if (dVal === 2 || dVal === 7 || dVal === 8) return 'stand';
                return 'hit';
            }
            // Soft 17 (A-6) -> Double vs 3-6, Hit otherwise
            if (pVal === 17) {
                if (dVal >= 3 && dVal <= 6) return 'double';
                return 'hit';
            }
            // Soft 15/16 (A-4, A-5) -> Double vs 4-6, Hit otherwise
            if (pVal === 15 || pVal === 16) {
                if (dVal >= 4 && dVal <= 6) return 'double';
                return 'hit';
            }
            // Soft 13/14 (A-2, A-3) -> Double vs 5-6, Hit otherwise
            if (pVal === 13 || pVal === 14) {
                if (dVal === 5 || dVal === 6) return 'double';
                return 'hit';
            }
            // Soft 12 (A-A handled in split) -> Hit
            return 'hit';
        }

        // Hard Totals
        if (pVal >= 17) return 'stand';
        if (pVal >= 13 && pVal <= 16) {
            // Stand vs 2-6, Hit vs 7-A
            if (dVal >= 2 && dVal <= 6) return 'stand';
            return 'hit'; // Surrender logic handled elsewhere if available, otherwise hit
        }
        if (pVal === 12) {
            // Stand vs 4-6, Hit otherwise
            if (dVal >= 4 && dVal <= 6) return 'stand';
            return 'hit';
        }
        if (pVal === 11) return 'double';
        if (pVal === 10) {
            if (dVal < 10) return 'double';
            return 'hit';
        }
        if (pVal === 9) {
            if (dVal >= 3 && dVal <= 6) return 'double';
            return 'hit';
        }

        return 'hit';
    }
}
