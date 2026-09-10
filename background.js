/**
 * BunnyLOL Chrome Extension Background Service Worker
 * Omnibox integration and command routing
 */

import { getCommands, isChromeExtension } from './storage.js';
import { resolveQuery } from './resolver.js';

let cachedCommands = null;

// Helper to escape XML characters for Chrome Omnibox suggestions
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function loadCommands() {
    try {
        cachedCommands = await getCommands();
    } catch (err) {
        console.error('Error loading commands in service worker:', err);
    }
}

// Initial setup
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('BunnyLOL Extension installed/updated:', details.reason);
    await loadCommands();

    chrome.omnibox.setDefaultSuggestion({
        description: 'BunnyLOL: Type a command (e.g. ticket AY-1234, nova prod, g search)...'
    });
});

// Keep cache synchronized with storage updates
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes['bunnylol_commands']) {
            cachedCommands = changes['bunnylol_commands'].newValue;
        }
    });
}

// Handle Omnibox input changes for live suggestions
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    if (!cachedCommands) {
        await loadCommands();
    }
    const commands = cachedCommands || {};
    const input = (text || '').trim();
    if (!input) return;

    const suggestions = [];

    // Check if the input currently resolves to a specific URL
    const resolved = resolveQuery(commands, input);
    if (resolved && resolved.finalUrl) {
        const cmdName = escapeXml(resolved.command?.name || resolved.commandKey);
        const targetUrl = escapeXml(resolved.finalUrl);
        const ruleNote = resolved.matchedRule ? ` [Rule #${resolved.matchedRuleIndex + 1}]` : '';

        suggestions.push({
            content: input,
            description: `<match>${escapeXml(input)}</match> &rarr; <url>${targetUrl}</url> <dim>(${cmdName}${ruleNote})</dim>`
        });
    }

    // Also match possible command keys starting with the input
    const lower = input.toLowerCase();
    for (const [key, cmd] of Object.entries(commands)) {
        if (key.toLowerCase().startsWith(lower) && key.toLowerCase() !== lower) {
            const cmdName = escapeXml(cmd.name || key);
            const desc = escapeXml(cmd.description || cmd.url || '');
            suggestions.push({
                content: `${key} `,
                description: `<match>${escapeXml(key)}</match> <dim>&mdash; ${cmdName} ${desc ? '(' + desc + ')' : ''}</dim>`
            });
        }
        if (suggestions.length >= 6) break;
    }

    suggest(suggestions);
});

// Handle Omnibox execution (User presses Enter in Chrome address bar)
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    if (!cachedCommands) {
        await loadCommands();
    }

    const input = (text || '').trim();
    if (!input) {
        // Open options page if empty
        chrome.runtime.openOptionsPage();
        return;
    }

    const resolved = resolveQuery(cachedCommands, input);
    let targetUrl = resolved?.finalUrl;

    if (!targetUrl) {
        // Fallback to options page
        chrome.runtime.openOptionsPage();
        return;
    }

    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    if (disposition === 'currentTab') {
        chrome.tabs.update({ url: targetUrl });
    } else if (disposition === 'newForegroundTab') {
        chrome.tabs.create({ url: targetUrl, active: true });
    } else if (disposition === 'newBackgroundTab') {
        chrome.tabs.create({ url: targetUrl, active: false });
    } else {
        chrome.tabs.update({ url: targetUrl });
    }
});
