/**
 * Simple EventEmitter for decoupling GameManager from UIManager.
 * Supports on, off, once, and emit.
 */
export class EventEmitter {
    constructor() {
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
        return this;
    }

    off(event, callback) {
        if (!this._listeners[event]) return this;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        return this;
    }

    once(event, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }

    emit(event, ...args) {
        if (!this._listeners[event]) return false;
        this._listeners[event].forEach(cb => cb(...args));
        return true;
    }
}
