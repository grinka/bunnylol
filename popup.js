import { getCommands } from './storage.js';
import { resolveQuery } from './resolver.js';

let commands = {};

const queryInput = document.getElementById('queryInput');
const goBtn = document.getElementById('goBtn');
const previewCard = document.getElementById('previewCard');
const previewCmdName = document.getElementById('previewCmdName');
const previewBadge = document.getElementById('previewBadge');
const previewUrl = document.getElementById('previewUrl');
const shortcutsList = document.getElementById('shortcutsList');
const openSettingsBtn = document.getElementById('openSettingsBtn');

async function init() {
    commands = await getCommands();
    renderShortcuts();

    queryInput.addEventListener('input', updatePreview);
    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            execute();
        }
    });

    goBtn.addEventListener('click', execute);

    openSettingsBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open('options.html', '_blank');
        }
    });

    queryInput.focus();
}

function updatePreview() {
    const input = queryInput.value.trim();
    if (!input) {
        previewCard.style.display = 'none';
        return;
    }

    const resolved = resolveQuery(commands, input);
    if (!resolved || !resolved.finalUrl) {
        previewCard.style.display = 'none';
        return;
    }

    previewCard.style.display = 'block';
    previewCmdName.textContent = resolved.command?.name || resolved.commandKey || 'Default Search';

    if (resolved.matchedRule) {
        previewBadge.textContent = `Rule #${resolved.matchedRuleIndex + 1}`;
        previewBadge.style.background = '#ECFDF5';
        previewBadge.style.color = '#059669';
    } else if (resolved.matchType === 'prefix') {
        previewBadge.textContent = `Prefix Match`;
        previewBadge.style.background = '#FEF3C7';
        previewBadge.style.color = '#D97706';
    } else if (resolved.isDefault) {
        previewBadge.textContent = `Default Fallback`;
        previewBadge.style.background = '#F1F5F9';
        previewBadge.style.color = '#475569';
    } else {
        previewBadge.textContent = `Direct URL`;
        previewBadge.style.background = '#EFF6FF';
        previewBadge.style.color = '#2563EB';
    }

    previewUrl.textContent = resolved.finalUrl;
}

function execute() {
    const input = queryInput.value.trim();
    if (!input) return;

    const resolved = resolveQuery(commands, input);
    let targetUrl = resolved?.finalUrl;
    if (!targetUrl) return;

    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: targetUrl });
        window.close();
    } else {
        window.open(targetUrl, '_blank');
    }
}

function renderShortcuts() {
    shortcutsList.innerHTML = '';
    const keys = Object.keys(commands).slice(0, 6);

    keys.forEach(key => {
        const cmd = commands[key];
        const btn = document.createElement('button');
        btn.className = 'shortcut-chip';
        btn.innerHTML = `<span class="shortcut-key">${key}</span>${cmd.name}`;
        btn.title = `${cmd.name} (${cmd.url})`;
        btn.addEventListener('click', () => {
            queryInput.value = `${key} `;
            queryInput.focus();
            updatePreview();
        });
        shortcutsList.appendChild(btn);
    });
}

init();
