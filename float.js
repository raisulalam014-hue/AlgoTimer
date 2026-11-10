// AlgoTimer - Persistent Floating Timer Window
// Cyber-Luxury HUD: Dynamic Color Themes, SVG Precision Ring, 3 Sub-Gauges, 4-Corner Snapping, Multi-Size

(function () {
  let state = {
    mode: 'stopwatch',
    allowDualActive: true,
    stopwatch: { status: 'stopped', startTime: null, elapsedBeforePause: 0 },
    targetTimer: { status: 'stopped', startTime: null, elapsedBeforePause: 0, targetDurationMs: 30 * 60 * 1000 },
    laps: []
  };

  const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const SIZES = {
    expanded: { width: 380, height: 470 },
    mini: { width: 260, height: 140 }
  };
  const FLOAT_PREFS_KEY = 'algoTimerFloatWindowPrefs';
  const DEFAULT_PREFS = {
    corner: 'top-right', pinned: true, left: null, top: null,
    width: SIZES.expanded.width, height: SIZES.expanded.height, viewMode: 'expanded'
  };
  let floatPrefs = Object.assign({}, DEFAULT_PREFS);
  let currentWindowId = null;
  let activePipWindow = null;
  let closingWindow = false;
  let programmaticMove = false;

  function getScreenBounds() {
    const display = window.screen;
    return {
      left: Number.isFinite(display.availLeft) ? display.availLeft : 0,
      top: Number.isFinite(display.availTop) ? display.availTop : 0,
      width: display.availWidth || display.width,
      height: display.availHeight || display.height
    };
  }

  function clampBounds(left, top, width, height) {
    const screenBounds = getScreenBounds();
    const maxLeft = screenBounds.left + Math.max(0, screenBounds.width - width);
    const maxTop = screenBounds.top + Math.max(0, screenBounds.height - height);
    return {
      left: Math.min(maxLeft, Math.max(screenBounds.left, Math.round(left))),
      top: Math.min(maxTop, Math.max(screenBounds.top, Math.round(top))),
      width,
      height
    };
  }

  function boundsForCorner(corner, width, height) {
    const screenBounds = getScreenBounds();
    const margin = 16;
    const left = corner.endsWith('right') ? screenBounds.left + screenBounds.width - width - margin : screenBounds.left + margin;
    const top = corner.startsWith('bottom') ? screenBounds.top + screenBounds.height - height - margin : screenBounds.top + margin;
    return clampBounds(left, top, width, height);
  }

  function updateNativeBounds(bounds) {
    const safeBounds = clampBounds(bounds.left, bounds.top, bounds.width, bounds.height);
    programmaticMove = true;
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
      chrome.windows.getCurrent((win) => {
        if (win && Number.isInteger(win.id)) {
          currentWindowId = win.id;
          chrome.windows.update(win.id, safeBounds, () => {
            if (chrome.runtime.lastError) console.warn('Could not reposition floating timer:', chrome.runtime.lastError.message);
            window.setTimeout(() => { programmaticMove = false; }, 120);
          });
        } else {
          programmaticMove = false;
        }
      });
    } else {
      try {
        window.resizeTo(safeBounds.width, safeBounds.height);
        window.moveTo(safeBounds.left, safeBounds.top);
      } catch (error) {
        console.warn('Window positioning is not available in this browser:', error);
      }
      window.setTimeout(() => { programmaticMove = false; }, 120);
    }
    floatPrefs = Object.assign({}, floatPrefs, safeBounds);
    persistFloatPrefs();
  }

  function persistFloatPrefs() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [FLOAT_PREFS_KEY]: floatPrefs }, () => {
        if (chrome.runtime.lastError) console.warn('Could not save floating timer preferences:', chrome.runtime.lastError.message);
      });
    } else {
      try { localStorage.setItem(FLOAT_PREFS_KEY, JSON.stringify(floatPrefs)); }
      catch (error) { console.warn('Could not save floating timer preferences:', error); }
    }
  }

  function applyViewMode(mode, resizeWindow = true, save = true) {
    floatPrefs.viewMode = mode === 'mini' ? 'mini' : 'expanded';
    document.body.dataset.viewMode = floatPrefs.viewMode;
    document.body.dataset.size = floatPrefs.viewMode === 'mini' ? 'mini' : 'normal';
    const size = SIZES[floatPrefs.viewMode];
    const currentBounds = clampBounds(
      Number.isFinite(floatPrefs.left) ? floatPrefs.left : getScreenBounds().left + 16,
      Number.isFinite(floatPrefs.top) ? floatPrefs.top : getScreenBounds().top + 16,
      size.width,
      size.height
    );
    floatPrefs.width = size.width;
    floatPrefs.height = size.height;
    if (floatPrefs.pinned) {
      Object.assign(currentBounds, boundsForCorner(floatPrefs.corner, size.width, size.height));
    }
    if (save) persistFloatPrefs();
    if (resizeWindow && !activePipWindow) updateNativeBounds(currentBounds);
    if (activePipWindow) {
      activePipWindow.document.body.dataset.viewMode = floatPrefs.viewMode;
      activePipWindow.document.body.dataset.size = floatPrefs.viewMode === 'mini' ? 'mini' : 'normal';
      try { activePipWindow.resizeTo(size.width, size.height); }
      catch (error) { console.warn('Could not resize Picture-in-Picture window:', error); }
    }
  }

  function applyCornerPosition() {
    const size = SIZES[floatPrefs.viewMode];
    updateNativeBounds(boundsForCorner(floatPrefs.corner, size.width, size.height));
  }

  function loadFloatPreferences(callback) {
    const applySaved = (saved) => {
      if (saved && typeof saved === 'object') floatPrefs = Object.assign({}, DEFAULT_PREFS, saved);
      if (!CORNERS.includes(floatPrefs.corner)) floatPrefs.corner = DEFAULT_PREFS.corner;
      if (!['mini', 'expanded'].includes(floatPrefs.viewMode)) floatPrefs.viewMode = 'expanded';
      if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
        chrome.windows.getCurrent((win) => {
          if (win) {
            currentWindowId = win.id;
            if (!Number.isFinite(floatPrefs.left)) floatPrefs.left = win.left;
            if (!Number.isFinite(floatPrefs.top)) floatPrefs.top = win.top;
          }
          applyViewMode(floatPrefs.viewMode, false);
          const cornerSelect = document.getElementById('float-corner-select');
          const pinButton = document.getElementById('btn-pin-corner');
          if (cornerSelect) cornerSelect.value = floatPrefs.corner;
          if (pinButton) {
            pinButton.textContent = floatPrefs.pinned ? 'Pinned' : 'Unpinned';
            pinButton.setAttribute('aria-pressed', String(floatPrefs.pinned));
          }
          if (!Number.isFinite(floatPrefs.left) || !Number.isFinite(floatPrefs.top) || floatPrefs.pinned) {
            applyCornerPosition();
          } else {
            updateNativeBounds(clampBounds(floatPrefs.left, floatPrefs.top, floatPrefs.width, floatPrefs.height));
          }
          if (callback) callback();
        });
      } else {
        try {
          const stored = JSON.parse(localStorage.getItem(FLOAT_PREFS_KEY) || 'null');
          if (stored) floatPrefs = Object.assign({}, DEFAULT_PREFS, stored);
        } catch (error) { console.warn('Could not load floating timer preferences:', error); }
        applyViewMode(floatPrefs.viewMode, false);
        if (callback) callback();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([FLOAT_PREFS_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Could not load floating timer preferences:', chrome.runtime.lastError.message);
          applySaved(null);
          return;
        }
        applySaved(result[FLOAT_PREFS_KEY]);
      });
    } else {
      applySaved(null);
    }
  }

  window.addEventListener('resize', () => {
    if (floatPrefs.pinned && !programmaticMove) applyCornerPosition();
    else if (!programmaticMove) {
      floatPrefs.width = window.outerWidth;
      floatPrefs.height = window.outerHeight;
      persistFloatPrefs();
    }
  });

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
  const sizeBtn = document.getElementById('btn-size-cycle');
  const sizeLabel = document.getElementById('size-label');
  const cornerSelect = document.getElementById('float-corner-select');
  const pinCornerBtn = document.getElementById('btn-pin-corner');
  const miniView = document.getElementById('float-mini-view');
  const miniClock = document.getElementById('float-mini-clock');
  const miniStatus = document.getElementById('float-mini-status');
  const miniDot = document.getElementById('float-mini-dot');
  const closeFloatBtn = document.getElementById('btn-close-float');
  const positionNote = document.getElementById('float-position-note');
  const dragHandle = document.querySelector('.float-header');
  const themeBtn = document.getElementById('btn-float-theme');
  const themeLabel = document.getElementById('float-theme-label');


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
        subSplit.textContent = formatTimeParts(state.laps[0].splitMs || state.laps[0].lapDuration || 0).base;
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

    if (miniClock) {
      const miniMs = state.mode === 'timer' ? tgtMs : swMs;
      const miniTime = formatTimeParts(miniMs);
      miniClock.textContent = miniTime.base;
      const activeTimer = state.mode === 'timer' ? state.targetTimer : state.stopwatch;
      const running = state.mode === 'dual'
        ? state.stopwatch.status === 'running' || state.targetTimer.status === 'running'
        : activeTimer.status === 'running';
      const paused = state.mode === 'dual'
        ? state.stopwatch.status === 'paused' || state.targetTimer.status === 'paused'
        : activeTimer.status === 'paused';
      const finished = state.mode === 'timer' && state.targetTimer.status === 'finished';
      const statusText = running ? 'RUNNING' : (paused ? 'PAUSED' : (finished ? 'FINISHED' : 'READY'));
      if (miniStatus) miniStatus.textContent = statusText;
      if (miniDot) {
        miniDot.style.background = running ? 'var(--accent-cyan)' : (statusText === 'FINISHED' ? '#f43f5e' : '#64748b');
        miniDot.style.boxShadow = running ? '0 0 8px var(--accent-cyan)' : 'none';
      }
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
  // Browser-managed Picture-in-Picture (always-on-top where supported)
  // =========================================================================
  async function launchAlwaysOnTopPiP() {
    if (!('documentPictureInPicture' in window)) {
      const message = 'Picture-in-picture is not supported in this browser. The floating window will stay open, but other windows can cover it.';
      if (positionNote) positionNote.textContent = message;
      console.warn(message);
      return;
    }

    if (activePipWindow) {
      activePipWindow.close();
      activePipWindow = null;
      return;
    }

    try {
      const curSize = SIZES[floatPrefs.viewMode];
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: curSize.width,
        height: curSize.height
      });

      activePipWindow = pipWindow;
      if (pipBtn) pipBtn.classList.add('active');
      const pipText = document.getElementById('btn-pip-text');
      if (pipText) pipText.textContent = 'Active';
      if (cornerSelect) cornerSelect.disabled = true;
      if (pinCornerBtn) pinCornerBtn.disabled = true;
      const tipBanner = document.getElementById('banner-pip-tip');
      if (tipBanner) tipBanner.style.display = 'none';
      if (positionNote) positionNote.textContent = 'Picture-in-picture is above other windows; the browser controls its position.';

      // Clone styles
      [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(el => {
        pipWindow.document.head.appendChild(el.cloneNode(true));
      });

      pipWindow.document.title = 'AlgoTimer - Picture-in-Picture';
      pipWindow.document.body.dataset.viewMode = floatPrefs.viewMode;
      pipWindow.document.body.dataset.size = floatPrefs.viewMode === 'mini' ? 'mini' : 'normal';
      const widget = document.getElementById('float-widget');
      pipWindow.document.body.appendChild(widget);

      pipWindow.addEventListener('pagehide', () => {
        document.body.appendChild(widget);
        activePipWindow = null;
        document.body.dataset.viewMode = floatPrefs.viewMode;
        document.body.dataset.size = floatPrefs.viewMode === 'mini' ? 'mini' : 'normal';
        if (!closingWindow) {
          const size = SIZES[floatPrefs.viewMode];
          const bounds = floatPrefs.pinned
            ? boundsForCorner(floatPrefs.corner, size.width, size.height)
            : clampBounds(floatPrefs.left, floatPrefs.top, size.width, size.height);
          updateNativeBounds(bounds);
        }
        if (cornerSelect) cornerSelect.disabled = false;
        if (pinCornerBtn) pinCornerBtn.disabled = false;
        if (pipBtn) pipBtn.classList.remove('active');
        if (pipText) pipText.textContent = 'Topmost';
        if (tipBanner) tipBanner.style.display = 'flex';
        if (positionNote) positionNote.textContent = 'Corner pinning does not keep the window above other apps.';
      });

    } catch (err) {
      if (positionNote) positionNote.textContent = 'Picture-in-picture could not be opened; the timer window remains available.';
      console.warn('PiP launch error:', err);
    }
  }

  if (pipBtn) pipBtn.addEventListener('click', launchAlwaysOnTopPiP);
  if (bannerPipBtn) bannerPipBtn.addEventListener('click', launchAlwaysOnTopPiP);

  if (cornerSelect) {
    cornerSelect.addEventListener('change', () => {
      if (!CORNERS.includes(cornerSelect.value)) return;
      floatPrefs.corner = cornerSelect.value;
      persistFloatPrefs();
      if (floatPrefs.pinned) applyCornerPosition();
    });
  }

  if (pinCornerBtn) {
    pinCornerBtn.addEventListener('click', () => {
      floatPrefs.pinned = !floatPrefs.pinned;
      pinCornerBtn.textContent = floatPrefs.pinned ? 'Pinned' : 'Unpinned';
      pinCornerBtn.setAttribute('aria-pressed', String(floatPrefs.pinned));
      persistFloatPrefs();
      if (floatPrefs.pinned) applyCornerPosition();
    });
  }

  function toggleViewMode() {
    const nextMode = floatPrefs.viewMode === 'mini' ? 'expanded' : 'mini';
    applyViewMode(nextMode);
    if (sizeLabel) sizeLabel.textContent = nextMode === 'mini' ? 'Expand' : 'Mini';
    if (sizeBtn) sizeBtn.title = nextMode === 'mini' ? 'Expand floating timer' : 'Minimize to mini timer';
  }

  if (sizeBtn) sizeBtn.addEventListener('click', toggleViewMode);
  if (miniView) {
    miniView.addEventListener('click', toggleViewMode);
    miniView.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleViewMode();
      }
    });
  }

  if (closeFloatBtn) {
    closeFloatBtn.addEventListener('click', () => {
      closingWindow = true;
      if (activePipWindow) activePipWindow.close();
      if (typeof chrome !== 'undefined' && chrome.windows && Number.isInteger(currentWindowId)) {
        chrome.windows.remove(currentWindowId, () => {
          if (chrome.runtime.lastError) console.warn('Could not close floating timer:', chrome.runtime.lastError.message);
        });
      } else {
        window.close();
      }
    });
  }

  if (dragHandle) {
    let dragStart = null;
    let pendingFrame = false;
    let latestBounds = null;

    dragHandle.addEventListener('pointerdown', (event) => {
      if (floatPrefs.pinned || activePipWindow || event.button !== 0 || event.target.closest('button, select')) return;
      if (typeof chrome === 'undefined' || !chrome.windows || !chrome.windows.getCurrent) return;
      chrome.windows.getCurrent((win) => {
        if (!win) return;
        dragStart = { x: event.screenX, y: event.screenY, left: win.left, top: win.top, width: win.width, height: win.height };
        dragHandle.setPointerCapture(event.pointerId);
      });
    });

    dragHandle.addEventListener('pointermove', (event) => {
      if (!dragStart) return;
      latestBounds = clampBounds(
        dragStart.left + event.screenX - dragStart.x,
        dragStart.top + event.screenY - dragStart.y,
        dragStart.width,
        dragStart.height
      );
      if (!pendingFrame) {
        pendingFrame = true;
        requestAnimationFrame(() => {
          pendingFrame = false;
          programmaticMove = true;
          chrome.windows.update(currentWindowId, latestBounds, () => {
            if (chrome.runtime.lastError) console.warn('Could not move floating timer:', chrome.runtime.lastError.message);
            window.setTimeout(() => { programmaticMove = false; }, 120);
          });
        });
      }
    });

    const finishDrag = () => {
      if (!dragStart) return;
      dragStart = null;
      chrome.windows.getCurrent((win) => {
        if (!win) return;
        const cornerBounds = CORNERS.map((corner) => ({ corner, bounds: boundsForCorner(corner, win.width, win.height) }));
        cornerBounds.sort((a, b) => {
          const distance = (item) => Math.hypot(win.left - item.bounds.left, win.top - item.bounds.top);
          return distance(a) - distance(b);
        });
        const nearest = cornerBounds[0];
        const screenBounds = getScreenBounds();
        const nearEdge = Math.min(
          Math.abs(win.left - screenBounds.left),
          Math.abs(win.left + win.width - screenBounds.left - screenBounds.width),
          Math.abs(win.top - screenBounds.top),
          Math.abs(win.top + win.height - screenBounds.top - screenBounds.height)
        ) <= 84;
        if (nearEdge) {
          floatPrefs.corner = nearest.corner;
          if (cornerSelect) cornerSelect.value = nearest.corner;
          updateNativeBounds(nearest.bounds);
        } else {
          floatPrefs.left = win.left;
          floatPrefs.top = win.top;
          floatPrefs.width = win.width;
          floatPrefs.height = win.height;
          persistFloatPrefs();
        }
      });
    };
    dragHandle.addEventListener('pointerup', finishDrag);
    dragHandle.addEventListener('pointercancel', finishDrag);
  }

  if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.onBoundsChanged) {
    chrome.windows.onBoundsChanged.addListener((win) => {
      if (win.id !== currentWindowId || programmaticMove) return;
      if (floatPrefs.pinned) {
        const desired = boundsForCorner(floatPrefs.corner, win.width, win.height);
        if (win.left !== desired.left || win.top !== desired.top) updateNativeBounds(desired);
      } else {
        floatPrefs.left = win.left;
        floatPrefs.top = win.top;
        floatPrefs.width = win.width;
        floatPrefs.height = win.height;
        persistFloatPrefs();
      }
    });
  }

  // Keyboard Shortcuts in Floating Window
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target.isContentEditable || document.activeElement?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || e.ctrlKey || e.altKey || e.metaKey) return;
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

  // Load saved window mode and state without creating another timer engine.
  loadFloatPreferences(() => {
    if (sizeLabel) sizeLabel.textContent = floatPrefs.viewMode === 'mini' ? 'Expand' : 'Mini';
    sendMsg({ type: 'GET_STATE' }, (res) => {
      if (res && res.state) state = Object.assign(state, res.state);
    });
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
      if ((msg.type === 'TICK' || msg.type === 'STATE_UPDATED') && msg.state) {
        state = Object.assign(state, msg.state);
      } else if (msg.type === 'THEME_CHANGED' && msg.theme) {
        applyTheme(msg.theme);
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.algoTimerState && changes.algoTimerState.newValue) {
        state = Object.assign(state, changes.algoTimerState.newValue);
      }
      if (changes[FLOAT_PREFS_KEY] && changes[FLOAT_PREFS_KEY].newValue) {
        floatPrefs = Object.assign({}, DEFAULT_PREFS, changes[FLOAT_PREFS_KEY].newValue);
        applyViewMode(floatPrefs.viewMode, false, false);
        if (cornerSelect) cornerSelect.value = floatPrefs.corner;
        if (pinCornerBtn) {
          pinCornerBtn.textContent = floatPrefs.pinned ? 'Pinned' : 'Unpinned';
          pinCornerBtn.setAttribute('aria-pressed', String(floatPrefs.pinned));
        }
      }
    });
  }
})();
