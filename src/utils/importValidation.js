import { CONFIG } from '../core/Constants.js';

const ALLOWED_THEMES = new Set(['dark', 'light']);

const NUMERIC_GAME_STATE_FIELDS = [
    'balance',
    'wins',
    'losses',
    'blackjacks',
    'totalWinnings',
    'totalAmountWagered',
    'sessionBestBalance',
    'sessionWorstBalance',
    'handCounter',
];

const INTEGER_COUNTER_FIELDS = [
    'wins',
    'losses',
    'blackjacks',
    'handCounter',
];

const BOOLEAN_SETTING_FIELDS = [
    'soundEnabled',
    'animationsEnabled',
    'autoSave',
    'showStats',
    'trainingMode',
];

export class ImportValidationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'ImportValidationError';
        this.code = code;
    }
}

function ensureObject(value, fieldName) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ImportValidationError('INVALID_FILE', `Formato inválido para "${fieldName}".`);
    }
}

function ensureFiniteNumber(value, fieldName) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ImportValidationError('INVALID_FIELD', `Campo inválido: "${fieldName}" deve ser numérico finito.`);
    }
}

function ensureNonNegativeInteger(value, fieldName) {
    if (!Number.isInteger(value) || value < 0) {
        throw new ImportValidationError('INVALID_FIELD', `Campo inválido: "${fieldName}" deve ser inteiro não negativo.`);
    }
}

export function validateImportedGameData(data) {
    ensureObject(data, 'raiz');

    if (!Object.hasOwn(data, 'version')) {
        throw new ImportValidationError('INVALID_FILE', 'Arquivo inválido: campo "version" ausente.');
    }
    ensureFiniteNumber(data.version, 'version');
    if (!Number.isInteger(data.version) || data.version < 1) {
        throw new ImportValidationError('INVALID_FIELD', 'Campo inválido: "version" deve ser inteiro positivo.');
    }
    if (data.version > CONFIG.STORAGE_VERSION) {
        throw new ImportValidationError('INCOMPATIBLE_VERSION', `Versão incompatível: ${data.version}.`);
    }

    if (!Object.hasOwn(data, 'gameState')) {
        throw new ImportValidationError('INVALID_FILE', 'Arquivo inválido: campo "gameState" ausente.');
    }
    ensureObject(data.gameState, 'gameState');

    if (!Object.hasOwn(data, 'settings')) {
        throw new ImportValidationError('INVALID_FILE', 'Arquivo inválido: campo "settings" ausente.');
    }
    ensureObject(data.settings, 'settings');

    const normalizedGameState = {};
    for (const field of NUMERIC_GAME_STATE_FIELDS) {
        if (Object.hasOwn(data.gameState, field)) {
            const value = data.gameState[field];
            ensureFiniteNumber(value, `gameState.${field}`);
            normalizedGameState[field] = value;
        }
    }

    if (!Object.hasOwn(normalizedGameState, 'balance')) {
        throw new ImportValidationError('INVALID_FILE', 'Arquivo inválido: campo "gameState.balance" ausente.');
    }

    normalizedGameState.balance = Math.max(0, normalizedGameState.balance);

    for (const field of INTEGER_COUNTER_FIELDS) {
        if (Object.hasOwn(normalizedGameState, field)) {
            normalizedGameState[field] = Math.floor(normalizedGameState[field]);
            ensureNonNegativeInteger(normalizedGameState[field], `gameState.${field}`);
        }
    }

    const normalizedSettings = {};

    for (const field of BOOLEAN_SETTING_FIELDS) {
        if (Object.hasOwn(data.settings, field)) {
            if (typeof data.settings[field] !== 'boolean') {
                throw new ImportValidationError('INVALID_FIELD', `Campo inválido: "settings.${field}" deve ser booleano.`);
            }
            normalizedSettings[field] = data.settings[field];
        }
    }

    if (Object.hasOwn(data.settings, 'volume')) {
        const volume = data.settings.volume;
        ensureFiniteNumber(volume, 'settings.volume');
        normalizedSettings.volume = Math.min(1, Math.max(0, volume));
    }

    if (Object.hasOwn(data.settings, 'theme')) {
        const theme = data.settings.theme;
        if (typeof theme !== 'string' || !ALLOWED_THEMES.has(theme)) {
            throw new ImportValidationError('INVALID_FIELD', 'Campo inválido: "settings.theme" não é suportado.');
        }
        normalizedSettings.theme = theme;
    }

    return {
        version: data.version,
        gameState: normalizedGameState,
        settings: normalizedSettings,
    };
}

export function mapImportErrorToUiMessage(error) {
    if (!(error instanceof ImportValidationError)) {
        return 'Erro ao importar dados.';
    }

    if (error.code === 'INVALID_FILE') return error.message;
    if (error.code === 'INVALID_FIELD') return error.message;
    if (error.code === 'INCOMPATIBLE_VERSION') return 'Versão incompatível do arquivo de save.';

    return 'Erro ao importar dados.';
}
