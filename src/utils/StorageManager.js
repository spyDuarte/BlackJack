export class StorageManager {
    static set(key, value) {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.setItem(key, value);
                return true;
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return false;
    }

    static get(key) {
        try {
            if (typeof Storage !== 'undefined') {
                return localStorage.getItem(key);
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
}
