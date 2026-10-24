# ⏱️ AlgoTimer - Problem Solving Stopwatch & Timer

> A high-performance, precision stopwatch and target countdown Chrome extension engineered specifically for competitive programming, LeetCode / Codeforces grinders, and technical interview candidates.

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com)

---

## 🌟 Key Highlights

- **Dual Operational Modes**:
  - **Stopwatch (Count-Up)**: Track total time spent with millisecond precision and lap milestones.
  - **Target Timer (Countdown)**: Practice under real interview / contest pressure with countdown alerts.
- **Problem-Solving Presets**:
  - `5m` — Rapid-fire logic & sanity checks
  - `15m Easy` — LeetCode Easy targets
  - `30m Medium` — Standard technical interview difficulty
  - `45m Hard` — Full-round complex algorithmic challenges
  - `60m Mock` — Contest & multi-problem simulation
  - `Custom...` — Set exact Hours, Minutes, and Seconds
- **Floating In-Page Overlay**:
  - Injects a sleek, draggable, minimizable floating stopwatch directly onto coding platforms:
    - **LeetCode** (`leetcode.com`)
    - **Codeforces** (`codeforces.com`)
    - **HackerRank** (`hackerrank.com`)
    - **NeetCode** (`neetcode.io`)
    - **GeeksforGeeks** (`geeksforgeeks.org`)
    - **CodeChef** (`codechef.com`)
    - **AtCoder** (`atcoder.jp`)
- **Interview Phase Milestones (Laps)**:
  - 🧠 **Understand**: Problem comprehension & reading edge cases
  - 💡 **Approach**: Algorithm formulation & complexity analysis
  - 💻 **Code**: Writing clean, robust implementation
  - 🧪 **Debug**: Testing sample & custom test cases
- **Zero-Drift Background Engine**:
  - Calculates elapsed time from system timestamps rather than throttled intervals, ensuring exact accuracy even when switching tabs or locking your screen.
  - Live elapsed time displayed directly on your Chrome extension toolbar icon badge!
- **Session Logger & CSV Exporter**:
  - Record problem name, platform, difficulty, and outcome (Solved / Upsolved / Need Review).
  - Export all practice logs to **CSV** in 1 click for Notion or Google Sheets progress tracking.
- **Procedural Audio Alerts**:
  - Pleasant chimes for start, lap splits, 5-minute warnings, and target completion (synthesized using Web Audio API—100% offline, zero external dependencies).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Start / Pause timer |
| <kbd>L</kbd> | Record Lap / Stage Split |
| <kbd>R</kbd> | Reset Stopwatch |
| <kbd>M</kbd> | Toggle between Stopwatch & Target Timer |

---

## 🚀 How to Install in Google Chrome

1. Clone or download this repository to your computer:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/problem-timer-extension.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `problem-timer-extension` directory.
6. **Done!** Pin the ⏱️ **AlgoTimer** icon to your Chrome toolbar for instant access.

---

## 💻 Live Standalone Preview

Want to test the UI and timer without installing the extension?
1. Open `preview.html` directly in your browser:
   - Double-click `preview.html` or run:
     ```bash
     node server.js
     ```
   - Visit `http://127.0.0.1:3456/` in any browser!

---

## 📁 Repository Structure

```text
problem-timer-extension/
├── manifest.json              # Chrome Manifest V3 configuration
├── popup/
│   ├── popup.html             # Extension popup interface
│   ├── popup.css              # Dark glassmorphic styling
│   ├── popup.js               # Stopwatch, presets, laps & history logic
│   └── audio.js               # Web Audio API procedural sound engine
├── background/
│   └── service-worker.js      # Background timer engine, alarms & badge updater
├── content/
│   ├── content.js             # Draggable in-page floating widget script
│   └── content.css            # Floating widget styles
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg               # Vector brand logo
├── preview.html               # Standalone browser preview page
├── server.js                  # Local preview server
├── LICENSE                    # MIT License
└── README.md                  # Documentation
```

---

## 🌐 Adding to Your GitHub Profile

To push this repository to your GitHub profile:

1. Create a new repository on GitHub:
   - Go to [https://github.com/new](https://github.com/new)
   - Repository name: `problem-timer-extension` (or `algotimer`)
   - Description: `Precision stopwatch & target countdown Chrome extension for competitive programming and LeetCode.`
   - Set to **Public** and leave "Initialize with README" **unchecked** (we already created one!).
   - Click **Create repository**.

2. Link your local repository and push:
   ```bash
   cd c:\Users\ACER\.antigravity-ide\problem-timer-extension

   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/problem-timer-extension.git
   git push -u origin main
   ```

3. To feature it prominently on your GitHub profile:
   - Go to your GitHub profile (`https://github.com/<YOUR_GITHUB_USERNAME>`)
   - Click **Customize your pins**
   - Select **problem-timer-extension** to showcase it at the top of your profile!

---

## 👨‍💻 Author

- **Raisul Alam**
- Email: mohammadraisulalam014@gmail.com
- GitHub: [@raisulalam014-hue](https://github.com/raisulalam014-hue)

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
