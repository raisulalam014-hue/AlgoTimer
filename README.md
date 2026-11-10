# ⏱️ AlgoTimer - Problem Solving Stopwatch & Timer

> A high-performance, precision stopwatch and target countdown Chrome extension engineered specifically for competitive programming, LeetCode / Codeforces grinders, and technical interview candidates.

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com)

---

## 🚀 Key Highlights & Features

### 1. 🎨 Dynamic Cyber-Luxury Theme Engine (No AI Slop)
- **Deep Obsidian & Cosmic Violet Glow**: Deep space backdrop (`#060713`) infused with ambient violet nebula lighting.
- **4 Live Dynamic Color Palettes**:
  - 🌌 **Cosmic Neon (Default)**: Multi-stop gradient (`#00f2fe` Electric Cyan → `#8b5cf6` Radiant Purple → `#ec4899` Horizon Magenta).
  - ⚡ **Cyber Cyan**: Pure sci-fi HUD turquoise with luminous neon glow.
  - 🔮 **Nebula Violet**: Deep velvet violet and lavender bloom.
  - 🌲 **Matrix Emerald**: Sleek terminal mint and dark emerald.
- **Precision HUD Dial & Sub-Gauges**: Outer dotted perimeter tick track, glowing SVG progress ring, and 3 mini precision sub-gauges (`LAPS`, `SPLIT`, `STATUS`).
- **Luminous Horizon Flare**: Neon crescent horizon flare across the bottom edge inspired by futuristic cockpit displays.

### 2. 🗗 Always-On-Top Floating HUD Screen (Floats Over VS Code & Other Apps)
- **Float Over Any Desktop App**: Pop out the timer into an always-on-top window using native **Document Picture-in-Picture** (`window.documentPictureInPicture`) or standalone popup window (`float.html`).
- **Never Loses Focus**: Stays pinned **Always-On-Top** directly over VS Code, Discord, terminal, or full-screen coding platforms.
- **4-Corner Dock Snapping**: One-click corner cycling (`↗ Top-Right`, `↘ Bottom-Right`, `↙ Bottom-Left`, `↖ Top-Left`).
- **Multi-Size Scaling**: Cycle between **Normal** (320x380 full precision dial), **Compact** (260x210 streamlined), and **Mini** (200x110 micro widget).

### 3. ⚡ Dynamic Concurrent Dual Timers (Both Active Simultaneously)
- **Stopwatch & Target Countdown Together**: Measure total elapsed problem time while simultaneously tracking remaining countdown time.
- **Master Controls**: Start, pause, or reset both timers together in lockstep with zero drift.

### 4. 🎯 Problem-Solving Presets & Custom Duration
- Quick one-click time targets: `5m`, `15m (Easy)`, `30m (Medium)`, `45m (Hard)`, `60m (Mock Interview)`.
- Custom hour / minute / second target input with smart persistence.

### 5. 💻 Floating In-Page Overlay on Coding Sites
- Works seamlessly directly on LeetCode, HackerRank, Codeforces, NeetCode, CodeChef.
- Draggable and resizable corner dock with non-intrusive HUD styling.

### 6. 🏁 Interview Phase Milestones (Laps)
- One-click phase recording: `📖 Understand`, `💡 Approach`, `💻 Code`, `🧪 Debug`.
- Real-time lap splits and pace comparison.

### 7. ⏱️ Zero-Drift Background Engine
- Runs on Chrome Manifest V3 Service Worker with `chrome.alarms` and high-resolution timestamps. Keeps ticking even when popup is closed!

### 8. 📊 Session Logger & CSV Exporter
- Log problem title, platform, difficulty, outcome (`Solved`, `Upsolved`, `Need Review`), and takeaway notes.
- Export all your practice history to clean CSV for Notion, Google Sheets, or Excel.

---

## ⌨️ High-Contrast Keyboard Shortcuts

| Shortcut | Action | Scope |
| :---: | :--- | :--- |
| <kbd>Space</kbd> | **Start / Pause** Active Timer | Popup, Floating Window & Webpages |
| <kbd>L</kbd> | Record **Lap / Checkpoint Split** | Popup & Floating Window |
| <kbd>R</kbd> | **Reset** Active Timer | Popup & Floating Window |
| <kbd>M</kbd> | **Cycle Mode** (Stopwatch → Target → Dual) | Popup & Floating Window |
| <kbd>Alt</kbd> + <kbd>T</kbd> | **Launch Pop Up Floating Screen** | Any Chrome Tab |

---

## 📦 How to Install in Google Chrome (100% Free & Offline)

1. **Download or Clone this repository**:
   ```bash
   git clone https://github.com/raisulalam014-hue/AlgoTimer.git
   ```
   *(Or click **Code → Download ZIP** on GitHub and extract the folder).*
2. Open Google Chrome and go to:
   ```text
   chrome://extensions
   ```
3. Turn **ON** the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the extracted `AlgoTimer` folder.
6. **Done!** Pin ⏱️ **AlgoTimer** to your Chrome toolbar for instant access!

---

## 🌐 Instant Standalone Browser Preview (Zero Server Required!)

Want to test the UI, dynamic color combinations, dual timers, and floating HUD **instantly without installing the extension and with zero server/Node dependencies**?

- **Simply double-click `index.html` or `preview.html`** in your file manager to open it in Chrome, Edge, Brave, or Firefox!
- **100% Offline & Pure Client-Side**: No `node server.js`, no `localhost`, and no background server needed. Everything runs directly in your browser.
- **GitHub Pages Ready**: Can be hosted directly on GitHub Pages with zero build step.

---

## 📁 Repository Structure

```text
AlgoTimer/
├── manifest.json              # Chrome Manifest V3 extension configuration
├── index.html                 # 100% standalone zero-server interactive studio
├── preview.html               # Live preview studio with split popup & in-page HUD
├── float.html                 # Always-on-Top floating screen window
├── float.js                   # Floating window controller with dynamic themes & snapping
├── popup/
│   ├── popup.html             # Extension popup interface with dynamic themes & dial
│   ├── popup.css              # Cyber-luxury styling, nebula glow, horizon flare
│   ├── popup.js               # Dual timer logic, storage persistence & shortcuts
│   └── audio.js               # Procedural audio chime synthesizer
├── background/
│   └── service-worker.js      # Zero-drift background engine & badge updater
├── content/
│   ├── content.js             # In-page floating overlay on coding platforms
│   └── content.css            # In-page widget styles & HUD
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg               # Vector brand logo
├── LICENSE                    # MIT License
└── README.md                  # Documentation
```

---

## 👨‍💻 Author

Crafted by **[Raisul Alam](https://github.com/raisulalam014-hue)** for algorithm enthusiasts and competitive coders worldwide.

⭐ **If you find AlgoTimer helpful, star the repository on GitHub!**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
