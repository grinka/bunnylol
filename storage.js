/**
 * BunnyLOL Storage Manager
 * Handles seamless synchronization across Chrome Extension (chrome.storage.sync/local)
 * and Web Browser (localStorage) with automatic fallback.
 */

import { DEFAULT_COMMANDS } from './commands.js';

const STORAGE_KEY = 'bunnylol_commands';

/**
 * Detect runtime environment
 */
export const isChromeExtension = () => {
    return typeof chrome !== 'undefined' &&
           Boolean(chrome.storage) &&
           Boolean(chrome.storage.sync || chrome.storage.local);
};

/**
 * Retrieve all commands & metadata rules
 * @returns {Promise<Object>} Object mapping command keys to command definitions
 */
export const getCommands = async () => {
    try {
        if (isChromeExtension()) {
            const storage = chrome.storage.sync || chrome.storage.local;
            const data = await new Promise((resolve) => {
                storage.get([STORAGE_KEY], (res) => resolve(res?.[STORAGE_KEY]));
            });
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                return data;
            }
        }
    } catch (err) {
        console.warn('Chrome storage read error, falling back:', err);
    }

    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    return parsed;
                }
            } catch (err) {
                console.error('Failed to parse localStorage commands:', err);
            }
        }
    }

    // Default to built-in commands
    const initial = JSON.parse(JSON.stringify(DEFAULT_COMMANDS));
    await saveCommands(initial);
    return initial;
};

/**
 * Save complete commands dictionary to storage
 * @param {Object} commands
 */
export const saveCommands = async (commands) => {
    if (!commands || typeof commands !== 'object') return false;

    // Save to localStorage if available
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
        } catch (err) {
            console.warn('localStorage save warning:', err);
        }
    }

    // Save to Chrome Storage if in extension
    if (isChromeExtension()) {
        try {
            const storage = chrome.storage.sync || chrome.storage.local;
            await new Promise((resolve, reject) => {
                storage.set({ [STORAGE_KEY]: commands }, () => {
                    if (chrome.runtime.lastError) {
                        // If quota exceeded or error on sync, try local
                        if (chrome.storage.local) {
                            chrome.storage.local.set({ [STORAGE_KEY]: commands }, resolve);
                        } else {
                            reject(chrome.runtime.lastError);
                        }
                    } else {
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.warn('chrome.storage save error:', err);
        }
    }

    // Dispatch a custom event so other components on page re-render
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bunnylol:commands-updated', { detail: commands }));
    }

    return true;
};

/**
 * Add or update an individual command with rules
 * @param {string} key
 * @param {Object} commandData
 */
export const saveCommand = async (key, commandData) => {
    const commands = await getCommands();
    commands[key] = commandData;
    await saveCommands(commands);
    return commands;
};

/**
 * Delete a command by key
 * @param {string} key
 */
export const deleteCommand = async (key) => {
    const commands = await getCommands();
    if (commands[key]) {
        delete commands[key];
        await saveCommands(commands);
    }
    return commands;
};

/**
 * Reset all commands and rules to default template
 */
export const resetToDefaults = async () => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_COMMANDS));
    await saveCommands(defaults);
    return defaults;
};

/**
 * Export commands as JSON string
 */
export const exportCommandsJson = async () => {
    const commands = await getCommands();
    return JSON.stringify(commands, null, 2);
};

/**
 * Import commands from JSON string
 * @param {string} jsonString
 */
export const importCommandsJson = async (jsonString) => {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid format: JSON must be an object containing command keys.');
    }
    await saveCommands(parsed);
    return parsed;
};

/**
 * Register a listener for external storage updates
 */
export const onCommandsChanged = (callback) => {
    if (typeof window !== 'undefined') {
        window.addEventListener('bunnylol:commands-updated', (e) => {
            callback(e.detail);
        });
    }

    if (isChromeExtension() && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (changes[STORAGE_KEY]?.newValue) {
                callback(changes[STORAGE_KEY].newValue);
            }
        });
    }
};
