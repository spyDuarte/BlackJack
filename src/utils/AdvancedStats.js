/**
 * AdvancedStats - derives extended statistics from hand history and base stats.
 * Pure computation module — no DOM, no storage dependencies.
 */

/**
 * Computes advanced statistics from hand history and base game counters.
 * @param {Array<Object>} history - Array of HandHistory entries (newest first).
 * @param {Object} baseStats
 * @param {number} baseStats.wins
 * @param {number} baseStats.losses
 * @param {number} baseStats.blackjacks
 * @param {number} baseStats.totalWinnings
 * @param {number} baseStats.balance
 * @param {number} baseStats.totalAmountWagered
 * @param {number} baseStats.sessionBestBalance
 * @param {number} baseStats.sessionWorstBalance
 * @returns {Object} Advanced statistics object.
 */
export function computeAdvancedStats(history, baseStats) {
    const {
        wins = 0,
        losses = 0,
        totalWinnings = 0,
        totalAmountWagered = 0,
        sessionBestBalance = 0,
        sessionWorstBalance = 0,
    } = baseStats || {};

    const handsPlayed = wins + losses + (baseStats.ties || 0);
    const winRate = handsPlayed > 0 ? (wins / handsPlayed) * 100 : 0;
    const netROI = totalAmountWagered > 0 ? (totalWinnings / totalAmountWagered) * 100 : 0;

    // Work through history oldest→newest for streak calculations
    const chronological = [...history].reverse();

    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    let doubleDownWins = 0;
    let doubleDownLosses = 0;
    let splitWins = 0;
    let splitLosses = 0;

    let strategyOptimalCount = 0;
    let strategyTotalCount = 0;

    chronological.forEach(entry => {
        const result = entry.result;

        // Streaks (ignore tie/surrender for streak purposes)
        if (result === 'win') {
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
        } else if (result === 'lose') {
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
        }

        // Double down efficiency
        if (entry.actions && entry.actions.includes('double')) {
            if (result === 'win') doubleDownWins++;
            else if (result === 'lose') doubleDownLosses++;
        }

        // Split efficiency
        if (entry.actions && entry.actions.includes('split')) {
            if (result === 'win') splitWins++;
            else if (result === 'lose') splitLosses++;
        }

        // Strategy compliance
        if (entry.wasStrategyOptimal !== null && entry.wasStrategyOptimal !== undefined) {
            strategyTotalCount++;
            if (entry.wasStrategyOptimal === true) strategyOptimalCount++;
        }
    });

    // Current streak (from newest entry)
    let currentStreak = { type: 'none', count: 0 };
    if (history.length > 0) {
        const latestResult = history[0].result;
        let count = 0;
        for (const entry of history) {
            if (entry.result === latestResult) count++;
            else break;
        }
        currentStreak = {
            type: latestResult === 'win' ? 'win' : latestResult === 'lose' ? 'loss' : 'other',
            count,
        };
    }

    const doubleTotal = doubleDownWins + doubleDownLosses;
    const splitTotal = splitWins + splitLosses;

    return {
        winRate: Math.round(winRate * 10) / 10,
        netROI: Math.round(netROI * 10) / 10,
        longestWinStreak,
        longestLossStreak,
        currentStreak,
        sessionBestBalance,
        sessionWorstBalance,
        doubleDownWins,
        doubleDownLosses,
        doubleDownEfficiency: doubleTotal > 0 ? Math.round((doubleDownWins / doubleTotal) * 1000) / 10 : null,
        splitWins,
        splitLosses,
        splitEfficiency: splitTotal > 0 ? Math.round((splitWins / splitTotal) * 1000) / 10 : null,
        strategyComplianceRate: strategyTotalCount > 0
            ? Math.round((strategyOptimalCount / strategyTotalCount) * 1000) / 10
            : null,
        totalAmountWagered,
        handsPlayed: history.length,
        wins,
        losses,
    };
}
