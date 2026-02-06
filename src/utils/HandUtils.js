
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

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return { value, isSoft: aces > 0, aces };
}

export function calculateHandValue(hand) {
    return getHandStats(hand).value;
}

export function isSoftHand(hand) {
    return getHandStats(hand).isSoft;
}
