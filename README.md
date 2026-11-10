# ⏱️ AlgoTimer - Problem Solving Stopwatch & Timer

> A high-performance, precision stopwatch and target countdown Chrome extension engineered specifically for competitive programming, LeetCode / Codeforces grinders, and technical interview candidates.

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com)

---

## 🚀 Key Highlights & Features

### 1. 🎨 Five Complete Timer Designs
- **Sunset Glass**: dark plum surfaces with warm orange, coral, and pink accents.
- **Warm Minimal**: soft neutral surfaces with crisp orange controls.
- **Aurora**: cool blue-violet cards with coral highlights.
- **Graphite Neon**: charcoal surfaces with violet and warm-yellow details.
- **Full Black**: pure-black surfaces with high-contrast white text and warm yellow controls.
- Choose a design in **Settings → Timer Design**. It is saved and synchronized across the popup, browser floating timer, and Windows companion.
- **Precision HUD Dial & Sub-Gauges**: Outer dotted perimeter tick track, glowing SVG progress ring, and 3 mini precision sub-gauges (`LAPS`, `SPLIT`, `STATUS`).
- **Luminous Horizon Flare**: Neon crescent horizon flare across the bottom edge inspired by futuristic cockpit displays.

### 2. Persistent Floating Timer
- **Persistent Extension Window**: The timer stays open when focus changes or browser tabs switch. Other applications can cover it unless Picture-in-Picture is available and enabled.
- **Browser Picture-in-Picture**: Use the PiP control in the floating window for browser-managed always-on-top behavior where supported. The browser controls the PiP window position.
- **Four-corner positioning**: Pin the window to a selected corner, or unpin it to drag and snap near screen edges.
- **Mini and expanded modes**: Switch between a compact click-to-expand timer and the full timer controls without starting another timer.
- **Persistent layout**: Corner, pin state, free position, and view mode are restored when the floating timer is reopened.

### 3. 🪟 Optional Windows Companion
- A lightweight .NET 8 Windows companion provides a real topmost native timer, four-corner pinning per display, and cross-app global hotkeys.
- The extension background remains the **single source of timer state**; the companion receives timestamped state updates and routes timer commands back to it.
- If the companion is missing or disconnected, the Chrome extension remains usable and the popup reports the companion status.

#### Install the companion
1. Install the AlgoTimer extension in Chrome and copy its 32-character ID from `chrome://extensions`.
2. Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) if it is not already available.
3. Open PowerShell in the repository's `companion` folder and run `.\build.ps1`.
4. Run `.\install.ps1` and enter the extension ID when prompted. This registers the native messaging host for the current Windows user only.
5. Reload AlgoTimer in Chrome, open **Settings → Windows Companion**, and check that it reports a connection.

The companion is launched by Chrome when the extension connects; no service or background startup task is installed. To remove the registration, run `.\uninstall.ps1`. The script only removes the companion's current-user Chrome native-messaging registration; published files are left in place.

#### Windows companion shortcuts

| Shortcut | Action |
| :---: | :--- |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>1</kbd> | Start / Resume active timer |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>2</kbd> | Pause active timer |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>3</kbd> | Record a lap |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>4</kbd> | Reset active timer |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>5</kbd> | Show / Hide native timer |

These are registered by Windows while the companion is connected, so they work with other applications focused. Windows may reject a shortcut already claimed by another application; the popup shows registration conflicts. Use **Edit shortcuts** in the native window to customize the `Hotkeys` values in `%AppData%\AlgoTimer\companion.settings.json`, then reload the extension in Chrome. The native window remains topmost while the companion is connected and can be pinned to any corner on a selected display.

The v1 native-messaging protocol uses Chrome's standard stdio framing (a 4-byte little-endian message length followed by JSON). Chrome sends `hello`, timer `state`, `theme`, and window show/hide requests; the companion returns status and hotkey registration results, and sends timer commands back to Chrome. Timer commands are persisted and broadcast by the extension background before the native display updates.

### 4. ⚡ Dynamic Concurrent Dual Timers (Both Active Simultaneously)
- **Stopwatch & Target Countdown Together**: Measure total elapsed problem time while simultaneously tracking remaining countdown time.
- **Master Controls**: Start, pause, or reset both timers together in lockstep with zero drift.

### 5. 🎯 Problem-Solving Presets & Custom Duration
- Quick one-click time targets: `5m`, `15m (Easy)`, `30m (Medium)`, `45m (Hard)`, `60m (Mock Interview)`.
- Custom hour / minute / second target input with smart persistence.

### 6. 💻 Floating In-Page Overlay on Coding Sites
- Works seamlessly directly on LeetCode, HackerRank, Codeforces, NeetCode, CodeChef.
- Draggable and resizable corner dock with non-intrusive HUD styling.

### 7. 🏁 Interview Phase Milestones (Laps)
- One-click phase recording: `📖 Understand`, `💡 Approach`, `💻 Code`, `🧪 Debug`.
- Real-time lap splits and pace comparison.

### 8. ⏱️ Zero-Drift Background Engine
- Runs on Chrome Manifest V3 Service Worker with `chrome.alarms` and high-resolution timestamps. Keeps ticking even when popup is closed!

### 9. 📊 Session Logger & CSV Exporter
- Log problem title, platform, difficulty, outcome (`Solved`, `Upsolved`, `Need Review`), and takeaway notes.
- Export all your practice history to clean CSV for Notion, Google Sheets, or Excel.

---

## Keyboard Shortcuts

The extension registers four Chrome commands. Its timer shortcut toggles Start/Resume and Pause based on the active timer state. Defaults can be customized at `chrome://extensions/shortcuts`. On Windows, install the optional companion for separate cross-app shortcuts that distinguish Start and Pause and show the genuine topmost native timer.

| Shortcut | Action |
| :---: | :--- |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>1</kbd> | Start / Resume / Pause active timer |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>2</kbd> | Record a lap |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>3</kbd> | Reset active timer |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>4</kbd> | Show or minimize floating timer |

Chrome and operating-system shortcut conflicts may prevent a suggested default from being assigned. Global shortcut availability varies by platform; customize an available combination in Chrome's shortcut settings.

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
├── float.html                 # Persistent floating timer window
├── float.js                   # Floating window controller with dynamic themes & snapping
├── popup/
│   ├── popup.html             # Extension popup interface with dynamic themes & dial
│   ├── popup.css              # Cyber-luxury styling, nebula glow, horizon flare
│   ├── popup.js               # Dual timer logic, storage persistence & shortcuts
│   └── audio.js               # Procedural audio chime synthesizer
├── background/
│   └── service-worker.js      # Zero-drift background engine & badge updater
├── companion/                 # Optional Windows native hotkey / topmost timer host
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
