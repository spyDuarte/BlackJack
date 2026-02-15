/**
 * Generates a random integer between 0 and max-1 using crypto if available.
 * Uses rejection sampling to avoid modulo bias.
 * @param {number} max - The exclusive upper bound.
 * @returns {number} Random integer in [0, max-1].
 */
export function getRandomInt(max) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Rejection sampling to avoid modulo bias
        // We want a number in [0, max-1]
        // We generate a random 32-bit integer.
        // If the integer is >= limit, we reject and retry.
        // limit is the largest multiple of max <= 2^32.

        const maxUint32 = 4294967296;
        const limit = maxUint32 - (maxUint32 % max);

        // We can't reuse a buffer across calls easily without state,
        // but creating a new Uint32Array(1) is very cheap.
        const buffer = new Uint32Array(1);

        do {
            crypto.getRandomValues(buffer);
        } while (buffer[0] >= limit);

        return buffer[0] % max;
    } else {
        return Math.floor(Math.random() * max);
    }
}
