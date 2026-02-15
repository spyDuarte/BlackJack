/**
 * HandHistory - manages a ring buffer of played hand records.
 * Works for both guest (localStorage) and authenticated (Supabase) users.
 */

import { StorageManager } from './StorageManager.js';

export class HandHistory {
    /**
     * @param {number} maxEntries - Maximum number of entries to keep.
     */
    constructor(maxEntries = 50, onSyncNotice = null) {
        this.maxEntries = maxEntries;
        this.onSyncNotice = onSyncNotice;
        /** @type {Array<Object>} Newest entry is at index 0. */
        this.entries = [];
    }

    notifySyncIssue(message, level = 'error') {
        if (typeof this.onSyncNotice === 'function') {
            this.onSyncNotice(message, level);
        }
    }

    isNoRowsError(error) {
        return error?.code === 'PGRST116';
    }

    isSchemaError(error) {
        const schemaErrorCodes = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
        return schemaErrorCodes.has(error?.code);
    }

    /**
     * Adds a new hand entry and trims to maxEntries.
     * @param {Object} entry
     */
    addHand(entry) {
        this.entries.unshift(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
    }

    /**
     * Returns all entries (newest first).
     * @returns {Array<Object>}
     */
    getHistory() {
        return this.entries;
    }

    /**
     * Returns the n most recent entries (newest first).
     * @param {number} n
     * @returns {Array<Object>}
     */
    getRecentHands(n = 10) {
        return this.entries.slice(0, n);
    }

    /** Clears all entries. */
    clear() {
        this.entries = [];
    }

    /**
     * Persists history to localStorage via StorageManager.
     * @param {string} storageKey
     */
    saveToLocalStorage(storageKey) {
        if (!storageKey) return;
        StorageManager.set(storageKey, { entries: this.entries });
    }

    /**
     * Loads history from localStorage via StorageManager.
     * @param {string} storageKey
     */
    loadFromLocalStorage(storageKey) {
        if (!storageKey) return;
        try {
            const saved = StorageManager.get(storageKey);
            if (saved && Array.isArray(saved.entries)) {
                this.entries = saved.entries.slice(0, this.maxEntries);
            }
        } catch {
            // Corrupt data — start fresh
            this.entries = [];
        }
    }

    /**
     * Saves history to Supabase (upsert single row per user).
     * @param {Object} supabase - Supabase client instance.
     * @param {string} userId
     */
    async saveToSupabase(supabase, userId) {
        if (!supabase || !userId) return;
        try {
            const { error } = await supabase
                .from('hand_history')
                .upsert({
                    user_id: userId,
                    hands_json: this.entries,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) {
                if (this.isSchemaError(error)) {
                    this.notifySyncIssue('Histórico na nuvem indisponível. Atualize as migrations do Supabase.', 'warning');
                    return;
                }

                console.error('Error saving hand history to Supabase:', error);
                this.notifySyncIssue('Erro ao salvar histórico na nuvem.', 'error');
            }
        } catch (err) {
            console.error('Unexpected error saving hand history:', err);
            this.notifySyncIssue('Erro de conexão ao salvar histórico na nuvem.', 'error');
        }
    }

    /**
     * Loads history from Supabase.
     * @param {Object} supabase - Supabase client instance.
     * @param {string} userId
     */
    async loadFromSupabase(supabase, userId) {
        if (!supabase || !userId) return;
        try {
            const { data, error } = await supabase
                .from('hand_history')
                .select('hands_json')
                .eq('user_id', userId)
                .single();

            if (data && Array.isArray(data.hands_json)) {
                this.entries = data.hands_json.slice(0, this.maxEntries);
            } else if (this.isNoRowsError(error)) {
                // No history row yet (fresh user). Keep existing local history.
            } else if (error) {
                if (this.isSchemaError(error)) {
                    this.notifySyncIssue('Histórico na nuvem indisponível. Atualize as migrations do Supabase.', 'warning');
                    return;
                }

                console.error('Error loading hand history from Supabase:', error);
                this.notifySyncIssue('Erro ao carregar histórico da nuvem.', 'error');
            }
        } catch (err) {
            console.error('Unexpected error loading hand history:', err);
            this.notifySyncIssue('Erro de conexão ao carregar histórico da nuvem.', 'error');
        }
    }
}
