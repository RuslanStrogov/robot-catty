/**
 * Robot Catty — Config Manager
 * 
 * Загружает конфигурацию из config.json (создаёт копию из default при первом запуске).
 * Предоставляет API для чтения/записи/сброса.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = __dirname;
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_PATH = path.join(CONFIG_DIR, 'config.default.json');

// Default schema — loaded fresh from file each time
let _defaultConfig = null;
let _currentConfig = null;

function loadDefault() {
    try {
        _defaultConfig = JSON.parse(fs.readFileSync(DEFAULT_PATH, 'utf8'));
        return _defaultConfig;
    } catch (e) {
        console.error('[CONFIG] Failed to load default config:', e.message);
        return null;
    }
}

function loadConfig() {
    loadDefault();
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            _currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            console.log('[CONFIG] Loaded from', CONFIG_PATH);
            // Validate: merge missing keys from default
            mergeDefaults(_currentConfig, _defaultConfig);
        } else {
            console.log('[CONFIG] No config.json found, copying from default');
            _currentConfig = JSON.parse(JSON.stringify(_defaultConfig));
            saveConfig();
        }
        return _currentConfig;
    } catch (e) {
        console.error('[CONFIG] Load error:', e.message);
        _currentConfig = JSON.parse(JSON.stringify(_defaultConfig));
        return _currentConfig;
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(_currentConfig, null, 2), 'utf8');
        console.log('[CONFIG] Saved to', CONFIG_PATH);
        return true;
    } catch (e) {
        console.error('[CONFIG] Save error:', e.message);
        return false;
    }
}

function mergeDefaults(current, defaults) {
    let changed = false;
    for (const key of Object.keys(defaults)) {
        if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = JSON.parse(JSON.stringify(defaults[key]));
                changed = true;
            } else {
                changed = mergeDefaults(current[key], defaults[key]) || changed;
            }
        } else if (!(key in current)) {
            current[key] = defaults[key];
            changed = true;
        }
    }
    if (changed) saveConfig();
    return changed;
}

function getConfig() {
    if (!_currentConfig) loadConfig();
    return _currentConfig;
}

function setConfig(pathParts, value) {
    if (!_currentConfig) loadConfig();
    let obj = _currentConfig;
    for (let i = 0; i < pathParts.length - 1; i++) {
        if (!obj[pathParts[i]] || typeof obj[pathParts[i]] !== 'object') {
            obj[pathParts[i]] = {};
        }
        obj = obj[pathParts[i]];
    }
    obj[pathParts[pathParts.length - 1]] = value;
    return saveConfig();
}

function updateConfig(fullConfig) {
    if (!_currentConfig) loadConfig();
    // Deep merge: keep existing keys, overwrite provided ones
    deepMerge(_currentConfig, fullConfig);
    return saveConfig();
}

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = JSON.parse(JSON.stringify(source[key]));
            } else {
                deepMerge(target[key], source[key]);
            }
        } else {
            target[key] = source[key];
        }
    }
}

function resetConfig() {
    loadDefault();
    if (_defaultConfig) {
        _currentConfig = JSON.parse(JSON.stringify(_defaultConfig));
        saveConfig();
        console.log('[CONFIG] Reset to defaults');
        return _currentConfig;
    }
    return null;
}

function getEnvOverrides() {
    // Переопределение портов через переменные окружения (для pm2)
    const overrides = {};
    if (process.env.WEB_PORT) overrides.server = { port: parseInt(process.env.WEB_PORT) };
    if (process.env.UNO_PORT) {
        overrides.serial = overrides.serial || {};
        overrides.serial.uno = overrides.serial.uno || {};
        overrides.serial.uno.port = process.env.UNO_PORT;
    }
    if (process.env.MEGA_PORT) {
        overrides.serial = overrides.serial || {};
        overrides.serial.mega = overrides.serial.mega || {};
        overrides.serial.mega.port = process.env.MEGA_PORT;
    }
    if (process.env.UNO_BAUD) {
        overrides.serial = overrides.serial || {};
        overrides.serial.uno = overrides.serial.uno || {};
        overrides.serial.uno.baud = parseInt(process.env.UNO_BAUD);
    }
    if (process.env.MEGA_BAUD) {
        overrides.serial = overrides.serial || {};
        overrides.serial.mega = overrides.serial.mega || {};
        overrides.serial.mega.baud = parseInt(process.env.MEGA_BAUD);
    }
    return overrides;
}

// Export
module.exports = {
    loadConfig,
    getConfig,
    setConfig,
    updateConfig,
    resetConfig,
    saveConfig,
    getDefault: loadDefault,
    getEnvOverrides
};
