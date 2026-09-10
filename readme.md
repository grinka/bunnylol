# BunnyLOL - Chrome Extension

BunnyLOL provides quick and easy "command-line" style smart bookmarks, search redirects, and conditional routing directly inside Google Chrome without requiring any web hosting.

Type `b <space>` into Chrome's address bar followed by any command with parameters to navigate directly to your destinations.

## Quick Install in Google Chrome

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Turn on the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner and select this folder.
5. That's it! No hosting, server, or cloud deployment is required.

## How to Use

In Chrome's address bar, type:
```text
b <space> <command> [parameters]
```

### Examples

- **One-Word Commands:**
  - `b g` — Opens Google
  - `b ld` — Opens LaunchDarkly
  - `b workday` — Opens Workday portal

- **Commands With Parameters:**
  - `b ticket AY-1234` — Takes you directly to Jira ticket `AY-1234` (`https://ayadev.atlassian.net/browse/{0}`)
  - `b cf authentication` — Searches Confluence for "authentication"

- **Commands With Prefixes:**
  - `b TCV-4432` — Automatically recognizes the prefix `TCV-` and opens Jira ticket `TCV-4432`

- **Commands With Conditional Rules:**
  - `b nova prod` — Matches `{0} == 'prod'` &rarr; opens Nova Production
  - `b nova dev` — Matches `{0} == 'dev'` &rarr; opens Nova Dev environment
  - `b nova local` — Matches `{0} == 'local'` &rarr; opens `http://localhost:4201/`
  - `b nova other` — Falls back to default template `https://nova-{0}.ayahealthcare.com/`

- **Toolbar Popup:**
  - Click the BunnyLOL icon in your Chrome toolbar for instant search, command completion, and quick shortcut links.

## Extension Settings & Rules Manager

Open Extension Settings by:
1. Clicking the BunnyLOL toolbar icon &rarr; **Manage Rules**
2. Or navigating to `chrome://extensions` &rarr; BunnyLOL &rarr; **Extension options**

From the settings page you can:
- **Add, edit, clone, and delete commands**
- **Manage conditional metadata rules** for any command with live testing
- **Interactive Rule Simulator** to preview how queries resolve before saving
- **Export & Import JSON** to backup or transfer rules
- **Syncs automatically** across your Google Chrome profiles using `chrome.storage.sync`

## Extension Files

- `manifest.json`: Manifest V3 extension configuration
- `background.js`: Service worker for Omnibox (`b`) search routing and autocomplete
- `popup.html` & `popup.js`: Quick toolbar popup search interface
- `options.html` & `options.js`: Settings & metadata rules manager UI
- `resolver.js`: Safe, CSP-compliant rule evaluation and URL substitution engine
- `storage.js`: Unified storage manager with `chrome.storage.sync` and `localStorage` support
- `commands.js`: Default command definitions and initial seed rules
- `assets/main.css`: Self-contained design system stylesheet
- `assets/icon*.png`: Extension icons (16px, 48px, 128px)
