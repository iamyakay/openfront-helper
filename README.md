<div align="center">

# OpenFront Auto-Join & Helpers

**Unofficial browser extension for [OpenFront](https://openfront.io)** — find public lobbies faster and unlock powerful in-game overlays.

![Version](https://img.shields.io/badge/version-2.5.2-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-orange)
![Languages](https://img.shields.io/badge/languages-179-purple)
![License](https://img.shields.io/github/license/phil0010-gh/openfront-helper)

</div>

---

## ✨ Features

### 🔍 Lobby Finder
| Feature | Description |
|---|---|
| **Auto-Join** | Automatically joins the first public lobby matching your filters |
| **Advanced Filters** | Filter by map, game mode, team size, lobby size, and game modifiers (starting gold, random spawn, water nukes, and more) |
| **Lobby Forecast** | Live statistical model estimates how long until a matching lobby appears — hit chance, ETA range, and median lobbies-to-match |
| **Join Notifications** | Popup window + configurable alert sound the moment a match is found |

### 🎮 In-Game Helpers
| Helper | Description |
|---|---|
| **Bot Markers** | Marks nation AI players in red |
| **Nuke Prediction** | Shows predicted enemy nuke landing points and blast radius |
| **Boat Prediction** | Shows enemy boat landing points (red = targeting you, yellow = others) |
| **Nuke Suggestions** | Hover an enemy to see high-damage atom/hydrogen targets *(cheats-enabled games only)* |
| **Auto Nuke** | Adds automated economy/population nuke actions to the player wheel *(cheats-enabled games only)* |
| **Send 1% Boat** | Right-click any tile to send a 1%-troop boat, then restores your ratio |
| **Alliance Tools** | Ally highlighting with remaining alliance time + dedicated alliance-requests panel |

### 📊 Economy Statistics
| Helper | Description |
|---|---|
| **Gold per Minute** | Live GPM in the player hover panel |
| **Team GPM** | Per-team total gold-per-minute leaderboard |
| **Top 10 GPM** | Highest tracked player GPM rankings |
| **Trade Balances** | Observed trade imports and exports per player |
| **Economic Heatmap** | Highlights structures by observed trade revenue, with adjustable intensity |
| **Export Partner Heatmap** | Hover a player to highlight their export partners |
| **Selective Trade Policy** | Auto-cancel denied trades and manage embargo rules |

### 🌍 Internationalization
Fully localized UI in **179 languages**.

---

## 🚀 Installation

> Requires [Node.js](https://nodejs.org/) 18+ for the popup build step.

1. **Download or clone** this repository:
   ```powershell
   git clone https://github.com/phil0010-gh/openfront-helper.git
   cd openfront-helper
   ```
2. **Install dependencies and build** the popup:
   ```powershell
   npm install
   npm run build:popup
   ```
3. **Load the extension** in Chrome or Edge:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the repository folder (the one containing `manifest.json`)
4. Open or reload [openfront.io](https://openfront.io) 🎉

> **Troubleshooting:** If the browser reports `dist-popup/index.html` is missing, run `npm run build:popup` again and reload the extension.

---

## 🔄 Updating

### Chrome Web Store
Chrome updates installed extensions automatically. After an update, the popup shows a short **What's new** dialog with the most important changes.

### Manual Installation
1. Pull the latest files and rebuild:
   ```powershell
   git pull
   npm run build:popup
   ```
2. Open `chrome://extensions` and click the **reload** button on the extension card.
3. Reload any open OpenFront tab.

---

## 🛠️ Development

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run build:popup` | Production build of the popup UI (Vite + React + TypeScript) |
| `npm run dev:popup` | Watch mode for popup development |
| `npm run check:popup` | TypeScript type checks for the popup |
| `node scripts\verify-i18n.js` | Validate locale files after translation changes |

### Project Structure

```
├── background.js        # MV3 service worker (icon state, notifications)
├── content/             # Content scripts (lobby filtering, auto-join, floating panel)
├── page-bridge/         # Page-context scripts (game overlays and helpers)
├── popup-ui/            # React + TypeScript popup (Vite)
├── shared/              # Settings + i18n shared between contexts
├── locales/             # 179 language bundles
├── scripts/             # Locale generation and verification tooling
└── manifest.json        # Extension manifest (MV3)
```

### Syntax Checks

Content and page-bridge scripts are plain JavaScript. Verify them with:

```powershell
Get-ChildItem content, page-bridge -Filter *.js | ForEach-Object { node --check $_.FullName }
```

---

## 🔒 Privacy

This extension is designed for OpenFront helper functionality **only**.

- ✅ No analytics
- ✅ No telemetry
- ✅ No account system
- ✅ No external tracking
- ✅ Settings stored locally in browser extension storage

See [`PRIVACY.md`](PRIVACY.md) for details.

## 🔑 Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save your settings locally |
| `activeTab` | Extension interaction with the current tab |
| `https://openfront.io/*` | Run helper scripts on OpenFront pages |

---

## ⚠️ Disclaimer

This project is **unofficial** and is not affiliated with OpenFront or its developers.
