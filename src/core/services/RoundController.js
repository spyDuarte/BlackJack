import { CONFIG, getActiveRuleProfile } from '../Constants.js';
import * as HandUtils from '../../utils/HandUtils.js';

export class RoundController {
    constructor(game) {
        this.game = game;
    }

    startGame() {
        if (this.game.currentBet < CONFIG.MIN_BET || this.game.currentBet > this.game.balance) {
            if (this.game.ui) this.game.ui.showMessage('Aposta inválida!', 'lose');
            if (this.game.soundManager) this.game.soundManager.play('lose');
            return;
        }

        this.game.handCounter++;
        this.game.currentHandActions = [];
        this.game.balance -= this.game.currentBet;

        if (this.game.engine.deck.needsReshuffle) {
            this.game.events.emit('deck:shuffle');
            if (this.game.ui) {
                this.game.ui.showMessage('Embaralhando...', '');
                this.game.ui.showToast('Sapato reembaralhado', 'info', 2000);
            }
        }

        const { dealerHand } = this.game.engine.startGame(this.game.currentBet);

        this.game.updateUI();
        if (this.game.soundManager) this.game.soundManager.play('card');
        this.game.events.emit('game:started', this.game.getState());

        if (this.game.ui) {
            this.game.ui.toggleGameControls(false);
            this.game.ui.showMessage('Boa sorte!');
        }

        const profile = getActiveRuleProfile();
        const dealerUpCard = dealerHand[0];
        const dealerUpVal = HandUtils.getCardNumericValue(dealerUpCard);

        if (profile.holeCardPolicy === 'peek') {
            if (dealerUpCard.value === 'A') {
                this.game.addTimeout(() => {
                    if (this.game.ui) this.game.ui.toggleInsuranceModal(true);
                }, CONFIG.DELAYS.INSURANCE_MODAL);
            } else if (dealerUpVal === 10) {
                this.game.addTimeout(() => this.game.checkDealerBlackjack(), CONFIG.DELAYS.DEAL);
            } else {
                this.game.addTimeout(() => this.game.startPlayerTurn(), CONFIG.DELAYS.DEAL);
            }
        } else {
            this.game.addTimeout(() => this.game.startPlayerTurn(), CONFIG.DELAYS.DEAL);
        }
    }

    startPlayerTurn() {
        if (this.game.ui) {
            this.game.ui.toggleGameControls(true);
            this.game.ui.showMessage('Sua vez!');
        }
        this.game.updateUI();

        const pVal = HandUtils.calculateHandValue(this.game.engine.playerHands[0].cards);
        if (pVal === 21) {
            this.game.addTimeout(() => this.game.endGame(), CONFIG.DELAYS.TURN);
        }
    }

    checkDealerBlackjack() {
        const val = HandUtils.calculateHandValue(this.game.engine.dealerHand);
        if (val === 21 && this.game.engine.dealerHand.length === 2) {
            this.game.engine.dealerRevealed = true;
            this.game.updateUI();
            if (this.game.ui) this.game.ui.showMessage('Dealer tem Blackjack!', 'lose');
            this.game.addTimeout(() => this.game.endGame(), CONFIG.DELAYS.GAME_OVER);
        } else {
            if (this.game.ui) this.game.ui.showMessage('Dealer não tem Blackjack.', '');
            this.game.addTimeout(() => this.game.startPlayerTurn(), CONFIG.DELAYS.TURN);
        }
    }

    respondToInsurance(accept) {
        if (this.game.ui) this.game.ui.toggleInsuranceModal(false);

        const profile = getActiveRuleProfile();

        if (profile.holeCardPolicy !== 'peek') {
            if (this.game.ui) this.game.ui.showMessage('Seguro indisponível neste perfil.', '');
            this.game.updateUI();
            this.game.addTimeout(() => this.game.startPlayerTurn(), CONFIG.DELAYS.TURN);
            return;
        }

        if (accept) {
            const insuranceCost = Math.floor(this.game.currentBet / 2);
            if (this.game.balance >= insuranceCost) {
                this.game.balance -= insuranceCost;
                this.game.engine.insuranceTaken = true;
                if (this.game.ui) this.game.ui.showMessage('Seguro apostado.', '');
                if (this.game.soundManager) this.game.soundManager.play('chip');
            } else if (this.game.ui) {
                this.game.ui.showMessage('Saldo insuficiente para seguro.', 'lose');
            }
        } else if (this.game.ui) {
            this.game.ui.showMessage('Seguro recusado.', '');
        }

        this.game.updateUI();
        this.game.addTimeout(() => this.game.checkDealerBlackjack(), CONFIG.DELAYS.TURN);
    }

    hit() {
        if (this.game.engine.gameOver) return;

        if (this.game.trainingMode) this.game._evaluateTrainingAction('hit');
        this.game.currentHandActions.push('hit');

        const result = this.game.engine.hit(this.game.engine.currentHandIndex);
        if (!result) {
            if (this.game.ui) this.game.ui.showToast('Não é possível pedir carta agora.', 'error', 2000);
            return;
        }
        const { hand } = result;

        if (this.game.soundManager) this.game.soundManager.play('card');
        this.game.events.emit('player:hit', { handIndex: this.game.engine.currentHandIndex, hand });
        this.game.updateUI();

        if (hand.status === 'busted') {
            this.game.events.emit('hand:bust', { handIndex: this.game.engine.currentHandIndex });
            if (this.game.ui) {
                this.game.ui.showMessage('Estourou!', 'lose');
                this.game.ui.showBustAnimation();
            }
            this.game.addTimeout(() => this.game.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        }
    }

    stand() {
        if (this.game.engine.gameOver) return;
        if (this.game.trainingMode) this.game._evaluateTrainingAction('stand');
        this.game.currentHandActions.push('stand');
        this.game.engine.stand(this.game.engine.currentHandIndex);
        this.game.events.emit('player:stand', { handIndex: this.game.engine.currentHandIndex });
        this.game.nextHand();
    }

    canDouble(handIndex = this.game.engine.currentHandIndex) {
        if (this.game.engine.gameOver) return false;

        const hand = this.game.engine.playerHands[handIndex];
        if (!hand) return false;

        return this.game.engine.canDouble(handIndex) && this.game.balance >= hand.bet;
    }

    double() {
        if (this.game.engine.gameOver) return;
        const hand = this.game.engine.playerHands[this.game.engine.currentHandIndex];

        if (!this.canDouble(this.game.engine.currentHandIndex)) {
            if (this.game.ui) {
                const reason = hand && this.game.balance < hand.bet
                    ? 'Saldo insuficiente para dobrar.'
                    : 'Não é possível dobrar agora.';
                this.game.ui.showToast(reason, 'error', 2000);
            }
            return;
        }

        if (this.game.trainingMode) this.game._evaluateTrainingAction('double');
        this.game.currentHandActions.push('double');
        this.game.balance -= hand.bet;

        const result = this.game.engine.double(this.game.engine.currentHandIndex);
        if (!result) {
            this.game.balance += hand.bet;
            if (this.game.ui) this.game.ui.showToast('Não é possível dobrar agora.', 'error', 2000);
            return;
        }

        if (this.game.soundManager) this.game.soundManager.play('card');

        if (result.hand.status === 'busted' && this.game.ui) {
            this.game.ui.showMessage('Estourou!', 'lose');
        }

        this.game.updateUI();
        this.game.addTimeout(() => this.game.nextHand(), CONFIG.DELAYS.NEXT_HAND);
    }

    split() {
        if (this.game.engine.playerHands.length === 0) return;
        const currentHand = this.game.engine.playerHands[this.game.engine.currentHandIndex];

        if (this.game.balance < currentHand.bet) {
            if (this.game.ui) this.game.ui.showToast('Saldo insuficiente para dividir.', 'error', 2000);
            return;
        }
        if (this.game.engine.playerHands.length > CONFIG.MAX_SPLITS) {
            if (this.game.ui) this.game.ui.showToast('Limite de divisões atingido.', 'error', 2000);
            return;
        }

        if (this.game.trainingMode) this.game._evaluateTrainingAction('split');
        this.game.currentHandActions.push('split');
        const initialBet = currentHand.bet;
        this.game.balance -= initialBet;

        const result = this.game.engine.split(this.game.engine.currentHandIndex);
        if (!result) {
            this.game.balance += initialBet;
            if (this.game.ui) this.game.ui.showToast('Não é possível dividir esta mão.', 'error', 2000);
            return;
        }

        if (this.game.soundManager) this.game.soundManager.play('card');
        this.game.events.emit('player:split', {
            handIndex: this.game.engine.currentHandIndex,
            isSplittingAces: result.isSplittingAces
        });

        this.game.updateUI();
        if (result.isSplittingAces) {
            this.game.addTimeout(() => this.game.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        }
    }

    surrender() {
        if (this.game.engine.gameOver) return;
        if (this.game.trainingMode) this.game._evaluateTrainingAction('surrender');
        this.game.currentHandActions.push('surrender');

        const result = this.game.engine.surrender(this.game.engine.currentHandIndex);
        if (!result) {
            if (this.game.ui) this.game.ui.showToast('Não é possível desistir agora.', 'error', 2000);
            return;
        }

        if (this.game.soundManager) this.game.soundManager.play('lose');
        this.game.events.emit('player:surrender', { handIndex: this.game.engine.currentHandIndex });
        this.game.updateUI();
        this.game.addTimeout(() => this.game.endGame(), CONFIG.DELAYS.NEXT_HAND);
    }

    nextHand() {
        if (this.game.engine.currentHandIndex < this.game.engine.playerHands.length - 1) {
            this.game.engine.currentHandIndex++;
            this.game.updateUI();
        } else {
            this.playDealer();
        }
    }

    playDealer() {
        const allBusted = this.game.engine.playerHands.every(h => h.status === 'busted');
        if (allBusted) {
            this.game.endGame();
            return;
        }

        this.game.engine.dealerRevealed = true;
        this.game.events.emit('dealer:turn');
        this.game.updateUI();

        const dealerTurnStep = () => {
            if (this.game.engine.dealerShouldHit()) {
                this.game.engine.dealerHit();
                if (this.game.soundManager) this.game.soundManager.play('card');
                this.game.updateUI();
                this.game.addTimeout(dealerTurnStep, CONFIG.DELAYS.DEALER_TURN);
            } else {
                this.game.addTimeout(() => this.game.endGame(), CONFIG.DELAYS.NEXT_HAND);
            }
        };

        this.game.addTimeout(dealerTurnStep, CONFIG.DELAYS.DEALER_TURN);
    }

    endGame() {
        this.game.engine.gameOver = true;
        this.game.engine.dealerRevealed = true;
        this.game.events.emit('game:ending');

        const { dealerValue, dealerBJ, results } = this.game.engine.evaluateResults();

        if (this.game.engine.insuranceTaken) {
            const insuranceCost = Math.floor(this.game.currentBet / 2);
            if (dealerBJ) {
                const insuranceWin = insuranceCost * CONFIG.PAYOUT.INSURANCE;
                this.game.balance += insuranceWin;
                this.game.totalWinnings += (insuranceWin - insuranceCost);
                if (this.game.ui) this.game.ui.showMessage('Seguro paga 2:1!', 'win');
            } else {
                this.game.totalWinnings -= insuranceCost;
            }
        }

        let totalWin = 0;
        let anyWin = false;
        let allLost = true;

        results.forEach(({ hand, result, payout }) => {
            if (HandUtils.isNaturalBlackjack(hand.cards, this.game.engine.playerHands.length) && result === 'win') {
                this.game.blackjacks++;
            }

            if (result === 'win') {
                this.game.wins++;
                anyWin = true;
            } else if (result === 'lose' || result === 'surrender') {
                this.game.losses++;
            }

            totalWin += payout;

            if (result !== 'lose') allLost = false;
        });

        this.game.balance += totalWin;

        const totalBetOnHands = this.game.engine.playerHands.reduce((sum, h) => sum + h.bet, 0);
        this.game.totalWinnings += (totalWin - totalBetOnHands);
        this.game.totalAmountWagered += totalBetOnHands;

        if (this.game.balance > this.game.sessionBestBalance) this.game.sessionBestBalance = this.game.balance;
        if (this.game.balance < this.game.sessionWorstBalance) this.game.sessionWorstBalance = this.game.balance;

        const primaryResult = results.length === 1 ? results[0].result : (anyWin ? 'win' : allLost ? 'lose' : 'tie');
        const hadBlackjack = results.some(r =>
            HandUtils.isNaturalBlackjack(r.hand.cards, this.game.engine.playerHands.length) && r.result === 'win'
        );
        const historyEntry = {
            handNumber: this.game.handCounter,
            timestamp: Date.now(),
            playerCards: this.game.engine.playerHands.map(h => [...h.cards]),
            dealerCards: [...this.game.engine.dealerHand],
            dealerUpCard: this.game.engine.dealerHand[0] || null,
            actions: [...this.game.currentHandActions],
            result: primaryResult,
            betAmount: this.game.currentBet,
            netChange: totalWin - totalBetOnHands,
            hadBlackjack,
            wasStrategyOptimal: null,
        };
        this.game.handHistory.addHand(historyEntry);
        this.game.events.emit('hand:completed', historyEntry);

        let message = '';
        let messageClass = '';
        if (this.game.engine.playerHands.length === 1) {
            const hand = this.game.engine.playerHands[0];
            const pVal = HandUtils.calculateHandValue(hand.cards);
            if (hand.status === 'surrender') {
                message = 'Você desistiu.';
                messageClass = 'tie';
            } else if (hand.status === 'busted') {
                message = 'Você estourou! Dealer vence!';
                messageClass = 'lose';
            } else if (dealerValue > 21) {
                message = 'Dealer estourou! Você venceu!';
                messageClass = 'win';
            } else if (pVal > dealerValue) {
                message = totalWin > hand.bet * 2 ? 'BLACKJACK! Você venceu!' : 'Você venceu!';
                messageClass = 'win';
            } else if (dealerValue > pVal) {
                message = 'Dealer vence!';
                messageClass = 'lose';
            } else {
                message = 'Empate!';
                messageClass = 'tie';
            }
        } else {
            const totalBetReturn = this.game.engine.playerHands.reduce((sum, h) => sum + h.bet, 0);
            const profit = totalWin - totalBetReturn;
            if (profit > 0) {
                message = `Ganhou $${profit}!`;
                messageClass = 'win';
            } else if (profit === 0 && totalWin > 0) {
                message = 'Empate!';
                messageClass = 'tie';
            } else {
                message = 'Dealer venceu!';
                messageClass = 'lose';
            }
        }

        const anyPush = results.some(r => r.result === 'tie');
        if (anyWin) {
            if (this.game.soundManager) this.game.soundManager.play('win');
            if (this.game.ui) this.game.ui.showWinAnimation(totalWin);
        } else if (allLost) {
            if (this.game.soundManager) this.game.soundManager.play('lose');
        } else if (anyPush) {
            if (this.game.soundManager) this.game.soundManager.play('push');
        }

        if (this.game.ui) {
            this.game.ui.annotateHandResults(results);
            this.game.ui.showMessage(message, messageClass);
            this.game.ui.showNewGameButton();
            this.game.ui.toggleGameControls(false);
        }

        this.game.updateUI();

        if (this.game.balance < CONFIG.MIN_BET) {
            if (this.game.ui) this.game.ui.showToast('Saldo insuficiente! Reiniciando em 2 segundos...', 'lose', 2000);
            this.game.addTimeout(() => {
                this.game.resetGame();
            }, CONFIG.DELAYS.RESET);
        }

        this.game.events.emit('game:over', { message, messageClass, totalWin, anyWin, allLost });
        if (this.game.settings.autoSave) this.game.saveGame();
    }
}
