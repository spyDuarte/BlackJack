import { ShuffleStrategy } from './ShuffleStrategy.js';
import { fisherYates } from '../Algorithms.js';

/**
 * Strategy for Fisher-Yates shuffle (Perfect Random).
 */
export class FisherYatesStrategy extends ShuffleStrategy {
    shuffle(cards) {
        return fisherYates(cards);
    }
}
