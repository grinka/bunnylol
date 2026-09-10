import {
    getCommands,
    saveCommands,
    saveCommand,
    deleteCommand,
    resetToDefaults,
    exportCommandsJson,
    importCommandsJson,
    isChromeExtension,
    onCommandsChanged
} from './storage.js';

import { resolveQuery, evaluateCondition, prepareCommandUrl } from './resolver.js';

let currentCommands = {};
let activeFilter = '';
let editingCommandKey = null; // null if adding new, string if editing

// DOM Elements
const envBadge = document.getElementById('envBadge');
const simInput = document.getElementById('simInput');
const simResult = document.getElementById('simResult');
const simCmdName = document.getElementById('simCmdName');
const simCmdKey = document.getElementById('simCmdKey');
const simParams = document.getElementById('simParams');
const simRule = document.getElementById('simRule');
const simUrl = document.getElementById('simUrl');
const simTestLink = document.getElementById('simTestLink');

const commandsCount = document.getElementById('commandsCount');
const filterInput = document.getElementById('filterInput');
const commandsGrid = document.getElementById('commandsGrid');

const addCommandBtn = document.getElementById('addCommandBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const setupGuideBtn = document.getElementById('setupGuideBtn');

// Modal Elements
const cmdModal = document.getElementById('cmdModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const cmdForm = document.getElementById('cmdForm');

const formKey = document.getElementById('formKey');
const formName = document.getElementById('formName');
const formDesc = document.getElementById('formDesc');
const formPrefix = document.getElementById('formPrefix');
const formDefault = document.getElementById('formDefault');
const formUrl = document.getElementById('formUrl');
const formSearchUrl = document.getElementById('formSearchUrl');

const modalRulesList = document.getElementById('modalRulesList');
const addRuleBtn = document.getElementById('addRuleBtn');
const modalRuleTestParam = document.getElementById('modalRuleTestParam');
const modalRuleTestResult = document.getElementById('modalRuleTestResult');

// Setup Guide Modal
const guideModal = document.getElementById('guideModal');
const guideCloseBtn = document.getElementById('guideCloseBtn');
const guideOkBtn = document.getElementById('guideOkBtn');

// Hidden File Input for Import
const fileImportInput = document.getElementById('fileImportInput');

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}

function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
}

// Initialize Application
async function init() {
    // Detect environment
    if (envBadge) {
        if (isChromeExtension()) {
            envBadge.innerHTML = '🧩 Chrome Extension Mode (Sync Storage)';
            envBadge.style.background = '#ECFDF5';
            envBadge.style.color = '#065F46';
        } else {
            envBadge.innerHTML = '🌐 Web Preview Mode (Local Storage)';
            envBadge.style.background = '#EFF6FF';
            envBadge.style.color = '#1E40AF';
        }
    }

    // Load commands
    currentCommands = await getCommands();
    renderCommandsList();

    // Attach Listeners
    if (simInput) {
        simInput.addEventListener('input', runSimulation);
    }

    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            activeFilter = e.target.value.trim().toLowerCase();
            renderCommandsList();
        });
    }

    if (addCommandBtn) addCommandBtn.addEventListener('click', () => openModalForAdd());
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (cmdForm) cmdForm.addEventListener('submit', handleFormSubmit);

    if (addRuleBtn) addRuleBtn.addEventListener('click', () => appendRuleRow());
    if (modalRuleTestParam) modalRuleTestParam.addEventListener('input', testModalRules);

    if (exportBtn) exportBtn.addEventListener('click', handleExport);
    if (importBtn) importBtn.addEventListener('click', () => fileImportInput.click());
    if (fileImportInput) fileImportInput.addEventListener('change', handleImportFile);
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    if (downloadZipBtn) downloadZipBtn.addEventListener('click', handleDownloadZip);
    if (setupGuideBtn) setupGuideBtn.addEventListener('click', () => { guideModal.style.display = 'flex'; });
    if (guideCloseBtn) guideCloseBtn.addEventListener('click', () => { guideModal.style.display = 'none'; });
    if (guideOkBtn) guideOkBtn.addEventListener('click', () => { guideModal.style.display = 'none'; });

    // Sync across tabs/extensions
    onCommandsChanged((newCommands) => {
        currentCommands = newCommands;
        renderCommandsList();
        runSimulation();
    });

    // Run initial simulation if query params or default
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('test') || 'nova prod';
    if (simInput) {
        simInput.value = initialQuery;
        runSimulation();
    }
}

// Render the list of commands
function renderCommandsList() {
    if (!commandsGrid) return;
    commandsGrid.innerHTML = '';

    const keys = Object.keys(currentCommands);
    let matchedKeys = keys;

    if (activeFilter) {
        matchedKeys = keys.filter(key => {
            const cmd = currentCommands[key];
            const nameMatch = (cmd.name || '').toLowerCase().includes(activeFilter);
            const keyMatch = key.toLowerCase().includes(activeFilter);
            const descMatch = (cmd.description || '').toLowerCase().includes(activeFilter);
            const prefixMatch = (cmd.prefix || '').toLowerCase().includes(activeFilter);
            const urlMatch = (cmd.url || '').toLowerCase().includes(activeFilter);
            const rulesMatch = (cmd.rules || []).some(r =>
                (r.condition || '').toLowerCase().includes(activeFilter) ||
                (r.url || '').toLowerCase().includes(activeFilter)
            );
            return nameMatch || keyMatch || descMatch || prefixMatch || urlMatch || rulesMatch;
        });
    }

    if (commandsCount) {
        commandsCount.textContent = `${matchedKeys.length} / ${keys.length}`;
    }

    if (matchedKeys.length === 0) {
        commandsGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                No commands matching "<strong>${escapeHtml(activeFilter)}</strong>".
                <div style="margin-top: 10px;">
                    <button id="clearFilterBtn" class="btn btn-secondary btn-sm">Clear Filter</button>
                </div>
            </div>
        `;
        document.getElementById('clearFilterBtn')?.addEventListener('click', () => {
            filterInput.value = '';
            activeFilter = '';
            renderCommandsList();
        });
        return;
    }

    matchedKeys.forEach(key => {
        const cmd = currentCommands[key];
        const card = document.createElement('div');
        card.className = 'command-card';

        const rulesCount = Array.isArray(cmd.rules) ? cmd.rules.length : 0;

        let badgesHtml = '';
        if (cmd.default) {
            badgesHtml += `<span class="badge badge-emerald">Default Search</span>`;
        }
        if (cmd.prefix) {
            badgesHtml += `<span class="badge badge-amber">Prefix: ${escapeHtml(cmd.prefix)}</span>`;
        }
        if (rulesCount > 0) {
            badgesHtml += `<span class="badge badge-indigo">${rulesCount} ${rulesCount === 1 ? 'Rule' : 'Rules'}</span>`;
        }

        let rulesSectionHtml = '';
        if (rulesCount > 0) {
            const rulesRows = cmd.rules.map((rule, idx) => `
                <div class="rule-row">
                    <span class="rule-idx">#${idx + 1}</span>
                    <span class="rule-cond">${escapeHtml(rule.condition)}</span>
                    <span class="rule-arrow">&rarr;</span>
                    <span class="rule-target-url">${escapeHtml(rule.url)}</span>
                </div>
            `).join('');

            rulesSectionHtml = `
                <div class="rules-container">
                    <div class="rules-heading">
                        <span>Conditional Rules (${rulesCount})</span>
                        <span style="font-weight: normal; text-transform: none; color: #94A3B8;">Evaluated in order</span>
                    </div>
                    ${rulesRows}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="cmd-top">
                <div class="cmd-identity">
                    <span class="cmd-key">${escapeHtml(key)}</span>
                    <span class="cmd-name">${escapeHtml(cmd.name || key)}</span>
                    <div class="cmd-badges">${badgesHtml}</div>
                </div>
                <div class="cmd-actions">
                    <button class="btn btn-secondary btn-sm edit-btn" data-key="${escapeHtml(key)}" title="Edit command and metadata rules">
                        ✏️ Edit Rules
                    </button>
                    <button class="btn btn-secondary btn-sm clone-btn" data-key="${escapeHtml(key)}" title="Duplicate command">
                        📋 Duplicate
                    </button>
                    <button class="btn btn-danger-outline btn-sm delete-btn" data-key="${escapeHtml(key)}" title="Delete command">
                        🗑️
                    </button>
                </div>
            </div>
            ${cmd.description ? `<div class="cmd-desc">${escapeHtml(cmd.description)}</div>` : ''}
            <div class="cmd-urls">
                <div class="cmd-url-line">
                    <span class="cmd-url-label">Default URL:</span>
                    <span>${escapeHtml(cmd.url || '(none)')}</span>
                </div>
                ${cmd.searchUrl ? `
                <div class="cmd-url-line">
                    <span class="cmd-url-label">Search URL:</span>
                    <span>${escapeHtml(cmd.searchUrl)}</span>
                </div>` : ''}
            </div>
            ${rulesSectionHtml}
        `;

        // Card button events
        card.querySelector('.edit-btn').addEventListener('click', () => openModalForEdit(key));
        card.querySelector('.clone-btn').addEventListener('click', () => handleClone(key));
        card.querySelector('.delete-btn').addEventListener('click', () => handleDelete(key));

        commandsGrid.appendChild(card);
    });
}

// Run interactive simulation
function runSimulation() {
    if (!simInput || !simResult) return;
    const input = simInput.value.trim();

    if (!input) {
        simResult.style.display = 'none';
        return;
    }

    const resolved = resolveQuery(currentCommands, input);
    if (!resolved || !resolved.finalUrl) {
        simResult.style.display = 'block';
        simCmdName.textContent = 'None';
        simCmdKey.textContent = '-';
        simParams.textContent = '-';
        simRule.textContent = 'No command or default search matched';
        simUrl.textContent = 'None';
        simTestLink.style.display = 'none';
        return;
    }

    simResult.style.display = 'block';
    simCmdName.textContent = resolved.command?.name || resolved.commandKey;
    simCmdKey.textContent = resolved.commandKey || '(Default)';
    simParams.textContent = resolved.urlParams ? `"${resolved.urlParams}" (tokens: [${resolved.paramsArray.map(p => `"${p}"`).join(', ')}])` : '(empty)';

    if (resolved.matchedRule) {
        simRule.innerHTML = `<span class="badge badge-emerald">Rule #${resolved.matchedRuleIndex + 1} Matched</span> <code>${escapeHtml(resolved.matchedRule.condition)}</code>`;
    } else if (resolved.matchType === 'prefix') {
        simRule.innerHTML = `<span class="badge badge-amber">Prefix Match (${escapeHtml(resolved.commandKey)})</span>`;
    } else if (resolved.isDefault) {
        simRule.innerHTML = `<span class="badge badge-gray">Fallback to Default Command</span>`;
    } else {
        simRule.innerHTML = `<span class="badge badge-indigo">Direct Template Match</span>`;
    }

    simUrl.textContent = resolved.finalUrl;
    simTestLink.href = resolved.finalUrl;
    simTestLink.style.display = 'inline-flex';
}

// Open modal to add a new command
function openModalForAdd() {
    editingCommandKey = null;
    modalTitle.textContent = 'Add New Command & Rules';
    formKey.value = '';
    formKey.disabled = false;
    formName.value = '';
    formDesc.value = '';
    formPrefix.value = '';
    formDefault.checked = false;
    formUrl.value = '';
    formSearchUrl.value = '';

    modalRulesList.innerHTML = '';
    modalRuleTestParam.value = '';
    modalRuleTestResult.textContent = 'Enter sample parameter to test rules...';

    cmdModal.style.display = 'flex';
    formKey.focus();
}

// Open modal to edit an existing command
function openModalForEdit(key) {
    const cmd = currentCommands[key];
    if (!cmd) return;

    editingCommandKey = key;
    modalTitle.textContent = `Edit Command & Metadata Rules: ${key}`;
    formKey.value = key;
    formKey.disabled = true; // Key cannot be edited in place to prevent orphans; clone instead
    formName.value = cmd.name || '';
    formDesc.value = cmd.description || '';
    formPrefix.value = cmd.prefix || '';
    formDefault.checked = Boolean(cmd.default);
    formUrl.value = cmd.url || '';
    formSearchUrl.value = cmd.searchUrl || '';

    modalRulesList.innerHTML = '';
    if (Array.isArray(cmd.rules)) {
        cmd.rules.forEach((rule) => {
            appendRuleRow(rule.condition, rule.url);
        });
    }

    modalRuleTestParam.value = 'prod';
    testModalRules();

    cmdModal.style.display = 'flex';
    formName.focus();
}

// Append a rule row in the modal editor
function appendRuleRow(condition = '', url = '') {
    const item = document.createElement('div');
    item.className = 'edit-rule-item';

    const count = modalRulesList.querySelectorAll('.edit-rule-item').length + 1;

    item.innerHTML = `
        <div class="edit-rule-header">
            <span class="edit-rule-num">Rule #${count}</span>
            <div class="edit-rule-actions">
                <button type="button" class="btn btn-secondary btn-sm rule-up-btn" title="Move Up">↑</button>
                <button type="button" class="btn btn-secondary btn-sm rule-down-btn" title="Move Down">↓</button>
                <button type="button" class="btn btn-danger-outline btn-sm rule-del-btn" title="Delete Rule">🗑️</button>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">
                    Condition Expression:
                </label>
                <input type="text" class="form-input rule-cond-input" value="${escapeHtml(condition)}" placeholder="e.g. {0} == 'prod' || {0} == 'production'" style="font-family: monospace; font-size: 12px;">
            </div>
            <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">
                    Destination URL:
                </label>
                <input type="text" class="form-input rule-url-input" value="${escapeHtml(url)}" placeholder="https://example.com/target" style="font-family: monospace; font-size: 12px;">
            </div>
        </div>
    `;

    // Listeners for inputs
    item.querySelector('.rule-cond-input').addEventListener('input', testModalRules);
    item.querySelector('.rule-url-input').addEventListener('input', testModalRules);

    // Up / Down / Del
    item.querySelector('.rule-up-btn').addEventListener('click', () => {
        if (item.previousElementSibling) {
            modalRulesList.insertBefore(item, item.previousElementSibling);
            renumberModalRules();
            testModalRules();
        }
    });

    item.querySelector('.rule-down-btn').addEventListener('click', () => {
        if (item.nextElementSibling) {
            modalRulesList.insertBefore(item.nextElementSibling, item);
            renumberModalRules();
            testModalRules();
        }
    });

    item.querySelector('.rule-del-btn').addEventListener('click', () => {
        item.remove();
        renumberModalRules();
        testModalRules();
    });

    modalRulesList.appendChild(item);
    testModalRules();
}

function renumberModalRules() {
    const items = modalRulesList.querySelectorAll('.edit-rule-item');
    items.forEach((item, idx) => {
        item.querySelector('.edit-rule-num').textContent = `Rule #${idx + 1}`;
    });
}

// In-modal live test of rules currently being edited
function testModalRules() {
    if (!modalRuleTestParam || !modalRuleTestResult) return;
    const testVal = modalRuleTestParam.value.trim();
    const paramsArray = testVal ? testVal.split(/\s+/) : [];

    const items = modalRulesList.querySelectorAll('.edit-rule-item');
    if (items.length === 0) {
        const defaultUrl = formUrl.value.trim();
        const computed = prepareCommandUrl(defaultUrl, testVal);
        modalRuleTestResult.innerHTML = `No rules defined. Uses Default URL: <code>${escapeHtml(computed || '(empty)')}</code>`;
        return;
    }

    let matchedRuleIndex = -1;
    let matchedRuleUrl = '';

    for (let i = 0; i < items.length; i++) {
        const cond = items[i].querySelector('.rule-cond-input').value.trim();
        const url = items[i].querySelector('.rule-url-input').value.trim();
        if (evaluateCondition(cond, paramsArray)) {
            matchedRuleIndex = i;
            matchedRuleUrl = prepareCommandUrl(url, testVal);
            break;
        }
    }

    if (matchedRuleIndex !== -1) {
        modalRuleTestResult.innerHTML = `
            <span class="badge badge-emerald">Rule #${matchedRuleIndex + 1} Matched!</span>
            &rarr; <code>${escapeHtml(matchedRuleUrl)}</code>
        `;
    } else {
        const defaultUrl = formUrl.value.trim();
        const computed = prepareCommandUrl(defaultUrl, testVal);
        modalRuleTestResult.innerHTML = `
            <span class="badge badge-gray">No Rules Matched</span>
            Fell back to Default URL &rarr; <code>${escapeHtml(computed || '(empty)')}</code>
        `;
    }
}

// Handle Modal Form Submit (Save Command & Rules)
async function handleFormSubmit(e) {
    e.preventDefault();

    const key = formKey.value.trim().toLowerCase();
    if (!key) {
        alert('Please provide a command key (e.g. nova, jira, g).');
        return;
    }

    const name = formName.value.trim() || key;
    const desc = formDesc.value.trim();
    const prefix = formPrefix.value.trim();
    const isDefault = formDefault.checked;
    const url = formUrl.value.trim();
    const searchUrl = formSearchUrl.value.trim();

    if (!url && !searchUrl) {
        alert('Please specify at least a Default URL or a Search URL.');
        return;
    }

    // Collect rules
    const rules = [];
    const ruleItems = modalRulesList.querySelectorAll('.edit-rule-item');
    for (const item of ruleItems) {
        const condition = item.querySelector('.rule-cond-input').value.trim();
        const ruleUrl = item.querySelector('.rule-url-input').value.trim();
        if (condition && ruleUrl) {
            rules.push({ condition, url: ruleUrl });
        }
    }

    // Build command object
    const commandData = {
        name,
        url
    };

    if (desc) commandData.description = desc;
    if (prefix) commandData.prefix = prefix;
    if (searchUrl) commandData.searchUrl = searchUrl;
    if (isDefault) commandData.default = true;
    if (rules.length > 0) commandData.rules = rules;

    // If setting this command as default, clear default on other commands
    if (isDefault) {
        for (const k in currentCommands) {
            if (k !== key && currentCommands[k].default) {
                delete currentCommands[k].default;
            }
        }
    }

    currentCommands[key] = commandData;
    await saveCommands(currentCommands);

    closeModal();
    showToast(`Command "${key}" and rules saved successfully!`, 'success');
    renderCommandsList();
    runSimulation();
}

function closeModal() {
    cmdModal.style.display = 'none';
}

// Duplicate command
async function handleClone(key) {
    const original = currentCommands[key];
    if (!original) return;

    let newKey = `${key}-copy`;
    let counter = 1;
    while (currentCommands[newKey]) {
        counter++;
        newKey = `${key}-copy${counter}`;
    }

    const cloned = JSON.parse(JSON.stringify(original));
    cloned.name = `${original.name || key} (Copy)`;
    delete cloned.default; // Don't duplicate default flag

    currentCommands[newKey] = cloned;
    await saveCommands(currentCommands);
    showToast(`Cloned "${key}" to "${newKey}".`, 'success');
    renderCommandsList();
}

// Delete command
async function handleDelete(key) {
    if (confirm(`Are you sure you want to delete the command "${key}" and all its rules?`)) {
        await deleteCommand(key);
        delete currentCommands[key];
        showToast(`Command "${key}" deleted.`, 'info');
        renderCommandsList();
        runSimulation();
    }
}

// Export commands to JSON
async function handleExport() {
    const jsonStr = await exportCommandsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunnylol-rules-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported metadata rules to JSON file.', 'success');
}

// Import commands from JSON
async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = await importCommandsJson(event.target.result);
            currentCommands = imported;
            renderCommandsList();
            runSimulation();
            showToast(`Successfully imported ${Object.keys(imported).length} commands & rules!`, 'success');
        } catch (err) {
            alert('Failed to import JSON: ' + err.message);
        } finally {
            fileImportInput.value = '';
        }
    };
    reader.readAsText(file);
}

// Reset to Defaults
async function handleReset() {
    if (confirm('Reset all commands and metadata rules back to initial defaults? Any custom rules will be lost unless exported.')) {
        currentCommands = await resetToDefaults();
        renderCommandsList();
        runSimulation();
        showToast('Reset to original default commands & rules.', 'info');
    }
}

// Download Chrome Extension ZIP
function handleDownloadZip() {
    showToast('Preparing Chrome Extension package...', 'info');
    window.location.href = '/api/download-extension';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Start application
init();
