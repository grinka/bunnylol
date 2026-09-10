/**
 * BunnyLOL Command & Rule Resolver
 * CSP-compliant (no eval) for Chrome Extension Manifest V3 and Web.
 */

/**
 * Replace {0}, {1}, etc. placeholders with parameters
 */
export const replaceParameters = (template, params) => {
    if (!template) return '';
    let result = template;
    const paramsArray = typeof params === 'string' ? params.trim().split(/\s+/) : (params || []);
    paramsArray.forEach((param, index) => {
        result = result.replaceAll(`{${index}}`, param);
    });
    return result;
};

/**
 * Prepare command URL by substituting parameter indices and %s
 */
export const prepareCommandUrl = (urlTemplate, urlParams) => {
    if (!urlTemplate) return '';
    let preparedUrl = replaceParameters(urlTemplate, urlParams);
    preparedUrl = preparedUrl.replaceAll('%s', urlParams);
    return preparedUrl;
};

/**
 * Clean and unquote string tokens (e.g. "'prod'" -> "prod", '"dev"' -> "dev")
 */
const unquote = (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

/**
 * Safely evaluates a single comparison expression without eval()
 * e.g. "prod == 'prod'", "15 > 10", "'local' == 'localhost'"
 */
export const evaluateSingleComparison = (expr, paramsArray) => {
    if (!expr) return false;
    let trimmed = expr.trim();

    // Check for operators in order of length to avoid prefix collisions
    const operators = ['===', '!==', '==', '!=', '<=', '>=', '<', '>', '=~'];
    let matchedOp = null;
    let leftSide = '';
    let rightSide = '';

    for (const op of operators) {
        const idx = trimmed.indexOf(op);
        if (idx !== -1) {
            matchedOp = op;
            leftSide = trimmed.substring(0, idx).trim();
            rightSide = trimmed.substring(idx + op.length).trim();
            break;
        }
    }

    if (!matchedOp) {
        // Truthy check (e.g. true, false, or non-empty parameter)
        const unquoted = unquote(trimmed);
        if (unquoted.toLowerCase() === 'true') return true;
        if (unquoted.toLowerCase() === 'false' || unquoted === '') return false;
        return Boolean(unquoted);
    }

    const leftVal = unquote(leftSide);
    const rightVal = unquote(rightSide);

    // Number comparisons
    const leftNum = Number(leftVal);
    const rightNum = Number(rightVal);
    const isBothNumeric = !isNaN(leftNum) && !isNaN(rightNum) && leftVal !== '' && rightVal !== '';

    switch (matchedOp) {
        case '==':
        case '===':
            if (isBothNumeric) return leftNum === rightNum;
            return leftVal.toLowerCase() === rightVal.toLowerCase();
        case '!=':
        case '!==':
            if (isBothNumeric) return leftNum !== rightNum;
            return leftVal.toLowerCase() !== rightVal.toLowerCase();
        case '>':
            if (isBothNumeric) return leftNum > rightNum;
            return leftVal > rightVal;
        case '>=':
            if (isBothNumeric) return leftNum >= rightNum;
            return leftVal >= rightVal;
        case '<':
            if (isBothNumeric) return leftNum < rightNum;
            return leftVal < rightVal;
        case '<=':
            if (isBothNumeric) return leftNum <= rightNum;
            return leftVal <= rightVal;
        case '=~':
            try {
                const regex = new RegExp(rightVal, 'i');
                return regex.test(leftVal);
            } catch {
                return false;
            }
        default:
            return false;
    }
};

/**
 * Safely evaluates a rule condition string
 * Supports || and && operators with placeholders {0}, {1}, etc.
 * Examples:
 *   "{0} == 'prod' || {0} == 'production'"
 *   "{0} > 10 && {0} < 50"
 */
export const evaluateCondition = (conditionStr, paramsArray) => {
    if (!conditionStr || typeof conditionStr !== 'string') return false;

    // Substitute {0}, {1}, etc.
    let substituted = conditionStr;
    paramsArray.forEach((p, i) => {
        // Substitute unquoted first
        substituted = substituted.replaceAll(`{${i}}`, p);
    });

    // Handle || (any true => return true)
    const orParts = substituted.split(/\s*\|\|\s*/);
    for (const orPart of orParts) {
        // Handle && (all must be true)
        const andParts = orPart.split(/\s*&&\s*/);
        const andResult = andParts.every(part => evaluateSingleComparison(part.trim(), paramsArray));
        if (andResult) return true;
    }
    return false;
};

/**
 * Find command by exact command key
 */
export const findCommandByKey = (commands, input) => {
    if (!input || !commands) return null;
    const commandKey = input.trim().split(/\s+/)[0];
    // Exact match first
    if (commands[commandKey]) {
        return { commandKey, command: commands[commandKey], matchType: 'exact' };
    }
    // Case-insensitive match fallback
    const lowerKey = commandKey.toLowerCase();
    for (const key in commands) {
        if (key.toLowerCase() === lowerKey) {
            return { commandKey: key, command: commands[key], matchType: 'exact' };
        }
    }
    return null;
};

/**
 * Find command by prefix
 */
export const findCommandByPrefix = (commands, input) => {
    if (!input || !commands) return null;
    const trimmedInput = input.trim();
    const lowerInput = trimmedInput.toLowerCase();
    for (const key in commands) {
        const command = commands[key];
        if (command.prefix && lowerInput.startsWith(command.prefix.toLowerCase())) {
            return { commandKey: command.prefix, command, matchType: 'prefix' };
        }
    }
    return null;
};

/**
 * Get default fallback command
 */
export const getDefaultCommand = (commands) => {
    if (!commands) return null;
    for (const key in commands) {
        if (commands[key].default) {
            return { commandKey: key, command: commands[key], matchType: 'default' };
        }
    }
    return null;
};

/**
 * Build URL by evaluating rules array
 */
export const buildRulesUrlWithTrace = (command, urlParams) => {
    const paramsArray = urlParams ? urlParams.trim().split(/\s+/) : [];
    const trace = [];

    if (command.rules && Array.isArray(command.rules)) {
        for (let i = 0; i < command.rules.length; i++) {
            const rule = command.rules[i];
            const matched = evaluateCondition(rule.condition, paramsArray);
            trace.push({
                index: i,
                condition: rule.condition,
                targetUrl: rule.url,
                matched
            });
            if (matched) {
                return {
                    url: prepareCommandUrl(rule.url, urlParams),
                    matchedRule: rule,
                    matchedRuleIndex: i,
                    trace
                };
            }
        }
    }

    const fallbackUrl = prepareCommandUrl(command.url, urlParams);
    return {
        url: fallbackUrl,
        matchedRule: null,
        matchedRuleIndex: -1,
        trace
    };
};

/**
 * Resolve query input to final URL with complete metadata trace
 */
export const resolveQuery = (commands, rawInput) => {
    const input = (rawInput || '').trim();
    if (!input) return null;

    let match = findCommandByKey(commands, input) ||
                findCommandByPrefix(commands, input);

    let isDefault = false;
    if (!match) {
        const defaultCmd = getDefaultCommand(commands);
        if (defaultCmd) {
            match = { ...defaultCmd, commandKey: '' };
            isDefault = true;
        } else {
            return null;
        }
    }

    const { commandKey, command, matchType } = match;

    // Extract parameters after commandKey or prefix
    let urlParams = '';
    if (isDefault) {
        urlParams = input;
    } else {
        urlParams = input.substring(commandKey.length).trim();
    }

    const paramsArray = urlParams ? urlParams.split(/\s+/) : [];

    let finalUrl = '';
    let matchedRule = null;
    let ruleTrace = [];

    if (!urlParams) {
        finalUrl = command.url || command.searchUrl || '';
    } else if (command.rules && command.rules.length > 0) {
        const ruleResult = buildRulesUrlWithTrace(command, urlParams);
        finalUrl = ruleResult.url;
        matchedRule = ruleResult.matchedRule;
        ruleTrace = ruleResult.trace;
    } else {
        const template = command.searchUrl || command.url || '';
        finalUrl = prepareCommandUrl(template, urlParams);
    }

    return {
        input,
        commandKey,
        command,
        matchType,
        isDefault,
        urlParams,
        paramsArray,
        matchedRule,
        ruleTrace,
        finalUrl
    };
};
