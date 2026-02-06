export class StorageManager {
    static set(key, value) {
        try {
            if (typeof Storage !== 'undefined') {
                const encoded = StorageManager.encode(value);
                localStorage.setItem(key, encoded);
                return true;
            }
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('LocalStorage quota exceeded');
                return false;
            }
            console.warn('LocalStorage not available:', e.message);
        }
        return false;
    }

    static get(key) {
        try {
            if (typeof Storage !== 'undefined') {
                const raw = localStorage.getItem(key);
                if (raw === null) return null;
                return StorageManager.decode(raw);
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return null;
    }

    static remove(key) {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.removeItem(key);
                return true;
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return false;
    }

    static encode(value) {
        try {
            const checksum = StorageManager.checksum(value);
            const payload = JSON.stringify({ d: value, c: checksum });
            return btoa(unescape(encodeURIComponent(payload)));
        } catch {
            return value;
        }
    }

    static decode(encoded) {
        try {
            const json = decodeURIComponent(escape(atob(encoded)));
            const { d, c } = JSON.parse(json);
            if (StorageManager.checksum(d) !== c) {
                console.warn('Storage data checksum mismatch - data may have been tampered');
                return d; // Return anyway but warn
            }
            return d;
        } catch {
            // Fallback: legacy unencoded data
            return encoded;
        }
    }

    static checksum(str) {
        let hash = 0;
        const s = typeof str === 'string' ? str : JSON.stringify(str);
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32-bit integer
        }
        return hash;
    }

    static getUsedSpace() {
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                total += key.length + localStorage.getItem(key).length;
            }
            return total * 2; // UTF-16 chars are 2 bytes each
        } catch {
            return 0;
        }
    }

    static isSpaceAvailable(bytesNeeded = 1024) {
        try {
            const testKey = '__storage_test__';
            const testData = 'x'.repeat(bytesNeeded);
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }
}
