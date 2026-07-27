# OpenFront Auto-Join & Helpers

Unofficial browser extension for [OpenFront](https://openfront.io).

It helps you find public lobbies faster and adds optional in-game helper overlays such as bot markers, nuke and boat prediction, gold-per-minute stats, trade balances, heatmaps, and alliance tools.

## Installation

1. Download or clone this repository.
2. Install dependencies:

```powershell
npm install
```

3. Build the popup:

```powershell
npm run build:popup
```

4. Open Chrome or Edge and go to:

```text
chrome://extensions
```

5. Enable `Developer mode`.
6. Click `Load unpacked`.
7. Select the repository folder containing `manifest.json`.
8. Open or reload [OpenFront](https://openfront.io).

If the browser says `dist-popup/index.html` is missing, run `npm run build:popup` again and reload the extension.

## Updating

### Chrome Web Store

Chrome updates installed extensions automatically.

After an update, the popup shows a short `What's new` dialog with the most important changes.

### Manual Installation

1. Pull or download the latest files.
2. Rebuild the popup:

```powershell
npm run build:popup
```

3. Open `chrome://extensions`.
4. Click the reload button on the extension card.
5. Reload any open OpenFront tab.

## Development

Install dependencies:

```powershell
npm install
```

Build the popup:

```powershell
npm run build:popup
```

Watch popup changes during development:

```powershell
npm run dev:popup
```

Run popup type checks:

```powershell
npm run check:popup
```

Useful syntax checks:

```powershell
node --check content\core.js
node --check content\floating-helpers.js
node --check content\auto-join.js
node --check page-bridge\runtime.js
node --check page-bridge\shared-utils.js
node --check page-bridge\selective-trade-policy.js
node --check page-bridge\bot-markers.js
node --check page-bridge\gold-per-minute.js
node --check page-bridge\trade-balances.js
node --check page-bridge\nuke-prediction.js
node --check page-bridge\boat-prediction.js
node --check page-bridge\heatmaps.js
node --check page-bridge\bootstrap.js
```

If you change translations, verify the locale files:

```powershell
node scripts\verify-i18n.js
```

## Privacy

This extension is designed for OpenFront helper functionality only.

- No analytics
- No telemetry
- No account system
- No external tracking
- Settings are stored locally in browser extension storage

See `PRIVACY.md` for more details.

## Permissions

The extension uses:

- `storage` to save settings locally
- `activeTab` for extension interaction with the current tab
- host access to `https://openfront.io/*` so helper scripts can run on OpenFront

## Disclaimer

This project is unofficial and is not affiliated with OpenFront or its developers.
