/**
 * Basic Strategy lookup module for Blackjack.
 * Encodes the canonical Vegas Strip basic strategy tables.
 *
 * Action codes:
 *   H   = Hit
 *   S   = Stand
 *   D   = Double down (if allowed, else Hit)
 *   DS  = Double down (if allowed, else Stand)
 *   P   = Split
 *   SP  = Split if Double After Split allowed, else Hit
 *   SU  = Surrender (if allowed, else Hit)
 *   US  = Surrender (if allowed, else Stand)
 */

import { classifyHand, getCardNumericValue } from './HandUtils.js';

// Dealer upcard column index: 2,3,4,5,6,7,8,9,10,A
const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

// Hard totals: rows keyed by player total (5–21)
// Each row: [d2, d3, d4, d5, d6, d7, d8, d9, d10, dA]
const HARD = {
    5:  ['H','H','H','H','H','H','H','H','H','H'],
    6:  ['H','H','H','H','H','H','H','H','H','H'],
    7:  ['H','H','H','H','H','H','H','H','H','H'],
    8:  ['H','H','H','H','H','H','H','H','H','H'],
    9:  ['H','D','D','D','D','H','H','H','H','H'],
    10: ['D','D','D','D','D','D','D','D','H','H'],
    11: ['D','D','D','D','D','D','D','D','D','H'],
    12: ['H','H','S','S','S','H','H','H','H','H'],
    13: ['S','S','S','S','S','H','H','H','H','H'],
    14: ['S','S','S','S','S','H','H','H','H','H'],
    15: ['S','S','S','S','S','H','H','H','SU','H'],
    16: ['S','S','S','S','S','H','H','SU','SU','SU'],
    17: ['S','S','S','S','S','S','S','S','S','US'],
    18: ['S','S','S','S','S','S','S','S','S','S'],
    19: ['S','S','S','S','S','S','S','S','S','S'],
    20: ['S','S','S','S','S','S','S','S','S','S'],
    21: ['S','S','S','S','S','S','S','S','S','S'],
};

// Soft totals: rows keyed by the non-Ace card value (2–9, representing A+2 through A+9)
// A+2 = soft 13, A+9 = soft 20
const SOFT = {
    2:  ['H','H','H','D','D','H','H','H','H','H'],  // A+2 = soft 13
    3:  ['H','H','H','D','D','H','H','H','H','H'],  // A+3 = soft 14
    4:  ['H','H','D','D','D','H','H','H','H','H'],  // A+4 = soft 15
    5:  ['H','H','D','D','D','H','H','H','H','H'],  // A+5 = soft 16
    6:  ['H','D','D','D','D','H','H','H','H','H'],  // A+6 = soft 17
    7:  ['DS','DS','DS','DS','DS','S','S','H','H','H'],  // A+7 = soft 18
    8:  ['S','S','S','S','S','S','S','S','S','S'],   // A+8 = soft 19
    9:  ['S','S','S','S','S','S','S','S','S','S'],   // A+9 = soft 20
};

// Pairs: rows keyed by card value (2–10, A)
// Each row: [d2, d3, d4, d5, d6, d7, d8, d9, d10, dA]
const PAIR = {
    '2':  ['SP','SP','P','P','P','P','H','H','H','H'],
    '3':  ['SP','SP','P','P','P','P','H','H','H','H'],
    '4':  ['H','H','H','SP','SP','H','H','H','H','H'],
    '5':  ['D','D','D','D','D','D','D','D','H','H'],   // Never split 5s, treat as hard 10
    '6':  ['SP','P','P','P','P','H','H','H','H','H'],
    '7':  ['P','P','P','P','P','P','H','H','H','H'],
    '8':  ['P','P','P','P','P','P','P','P','P','P'],   // Always split 8s
    '9':  ['P','P','P','P','P','S','P','P','S','S'],
    '10': ['S','S','S','S','S','S','S','S','S','S'],   // Never split 10s
    'J':  ['S','S','S','S','S','S','S','S','S','S'],
    'Q':  ['S','S','S','S','S','S','S','S','S','S'],
    'K':  ['S','S','S','S','S','S','S','S','S','S'],
    'A':  ['P','P','P','P','P','P','P','P','P','P'],   // Always split Aces
};

const ACTION_LABELS = {
    hit: 'Pedir Carta',
    stand: 'Parar',
    double: 'Dobrar',
    split: 'Dividir',
    surrender: 'Desistir',
};

const EXPLANATIONS = {
    H:  'Estratégia básica recomenda pedir carta.',
    S:  'Estratégia básica recomenda parar.',
    D:  'Dobrar a aposta é otimamente lucrativo aqui.',
    DS: 'Dobrar é ótimo aqui; se não puder, pare.',
    P:  'Dividir este par maximiza o retorno esperado.',
    SP: 'Dividir se puder dobrar após; senão, peça carta.',
    SU: 'Desistir reduz a perda esperada; senão, peça carta.',
    US: 'Desistir é ótimo; senão, pare.',
};

/**
 * Gets the dealer upcard column index (0–9).
 */
function getDealerColIndex(dealerUpCard) {
    if (!dealerUpCard) return -1;
    const val = dealerUpCard.value;
    // 10-value cards (10, J, Q, K) all map to column index 8
    if (['J', 'Q', 'K'].includes(val)) return 8;
    const idx = DEALER_COLS.indexOf(val);
    return idx === -1 ? 8 : idx;
}

/**
 * Resolves a strategy code into a concrete action given the rule profile.
 * @param {string} code - Raw strategy code (H, S, D, DS, P, SP, SU, US)
 * @param {Object} ruleProfile - Active rule profile from Constants.js
 * @param {boolean} canSplit - Whether splitting is currently available
 * @returns {{ action: string, finalCode: string }}
 */
function resolveCode(code, ruleProfile, canSplit) {
    const canDouble = ruleProfile.doubleAfterSplit !== undefined; // doubleAfterSplit present means doubling exists
    const canSurrender = ruleProfile.surrenderType && ruleProfile.surrenderType !== 'none';
    const hasDAS = ruleProfile.doubleAfterSplit === true;

    switch (code) {
        case 'H':  return { action: 'hit',       finalCode: 'H' };
        case 'S':  return { action: 'stand',      finalCode: 'S' };
        case 'D':  return canDouble ? { action: 'double', finalCode: 'D' } : { action: 'hit', finalCode: 'H' };
        case 'DS': return canDouble ? { action: 'double', finalCode: 'DS' } : { action: 'stand', finalCode: 'S' };
        case 'P':  return canSplit  ? { action: 'split',  finalCode: 'P' } : { action: 'hit', finalCode: 'H' };
        case 'SP': return (canSplit && hasDAS) ? { action: 'split', finalCode: 'SP' } : { action: 'hit', finalCode: 'H' };
        case 'SU': return canSurrender ? { action: 'surrender', finalCode: 'SU' } : { action: 'hit', finalCode: 'H' };
        case 'US': return canSurrender ? { action: 'surrender', finalCode: 'US' } : { action: 'stand', finalCode: 'S' };
        default:   return { action: 'hit', finalCode: 'H' };
    }
}

/**
 * Returns the recommended action for a given player hand and dealer upcard.
 * @param {Array<Object>} playerCards - Player's current cards.
 * @param {Object} dealerUpCard - Dealer's visible card.
 * @param {Object} ruleProfile - Active rule profile.
 * @param {boolean} [canSplit=true] - Whether the player is currently allowed to split.
 * @returns {{ action: string, code: string, explanation: string, handType: string, playerTotal: number }}
 */
export function getRecommendedAction(playerCards, dealerUpCard, ruleProfile, canSplit = true) {
    if (!playerCards || playerCards.length === 0 || !dealerUpCard || !ruleProfile) {
        return { action: 'hit', code: 'H', explanation: 'Pedir carta.', handType: 'hard', playerTotal: 0 };
    }

    const colIdx = getDealerColIndex(dealerUpCard);
    if (colIdx === -1) {
        return { action: 'hit', code: 'H', explanation: 'Pedir carta.', handType: 'hard', playerTotal: 0 };
    }

    const { type, total, pairValue } = classifyHand(playerCards);

    let rawCode = 'H';
    let handType = type;

    if (type === 'pair' && canSplit) {
        const row = PAIR[pairValue];
        rawCode = row ? row[colIdx] : 'H';
    } else if (type === 'soft') {
        // Find non-Ace card value for soft hand lookup
        // total = soft total (e.g. 18 for A+7). Non-ace card = total - 11
        const nonAceVal = total - 11;
        const row = SOFT[nonAceVal];
        rawCode = row ? row[colIdx] : (total >= 19 ? 'S' : 'H');
    } else {
        // Hard hand
        const clampedTotal = Math.min(21, Math.max(5, total));
        const row = HARD[clampedTotal];
        rawCode = row ? row[colIdx] : (total >= 17 ? 'S' : 'H');
        handType = 'hard';
    }

    const { action, finalCode } = resolveCode(rawCode, ruleProfile, canSplit && type === 'pair');

    return {
        action,
        code: rawCode,
        explanation: EXPLANATIONS[rawCode] || 'Siga a estratégia básica.',
        handType,
        playerTotal: total,
    };
}

/**
 * Evaluates a player action against the optimal basic strategy.
 * @param {string} playerAction - The action the player took.
 * @param {Array<Object>} playerCards - Player's cards at the time of decision.
 * @param {Object} dealerUpCard - Dealer's visible card.
 * @param {Object} ruleProfile - Active rule profile.
 * @param {boolean} [canSplit=true] - Whether splitting was available.
 * @returns {{ isOptimal: boolean, isSuboptimal: boolean, isWrong: boolean, recommended: string, recommendedLabel: string, explanation: string }}
 */
export function evaluatePlayerAction(playerAction, playerCards, dealerUpCard, ruleProfile, canSplit = true) {
    const recommendation = getRecommendedAction(playerCards, dealerUpCard, ruleProfile, canSplit);
    const recommended = recommendation.action;

    if (playerAction === recommended) {
        return {
            isOptimal: true,
            isSuboptimal: false,
            isWrong: false,
            recommended,
            recommendedLabel: ACTION_LABELS[recommended] || recommended,
            explanation: recommendation.explanation,
        };
    }

    // Suboptimal: action is in the same family (e.g. stand vs surrender on 17 — both defensive)
    const defensiveActions = new Set(['stand', 'surrender']);
    const aggressiveActions = new Set(['hit', 'double']);
    const isSuboptimal =
        (defensiveActions.has(playerAction) && defensiveActions.has(recommended)) ||
        (aggressiveActions.has(playerAction) && aggressiveActions.has(recommended));

    return {
        isOptimal: false,
        isSuboptimal,
        isWrong: !isSuboptimal,
        recommended,
        recommendedLabel: ACTION_LABELS[recommended] || recommended,
        explanation: recommendation.explanation,
    };
}
