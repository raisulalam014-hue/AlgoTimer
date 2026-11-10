// AlgoTimer - Always-on-Top Floating Screen for Other Apps (VS Code, Discord, Desktop)
// Cyber-Luxury HUD: Dynamic Color Themes, SVG Precision Ring, 3 Sub-Gauges, 4-Corner Snapping, Multi-Size

(function () {
  let state = {
    mode: 'stopwatch',
    allowDualActive: true,
    stopwatch: { status: 'stopped', startTime: null, elapsedBeforePause: 0 },
    targetTimer: { status: 'stopped', startTime: null, elapsedBeforePause: 0, targetDurationMs: 30 * 60 * 1000 },
    laps: []
  };

  const CORNERS = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
  const SIZES = [
    { name: 'normal', width: 320, height: 380 },
    { name: 'compact', width: 260, height: 210 },
    { name: 'mini', width: 200, height: 110 }
  ];

  let currentCornerIdx = 0;
  let currentSizeIdx = 0;
  let activePipWindow = null;

  // DOM Elements
  const singleView = document.getElementById('float-single-view');
  const clockSingle = document.getElementById('float-clock-single');
  const clockMillis = document.getElementById('float-millis');
  const dialProgress = document.getElementById('float-dial-progress');
  const clockDual = document.getElementById('float-clock-dual');
  const dualSw = document.getElementById('float-dual-sw');
  const dualTimer = document.getElementById('float-dual-timer');
  const modeBadge = document.getElementById('float-mode-badge');
  const subLaps = document.getElementById('float-sub-laps');
  const subSplit = document.getElementById('float-sub-split');
  const subState = document.getElementById('float-sub-state');

  const playBtn = document.getElementById('btn-play');
  const playBtnText = document.getElementById('btn-play-text');
  const lapBtn = document.getElementById('btn-lap');
  const resetBtn = document.getElementById('btn-reset');
  const pipBtn = document.getElementById('btn-pip-always-ontop');
  const bannerPipBtn = document.getElementById('btn-banner-pip');
  const cornerBtn = document.getElementById('btn-corner-cycle');
  const cornerLabel = document.getElementById('corner-label');
  const sizeBtn = document.getElementById('btn-size-cycle');
  const sizeLabel = document.getElementById('size-label');
  const themeBtn = document.getElementById('btn-float-theme');
  const themeLabel = document.getElementById('float-theme-label');

  const cornerNames = {
    'top-right': '↗ TR',
    'bottom-right': '↘ BR',
    'bottom-left': '↙ BL',
    'top-left': '↖ TL'
  };

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 70; // 439.82
  if (dialProgress) dialProgress.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;

  // ================= DYNAMIC THEME ENGINE =================
  const THEMES = ['cosmic', 'cyan', 'violet', 'emerald'];
  const THEME_GRADIENTS = {
    cosmic: { stop1: '#00f2fe', stop2: '#8b5cf6', stop3: '#ec4899' },
    cyan: { stop1: '#22d3ee', stop2: '#00f2fe', stop3: '#38bdf8' },
    violet: { stop1: '#c084fc', stop2: '#8b5cf6', stop3: '#6366f1' },
    emerald: { stop1: '#34d399', stop2: '#10b981', stop3: '#059669' }
  };

  let currentTheme = 'cosmic';

  function updateDialThemeGradient(themeName) {
    const grad = THEME_GRADIENTS[themeName] || THEME_GRADIENTS.cosmic;
    const s1 = document.getElementById('grad-stop-1');
    const s2 = document.getElementById('grad-stop-2');
    const s3 = document.getElementById('grad-stop-3');
    if (s1) s1.setAttribute('stop-color', grad.stop1);
    if (s2) s2.setAttribute('stop-color', grad.stop2);
    if (s3) s3.setAttribute('stop-color', grad.stop3);
  }

  function applyTheme(themeName) {
    if (!THEMES.includes(themeName)) themeName = 'cosmic';
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);

    if (themeLabel) {
      themeLabel.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
    }

    updateDialThemeGradient(themeName);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ activeTheme: themeName });
      } else {
        localStorage.setItem('algotimer_theme', themeName);
      }
    } catch (e) {}
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
      applyTheme(THEMES[nextIdx]);
    });
  }

  // Safe sound player
  function playSound(name) {
    if (window.soundFX && typeof window.soundFX[name] === 'function') {
      try { window.soundFX[name](); } catch (e) {}
    }
  }

  // Detect Extension environment
  const isExtension = typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime) &&
    Boolean(chrome.runtime.id) &&
    typeof location !== 'undefined' &&
    location.protocol === 'chrome-extension:';

  function sendMsg(msg, cb) {
    if (isExtension) {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {
            handleFloatLocal(msg, cb);
            return;
          }
          if (res && res.state) {
            state = Object.assign(state, res.state);
          }
          if (cb) cb(res);
        });
        return;
      } catch (err) {
        handleFloatLocal(msg, cb);
        return;
      }
    }
    handleFloatLocal(msg, cb);
  }

  function handleFloatLocal(msg, cb) {
    if (msg.type === 'GET_STATE') {
      try {
        const saved = localStorage.getItem('algotimer_standalone_state');
        if (saved) state = Object.assign(state, JSON.parse(saved));
      } catch (e) {}
      if (cb) cb({ state });
      return;
    }
    if (msg.type === 'START') {
      if (state.mode === 'dual' || state.mode === 'stopwatch') {
        state.stopwatch.status = 'running';
        state.stopwatch.startTime = Date.now();
      }
      if (state.mode === 'dual' || state.mode === 'timer') {
        state.targetTimer.status = 'running';
        state.targetTimer.startTime = Date.now();
      }
    } else if (msg.type === 'PAUSE') {
      if (state.stopwatch.status === 'running') {
        state.stopwatch.status = 'paused';
        state.stopwatch.elapsedBeforePause += Date.now() - state.stopwatch.startTime;
      }
      if (state.targetTimer.status === 'running') {
        state.targetTimer.status = 'paused';
        state.targetTimer.elapsedBeforePause += Date.now() - state.targetTimer.startTime;
      }
    } else if (msg.type === 'RESET') {
      state.stopwatch.status = 'stopped';
      state.stopwatch.elapsedBeforePause = 0;
      state.stopwatch.startTime = null;
      state.targetTimer.status = 'stopped';
      state.targetTimer.elapsedBeforePause = 0;
      state.targetTimer.startTime = null;
    } else if (msg.type === 'ADD_LAP') {
      const swMs = getSwElapsed();
      if (!state.laps) state.laps = [];
      state.laps.unshift({
        num: state.laps.length + 1,
        totalTime: swMs,
        lapDuration: swMs
      });
    }
    try {
      localStorage.setItem('algotimer_standalone_state', JSON.stringify(state));
    } catch (e) {}
    if (cb) cb({ success: true, state });
  }

  // Format parts: base (MM:SS or HH:MM:SS) + tenths
  function formatTimeParts(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    const pad = (n) => (n < 10 ? '0' + n : n);
    const base = hrs > 0 ? (hrs + ':' + pad(mins) + ':' + pad(secs)) : (pad(mins) + ':' + pad(secs));
    return { base, tenths };
  }

  function getSwElapsed() {
    if (state.stopwatch && state.stopwatch.status === 'running') {
      return Date.now() - state.stopwatch.startTime + (state.stopwatch.elapsedBeforePause || 0);
    }
    return (state.stopwatch && state.stopwatch.elapsedBeforePause) || 0;
  }

  function getTargetRemaining() {
    let elapsed = (state.targetTimer && state.targetTimer.elapsedBeforePause) || 0;
    if (state.targetTimer && state.targetTimer.status === 'running') {
      elapsed += Date.now() - state.targetTimer.startTime;
    }
    const duration = (state.targetTimer && state.targetTimer.targetDurationMs) || 1800000;
    return Math.max(0, duration - elapsed);
  }

  function getTargetElapsed() {
    let elapsed = (state.targetTimer && state.targetTimer.elapsedBeforePause) || 0;
    if (state.targetTimer && state.targetTimer.status === 'running') {
      elapsed += Date.now() - state.targetTimer.startTime;
    }
    return elapsed;
  }

  // Animation Frame Loop
  function tick() {
    const swMs = getSwElapsed();
    const tgtMs = getTargetRemaining();
    const tgtElapsed = getTargetElapsed();

    if (state.mode === 'dual') {
      if (modeBadge) modeBadge.textContent = '⚡ DUAL MODE';
      if (singleView) singleView.style.display = 'none';
      if (clockDual) clockDual.style.display = 'flex';

      const swP = formatTimeParts(swMs);
      const tgtP = formatTimeParts(tgtMs);
      if (dualSw) dualSw.textContent = swP.base + '.' + swP.tenths;
      if (dualTimer) dualTimer.textContent = tgtP.base + '.' + tgtP.tenths;

      if (tgtMs <= 300000 && tgtMs > 0 && state.targetTimer.status === 'running') {
        if (dualTimer) dualTimer.classList.add('warning');
      } else {
        if (dualTimer) dualTimer.classList.remove('warning');
      }

      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (playBtnText) playBtnText.textContent = bothRunning ? 'Pause Both' : 'Start Both';
      if (playBtn) playBtn.classList.toggle('running', bothRunning);

    } else if (state.mode === 'timer') {
      if (modeBadge) modeBadge.textContent = 'TARGET TIMER';
      if (singleView) singleView.style.display = 'block';
      if (clockDual) clockDual.style.display = 'none';

      const parts = formatTimeParts(tgtMs);
      if (clockSingle) clockSingle.innerHTML = parts.base + '<small id="float-millis">.' + parts.tenths + '</small>';

      const targetDuration = (state.targetTimer && state.targetTimer.targetDurationMs) || 1800000;
      const progressRatio = Math.min(1, tgtElapsed / targetDuration);
      if (dialProgress) dialProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);

      if (tgtMs <= 300000 && tgtMs > 0 && state.targetTimer.status === 'running') {
        if (clockSingle) clockSingle.classList.add('warning');
      } else {
        if (clockSingle) clockSingle.classList.remove('warning');
      }

      const isRunning = state.targetTimer.status === 'running';
      if (playBtnText) playBtnText.textContent = isRunning ? 'Pause' : 'Start';
      if (playBtn) playBtn.classList.toggle('running', isRunning);

    } else {
      if (modeBadge) modeBadge.textContent = 'STOPWATCH';
      if (singleView) singleView.style.display = 'block';
      if (clockDual) clockDual.style.display = 'none';
      if (clockSingle) clockSingle.classList.remove('warning');

      const parts = formatTimeParts(swMs);
      if (clockSingle) clockSingle.innerHTML = parts.base + '<small id="float-millis">.' + parts.tenths + '</small>';

      // 60-second continuous rotating progress arc
      const secRatio = (swMs % 60000) / 60000;
      if (dialProgress) dialProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - secRatio);

      const isRunning = state.stopwatch.status === 'running';
      if (playBtnText) playBtnText.textContent = isRunning ? 'Pause' : 'Start';
      if (playBtn) playBtn.classList.toggle('running', isRunning);
    }

    // 3 Sub-Gauges (LAPS, SPLIT, STATUS)
    if (subLaps) subLaps.textContent = state.laps ? state.laps.length : 0;
    if (subSplit) {
      if (state.laps && state.laps.length > 0) {
        subSplit.textContent = formatTimeParts(state.laps[0].lapDuration).base;
      } else {
        subSplit.textContent = '00:00';
      }
    }
    if (subState) {
      const curStatus = state.mode === 'stopwatch'
        ? (state.stopwatch ? state.stopwatch.status : 'ready')
        : (state.mode === 'timer' ? (state.targetTimer ? state.targetTimer.status : 'ready') : 'dual');
      subState.textContent = (curStatus || 'READY').toUpperCase();
    }

    requestAnimationFrame(tick);
  }

  tick();

  // Control Buttons
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      playSound('tick');
      if (state.mode === 'dual') {
        const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
        sendMsg({ type: bothRunning ? 'PAUSE' : 'START', target: 'both' });
      } else if (state.mode === 'timer') {
        const running = state.targetTimer.status === 'running';
        sendMsg({ type: running ? 'PAUSE' : 'START', target: 'timer' });
      } else {
        const running = state.stopwatch.status === 'running';
        sendMsg({ type: running ? 'PAUSE' : 'START', target: 'stopwatch' });
      }
    });
  }

  if (lapBtn) {
    lapBtn.addEventListener('click', () => {
      playSound('lap');
      sendMsg({ type: 'ADD_LAP' });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      playSound('tick');
      const target = state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch');
      sendMsg({ type: 'RESET', target });
    });
  }

  // =========================================================================
  // ALWAYS ON TOP: Document Picture-in-Picture (Floats over VS Code, Discord, etc.)
  // =========================================================================
  async function launchAlwaysOnTopPiP() {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture is active in Google Chrome/Edge. Your current window can also be positioned on top!');
      return;
    }

    if (activePipWindow) {
      activePipWindow.close();
      activePipWindow = null;
      return;
    }

    try {
      const curSize = SIZES[currentSizeIdx];
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: curSize.width,
        height: curSize.height
      });

      activePipWindow = pipWindow;
      if (pipBtn) pipBtn.classList.add('active');
      const pipText = document.getElementById('btn-pip-text');
      if (pipText) pipText.textContent = 'Pinned';
      const tipBanner = document.getElementById('banner-pip-tip');
      if (tipBanner) tipBanner.style.display = 'none';

      // Clone styles
      [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(el => {
        pipWindow.document.head.appendChild(el.cloneNode(true));
      });

      pipWindow.document.title = 'AlgoTimer - Always-on-Top Floating Screen';
      const widget = document.getElementById('float-widget');
      pipWindow.document.body.appendChild(widget);

      pipWindow.addEventListener('pagehide', () => {
        document.body.appendChild(widget);
        activePipWindow = null;
        if (pipBtn) pipBtn.classList.remove('active');
        if (pipText) pipText.textContent = 'Always on Top';
        if (tipBanner) tipBanner.style.display = 'flex';
      });

    } catch (err) {
      console.warn('PiP launch error:', err);
    }
  }

  if (pipBtn) pipBtn.addEventListener('click', launchAlwaysOnTopPiP);
  if (bannerPipBtn) bannerPipBtn.addEventListener('click', launchAlwaysOnTopPiP);

  // =========================================================================
  // CORNER DOCK CYCLING: Snaps window to screen corners
  // =========================================================================
  if (cornerBtn) {
    cornerBtn.addEventListener('click', () => {
      currentCornerIdx = (currentCornerIdx + 1) % CORNERS.length;
      const corner = CORNERS[currentCornerIdx];
      if (cornerLabel) cornerLabel.textContent = cornerNames[corner];

      const curSize = SIZES[currentSizeIdx];
      const screenW = screen.availWidth;
      const screenH = screen.availHeight;

      let left = 20, top = 40;
      if (corner === 'top-right') {
        left = screenW - curSize.width - 25;
        top = 40;
      } else if (corner === 'bottom-right') {
        left = screenW - curSize.width - 25;
        top = screenH - curSize.height - 40;
      } else if (corner === 'bottom-left') {
        left = 25;
        top = screenH - curSize.height - 40;
      } else if (corner === 'top-left') {
        left = 25;
        top = 40;
      }

      if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
        chrome.windows.getCurrent((win) => {
          if (win) {
            chrome.windows.update(win.id, {
              left: Math.round(left),
              top: Math.round(top),
              width: curSize.width,
              height: curSize.height
            });
          }
        });
      } else {
        window.moveTo(Math.round(left), Math.round(top));
      }
    });
  }

  // =========================================================================
  // SIZE TOGGLE: Normal -> Compact -> Mini
  // =========================================================================
  if (sizeBtn) {
    sizeBtn.addEventListener('click', () => {
      currentSizeIdx = (currentSizeIdx + 1) % SIZES.length;
      const curSize = SIZES[currentSizeIdx];
      document.body.setAttribute('data-size', curSize.name);

      if (sizeLabel) {
        sizeLabel.textContent = curSize.name.charAt(0).toUpperCase() + curSize.name.slice(1);
      }

      if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
        chrome.windows.getCurrent((win) => {
          if (win) {
            chrome.windows.update(win.id, {
              width: curSize.width,
              height: curSize.height
            });
          }
        });
      } else {
        window.resizeTo(curSize.width, curSize.height);
      }
    });
  }

  // Keyboard Shortcuts in Floating Window
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (playBtn) playBtn.click();
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (lapBtn) lapBtn.click();
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (resetBtn) resetBtn.click();
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const nextMode = state.mode === 'stopwatch' ? 'timer' : (state.mode === 'timer' ? 'dual' : 'stopwatch');
      sendMsg({ type: 'SET_MODE', mode: nextMode });
    }
  });

  // Sync state initially
  sendMsg({ type: 'GET_STATE' }, (res) => {
    if (res && res.state) state = Object.assign(state, res.state);
  });

  // Load and apply theme
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['activeTheme'], (res) => {
        if (res && res.activeTheme) applyTheme(res.activeTheme);
        else applyTheme('cosmic');
      });
      // Listen for storage changes from popup
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.activeTheme) {
          applyTheme(changes.activeTheme.newValue);
        }
      });
    } else {
      const saved = localStorage.getItem('algotimer_theme');
      applyTheme(saved || 'cosmic');
    }
  } catch (e) {
    applyTheme('cosmic');
  }

  // Listen for broadcast messages from background / popup
  if (isExtension && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'TICK' && msg.state) {
        state = Object.assign(state, msg.state);
      } else if (msg.type === 'THEME_CHANGED' && msg.theme) {
        applyTheme(msg.theme);
      }
    });
  }
})();
