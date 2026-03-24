# 🟡 Zen Match — Tile Puzzle

> A relaxing match-3 tile puzzle game for your browser. Match identical tiles before the bar fills up!

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-0b74da)
![No Tracking](https://img.shields.io/badge/Privacy-No%20Tracking-51cf66)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎮 How to Play

1. Click tiles on the board to collect them into the **slot bar** (max 7 slots)
2. Collect **3 identical tiles** consecutively to clear them and score points
3. Plan carefully — if all 7 slots fill up, the game is over
4. Clear all tiles on the board to **complete the level**

---

## ✨ Features

- **Endless levels** — difficulty scales as you progress (more tile types, layered tiles)
- **Combo system** — chain matches to multiply your score
- **Undo** — take back your last move (3 uses per level)
- **Shuffle** — randomise remaining tiles when you're stuck (1 use per level)
- **Layer mechanic** — from level 3+, tiles stack on top of each other; uncover them first
- **Progress saved** — best level, best score and current game are saved locally
- **No ads, no tracking, no internet required**

---

## 📦 Installation (Load Unpacked)

1. Clone or download this repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/zen-match.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `zen-match` folder
5. The extension icon will appear in your toolbar — click to play

---

## 🗂️ Project Structure

```
zen-match/
├── manifest.json        # Chrome Extension config (Manifest V3)
├── popup.html           # Extension popup entry point
├── popup.js             # Popup logic
├── game.html            # Main game page
├── game.js              # Game engine (state, logic, rendering)
├── game.css             # Styles & animations
├── privacy.html         # Privacy policy
├── icon-generator.html  # Tool for regenerating icon PNGs
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔒 Privacy

Zen Match collects **zero personal data**. The only permission used is `storage`, which saves your game progress (best level, best score) locally on your device. Nothing is ever sent to a server.

See [privacy.html](privacy.html) for the full privacy policy.

---

## 🛠️ Tech Stack

- Vanilla JavaScript (no frameworks, no dependencies)
- Chrome Extension Manifest V3
- CSS animations & custom properties
- `chrome.storage.local` + `localStorage` for persistence

---

## 📄 License

MIT — feel free to fork and build on it.
