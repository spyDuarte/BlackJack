import { Deck } from './Deck.js';
import { CONFIG } from './Constants.js';
import * as HandUtils from '../utils/HandUtils.js';

export class BlackjackEngine {
    constructor() {
        this.deck = new Deck();
        this.resetState();
    }

    resetState() {
        this.playerHands = [];
        this.dealerHand = [];
        this.currentHandIndex = 0;
        this.dealerRevealed = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.insuranceTaken = false;
    }

    shuffleDeck() {
        this.deck.reset();
        this.deck.shuffle();
    }

    startGame(bet) {
        if (this.deck.needsReshuffle) {
            this.shuffleDeck();
        }

        this.resetState();
        this.gameStarted = true;

        // Deal 2 cards to player and dealer
        // Dealing order: Player, Player, Dealer, Dealer (matching previous implementation behavior)
        const p1 = this.deck.draw();
        const p2 = this.deck.draw();
        const d1 = this.deck.draw();
        const d2 = this.deck.draw();

        this.playerHands = [{
            cards: [p1, p2],
            bet: bet,
            status: 'playing',
            splitFromAces: false
        }];
        this.dealerHand = [d1, d2];

        return {
            playerHands: this.playerHands,
            dealerHand: this.dealerHand
        };
    }

    get dealerUpCard() {
        return this.dealerHand[0];
    }

    hit(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand || hand.status !== 'playing') return null;

        const card = this.deck.draw();
        hand.cards.push(card);

        if (HandUtils.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
        }

        return { hand, card };
    }

    stand(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;
        hand.status = 'stand';
        return { hand };
    }

    double(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand || hand.status !== 'playing') return null;

        const card = this.deck.draw();
        hand.cards.push(card);
        hand.bet *= 2;

        if (HandUtils.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
        } else {
            hand.status = 'stand';
        }

        return { hand, card };
    }

    split(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;

        if (hand.cards.length !== 2) return null;
        // In some variants, 10 and J can be split (value 10). In others only same rank.
        // GameManager checked value equality: currentHand.cards[0].value !== currentHand.cards[1].value
        // But wait, GameManager logic:
        // if (currentHand.cards[0].value !== currentHand.cards[1].value) return;
        // So J and Q cannot be split?
        // Let's keep GameManager logic for now.
        if (hand.cards[0].value !== hand.cards[1].value) return null;

        const isSplittingAces = hand.cards[0].value === 'A';

        const splitCard = hand.cards.pop();
        const newHand = {
            cards: [splitCard],
            bet: hand.bet,
            status: 'playing',
            splitFromAces: isSplittingAces
        };

        // Deal new cards
        hand.cards.push(this.deck.draw());
        newHand.cards.push(this.deck.draw());

        hand.splitFromAces = isSplittingAces;

        this.playerHands.splice(handIndex + 1, 0, newHand);

        if (isSplittingAces) {
            hand.status = 'stand';
            newHand.status = 'stand';
        }

        return {
            handIndex,
            newHandIndex: handIndex + 1,
            isSplittingAces
        };
    }

    surrender(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;
        if (hand.cards.length !== 2) return null;

        hand.status = 'surrender';
        return { hand };
    }

    // Dealer logic: hits soft 17
    dealerShouldHit() {
         const value = HandUtils.calculateHandValue(this.dealerHand);
         const isSoft = HandUtils.isSoftHand(this.dealerHand);
         return (value < 17 || (value === 17 && isSoft));
    }

    dealerHit() {
        if (this.dealerShouldHit()) {
             const card = this.deck.draw();
             this.dealerHand.push(card);
             return card;
        }
        return null;
    }

    dealerTurn() {
         this.dealerRevealed = true;
         const cardsDrawn = [];

         while (this.dealerShouldHit()) {
             const card = this.dealerHit();
             if (card) cardsDrawn.push(card);
         }

         return {
             dealerHand: this.dealerHand,
             cardsDrawn
         };
    }

    evaluateResults() {
        const dealerValue = HandUtils.calculateHandValue(this.dealerHand);
        const dealerBJ = HandUtils.isNaturalBlackjack(this.dealerHand, 1);

        const results = this.playerHands.map(hand => {
             const playerValue = HandUtils.calculateHandValue(hand.cards);
             const playerBJ = HandUtils.isNaturalBlackjack(hand.cards, this.playerHands.length);

             let result = 'lose';
             let winMultiplier = 0;

             if (hand.status === 'surrender') {
                 result = 'surrender';
                 winMultiplier = 0.5;
             } else if (hand.status === 'busted') {
                 result = 'lose';
                 winMultiplier = 0;
             } else if (dealerBJ) {
                 if (playerBJ) {
                     result = 'tie';
                     winMultiplier = 1;
                 } else {
                     result = 'lose';
                     winMultiplier = 0;
                 }
             } else if (dealerValue > 21) {
                 result = 'win';
                 winMultiplier = 2;
                 if (playerBJ) winMultiplier = CONFIG.PAYOUT.BLACKJACK;
             } else if (playerBJ) {
                 result = 'win';
                 winMultiplier = CONFIG.PAYOUT.BLACKJACK;
             } else if (playerValue > dealerValue) {
                 result = 'win';
                 winMultiplier = 2;
             } else if (playerValue === dealerValue) {
                 result = 'tie';
                 winMultiplier = 1;
             } else {
                 result = 'lose';
                 winMultiplier = 0;
             }

             return {
                 hand,
                 result,
                 winMultiplier,
                 payout: Math.floor(hand.bet * winMultiplier)
             };
        });

        return {
            dealerValue,
            dealerBJ,
            results
        };
    }

    getState() {
        return {
            playerHands: this.playerHands,
            dealerHand: this.dealerHand,
            currentHandIndex: this.currentHandIndex,
            dealerRevealed: this.dealerRevealed,
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            remainingCards: this.deck.remainingCards,
            totalCards: this.deck.totalCards
        };
    }
}
