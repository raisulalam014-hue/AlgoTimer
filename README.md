# ⏱️ AlgoTimer - Problem Solving Stopwatch & Timer

> A high-performance, precision stopwatch and target countdown Chrome extension engineered specifically for competitive programming, LeetCode / Codeforces grinders, and technical interview candidates.

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com)

---

## 🚀 Key Highlights & New Features

### 1. 🗗 Always-On-Top Pop-Up Screen System (PiP & Detachable Window)
- **Float Over Any Desktop App**: Pop out the timer from your browser into a floating mini window using native **Document Picture-in-Picture** (`window.documentPictureInPicture`).
- **Never Loses Focus**: Stays pinned **Always-On-Top** directly over your code editor (**VS Code**, Neovim, IntelliJ), terminal, Discord, or desktop notes!
- **Standalone Window Fallback**: 1-click fallback to a dedicated, resizable standalone popup window that won't auto-dismiss when clicking outside.
- **In-Page Widget Integration**: Direct Pop-Out button embedded inside the LeetCode/Codeforces overlay widget.

### 2. ⚡ Dynamic Concurrent Dual Timers (Both Active Simultaneously)
- **Stopwatch & Target Timer Run Together**: Solve problems with a target countdown deadline while simultaneously measuring total elapsed solve time and milestone splits.
- **No More Auto-Stop**: Starting or switching between Target Timer and Stopwatch never pauses or resets the other timer. Both engines run concurrently in the background!
- **Master Synchronization**: One-click **⚡ Start Both Together**, **⏸ Pause Both**, and **↺ Reset Both** controls.
- **Real-Time Concurrent Banners**: When viewing one mode, an interactive glassmorphic banner displays the background timer's live status with instant **Pause** and **View/Switch** actions.
- **Dedicated Dual View**: Side-by-side / stacked HUD showing both stopwatch count-up (with milliseconds) and target countdown (with animated progress bar and warning chimes).

### 3. 🎯 Problem-Solving Presets & Custom Duration
- `5m` — Rapid-fire sanity checks & logic verification
- `15m Easy` — LeetCode Easy targets
- `30m Medium` — Standard technical interview difficulty
- `45m Hard` — Complex algorithmic challenges & contest rounds
- `60m Mock` — Full interview simulation
- `Custom...` — Custom hours, minutes, and seconds

### 4. 💻 Floating In-Page Overlay & Dynamic Edge Pill (v1.3.0)
- **Smart Visibility Control (No More Unwanted New-Tab Popups!)**:
  - **Coding Sites Only (Default)**: Automatically activates exclusively on coding platforms (**LeetCode**, **Codeforces**, **HackerRank**, **NeetCode**, **GeeksforGeeks**, **CodeChef**, **AtCoder**, **CSES**, etc.) — won't clutter everyday browsing, Google Search, or YouTube.
  - **Only When Running Mode**: Keep the widget completely hidden until you actively start a countdown or stopwatch.
  - **All Webpages Mode**: Available for general browsing & mock interviews.
- **Dynamic Dismissal & Close Menu**:
  - Click `✕` to reveal instant controls:
    - 🗜️ **Minimize to Edge Pill**: Folds the timer into an ultra-discreet, glowing edge tab (`⏱️ 12:34`) that expands smoothly on click.
    - 🌐 **Hide on this website**: Remembers your preference per-domain across all tabs and sessions.
    - ✕ **Close for this tab**: Closes the overlay for the active tab without affecting other tabs.
    - 🚫 **Turn off everywhere**: One-click global disable directly from the in-page widget.
- **Difficulty & Problem Detection**:
  - Automatically extracts problem titles and tags difficulty levels (**Easy** 🟢, **Medium** 🟡, **Hard** 🔴) on LeetCode.

### 5. 🏁 Interview Phase Milestones (Laps)
- 📖 **Understand**: Problem comprehension & reading edge cases
- 💡 **Approach**: Algorithm formulation & complexity analysis
- 💻 **Code**: Writing clean, robust implementation
- 🧪 **Debug**: Testing sample & custom test cases

### 6. ⏱️ Zero-Drift Background Engine
- Calculates elapsed time from system timestamps rather than throttled intervals, ensuring exact accuracy even when switching tabs or locking your screen.
- Live elapsed time / countdown displayed directly on your Chrome extension toolbar icon badge!

### 7. 📊 Session Logger & CSV Exporter
- Record problem name, platform, difficulty, and outcome (Solved / Upsolved / Need Review).
- Export all practice logs to **CSV** in 1 click for Notion or Google Sheets progress tracking.

### 8. 🔔 Procedural Audio Alerts
- Pleasant chimes for start, lap splits, 5-minute warnings, and target completion (synthesized using Web Audio API — 100% offline, zero external dependencies).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Start / Pause timer (or both in Dual Mode) |
| <kbd>L</kbd> | Record Lap / Stage Split |
| <kbd>R</kbd> | Reset Stopwatch (or both in Dual Mode) |
| <kbd>M</kbd> | Toggle between Stopwatch, Target Timer & Dual Mode |

---

## 📦 How to Install in Google Chrome

1. Clone or download this repository to your computer:
   ```bash
   git clone https://github.com/raisulalam014-hue/AlgoTimer.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `AlgoTimer` directory.
6. **Done!** Pin the ⏱️ **AlgoTimer** icon to your Chrome toolbar for instant access.

---

## 🌐 Live Standalone Preview

Want to test the UI, dual timers, and pop-up float without installing the extension?
1. Run the local preview server:
   ```bash
   node server.js
   ```
2. Visit `http://127.0.0.1:3456/` in any browser!

---

## 📁 Repository Structure

```text
AlgoTimer/
├── manifest.json              # Chrome Manifest V3 configuration (v1.1.0)
├── popup/
│   ├── popup.html             # Extension popup interface with Dual Mode & Pop-Up PiP
│   ├── popup.css              # Dark glassmorphic styling & responsive PiP adaptations
│   ├── popup.js               # Dual independent timer engines, PiP popout & laps logic
│   └── audio.js               # Web Audio API procedural sound engine
├── background/
│   └── service-worker.js      # Zero-drift background engine, alarms & badge updater
├── content/
│   ├── content.js             # Draggable in-page floating widget script with PiP
│   └── content.css            # Floating widget styles & dual timer HUD
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg               # Vector brand logo
├── preview.html               # Standalone browser preview & testing studio
├── server.js                  # Local preview server
├── LICENSE                    # MIT License
└── README.md                  # Documentation
```

---

## 🌟 Live Repository & Profile Showcase

This repository is published and active at:
🔗 **[https://github.com/raisulalam014-hue/AlgoTimer](https://github.com/raisulalam014-hue/AlgoTimer)**

### To feature it prominently on your GitHub profile:
1. Go to your GitHub profile: [github.com/raisulalam014-hue](https://github.com/raisulalam014-hue)
2. Scroll to the **Pinned** section and click **Customize your pins** (or **Pin a repository**).
3. Select **AlgoTimer** and click **Save pins**!

---

## 👨‍💻 Author

- **Raisul Alam**
- Email: mohammadraisulalam014@gmail.com
- GitHub: [@raisulalam014-hue](https://github.com/raisulalam014-hue)

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
