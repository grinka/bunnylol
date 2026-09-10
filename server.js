import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// API endpoint to bundle and download the Chrome Extension
app.get('/api/download-extension', async (req, res) => {
  try {
    const zip = new JSZip();

    const filesToInclude = [
      'manifest.json',
      'background.js',
      'resolver.js',
      'storage.js',
      'commands.js',
      'popup.html',
      'popup.js',
      'options.html',
      'options.js'
    ];

    for (const filename of filesToInclude) {
      const filePath = path.join(__dirname, filename);
      if (fs.existsSync(filePath)) {
        zip.file(filename, fs.readFileSync(filePath, 'utf8'));
      }
    }

    // Add assets folder
    const assetsFolder = zip.folder('assets');
    const assetFiles = ['main.css', 'icon16.png', 'icon48.png', 'icon128.png'];
    for (const assetName of assetFiles) {
      const assetPath = path.join(__dirname, 'assets', assetName);
      if (fs.existsSync(assetPath)) {
        assetsFolder.file(assetName, fs.readFileSync(assetPath));
      }
    }

    // Add extension quickstart instructions
    const readmeContent = `# BunnyLOL Chrome Extension

## Quick Install (15 seconds)

1. Unzip this folder to a local directory (e.g. \`~/Downloads/bunnylol-extension\`).
2. Open Google Chrome and go to: \`chrome://extensions\`
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner and select this folder.
5. Done! You do NOT need any web hosting or GitHub Pages!

## How to Use

- In Chrome's address bar, type: \`b <space>\` or \`b <tab>\` followed by any command.
  Examples:
  - \`nova prod\` -> Opens Nova Production portal
  - \`nova dev\`  -> Opens Nova Dev environment
  - \`ticket 1234\` -> Opens Jira ticket
  - \`tcv-456\`  -> Opens Jira TCV ticket directly
  - \`g machine learning\` -> Searches Google
- Click the BunnyLOL icon in your Chrome toolbar for instant search and to open the **Rules Manager**!
`;
    zip.file('README.md', readmeContent);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="bunnylol-chrome-extension.zip"',
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
  } catch (err) {
    console.error('Error creating extension zip:', err);
    res.status(500).json({ error: 'Failed to generate extension zip: ' + err.message });
  }
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
