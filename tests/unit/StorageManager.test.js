
import { describe, it, expect } from 'vitest';
import { StorageManager } from '../../src/utils/StorageManager.js';

describe('StorageManager', () => {
    describe('checksum', () => {
        it('should calculate correct checksum for strings', () => {
            expect(StorageManager.checksum('test')).toBe(3556498);
            expect(StorageManager.checksum('')).toBe(0);
            expect(StorageManager.checksum('✓ unicode string')).toBe(-552828063);
        });

        it('should calculate correct checksum for objects', () => {
            expect(StorageManager.checksum({ a: 1 })).toBe(-1442153986);
            expect(StorageManager.checksum(null)).toBe(3392903); // checksum of "null"
        });
    });

    describe('encode', () => {
        it('should encode strings correctly', () => {
            const encoded = StorageManager.encode('test');
            expect(StorageManager.decode(encoded)).toBe('test');
        });

        it('should encode objects correctly', () => {
            const obj = { a: 1 };
            const encoded = StorageManager.encode(obj);
            expect(StorageManager.decode(encoded)).toEqual(obj);
        });

        it('should handle unicode', () => {
            const str = '✓ unicode string';
            const encoded = StorageManager.encode(str);
            expect(StorageManager.decode(encoded)).toBe(str);
        });

        it('should handle null', () => {
             const encoded = StorageManager.encode(null);
             expect(StorageManager.decode(encoded)).toBe(null);
        });
    });
});
