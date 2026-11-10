// AlgoTimer - Two Floating Widget Modes (Mini Timer Pill & Normal Floating HUD)
// Shared State Engine | 100% Client-Side | Zero Drift | Accurate Synchronization

(function () {
  let state = {
    mode: 'stopwatch',
    allowDualActive: true,
    stopwatch: { status: 'stopped', startTime: null, elapsedBeforePause: 0 },
    targetTimer: { status: 'stopped', startTime: null, elapsedBeforePause: 0, targetDurationMs: 30 * 60 * 1000 },
    laps: []
  };

  const CORNERS = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
  let currentCornerIdx = 0;
  let currentVisualMode = 'normal'; // 'normal' | 'mini'
  let activePipWindow = null;

  // Normal & Mini Target Dimensions
  const DIMENSIONS = {
    mini: { width: 220, height: 68 },
    normal: { width: 300, height: 235 },
    expanded: { width: 360, height: 380 }
  };

  // DOM Elements - Mode A: Mini Pill
  const miniPillView = document.getElementById('mini-pill-view');
  const miniStatusDot = document.getElementById('mini-status-dot');
  const miniDigits = document.getElementById('mini-timer-digits');

  // DOM Elements - Mode B: Normal / Expanded Widget
  const normalWidgetView = document.getElementById('normal-widget-view');
  const normalStatusDot = document.getElementById('normal-status-dot');
  const clockSingle = document.getElementById('float-clock-single');
  const clockDual = document.getElementById('float-clock-dual');
  const dualSw = document.getElementById('float-dual-sw');
  const dualTimer = document.getElementById('float-dual-timer');
  const modeBadge = document.getElementById('float-mode-badge');
  const subLaps = document.getElementById('float-sub-laps');
  const subSplit = document.getElementById('float-sub-split');
  const subState = document.getElementById('float-sub-state');
  const expandedLaps = document.getElementById('float-expanded-laps');
  const expandedLapsList = document.getElementById('expanded-laps-list');
  const expandedLapCount = document.getElementById('expanded-lap-count');

  // Header and Control Buttons
  const btnMinimizeToMini = document.getElementById('btn-minimize-to-mini');
  const pipBtn = document.getElementById('btn-pip-always-ontop');
  const cornerBtn = document.getElementById('btn-corner-cycle');
  const cornerLabel = document.getElementById('corner-label');
  const playBtn = document.getElementById('btn-play');
  const playBtnText = document.getElementById('btn-play-text');
  const lapBtn = document.getElementById('btn-lap');
  const resetBtn = document.getElementById('btn-reset');

  const cornerNames = {
    'top-right': 'TR',
    'bottom-right': 'BR',
    'bottom-left': 'BL',
    'top-left': 'TL'
  };

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
      const prevTotal = state.laps.length > 0 ? state.laps[0].totalTime : 0;
      const lapDuration = Math.max(0, swMs - prevTotal);
      state.laps.unshift({
        num: state.laps.length + 1,
        totalTime: swMs,
        lapDuration: lapDuration || swMs
      });
      renderExpandedLaps();
    }
    try {
      localStorage.setItem('algotimer_standalone_state', JSON.stringify(state));
    } catch (e) {}
    if (cb) cb({ success: true, state });
  }

  // Format parts: base (HH:MM:SS or MM:SS) + hundredths (2 digits, e.g. .52)
  function formatTimeParts(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    
    // Always format with hours:mins:secs for professional competitive coding layout
    const base = pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
    const millis2 = pad(hundredths);
    return { base, millis2 };
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

  // =========================================================================
  // ANIMATION FRAME RENDER LOOP (SINGLE SOURCE OF TRUTH)
  // =========================================================================
  function tick() {
    const swMs = getSwElapsed();
    const tgtMs = getTargetRemaining();

    const swParts = formatTimeParts(swMs);
    const tgtParts = formatTimeParts(tgtMs);

    const activeStatus = state.mode === 'stopwatch'
      ? (state.stopwatch ? state.stopwatch.status : 'stopped')
      : (state.mode === 'timer' ? (state.targetTimer ? state.targetTimer.status : 'stopped') : 'running');

    // 1. UPDATE MODE A: MINI PILL VIEW
    if (miniDigits) {
      const activeDisplay = state.mode === 'timer' ? tgtParts : swParts;
      miniDigits.innerHTML = activeDisplay.base + '<small id="mini-timer-millis">.' + activeDisplay.millis2 + '</small>';
    }

    if (miniStatusDot) {
      miniStatusDot.className = 'mini-status-dot ' + activeStatus;
    }
    const miniInner = document.getElementById('mini-pill-inner');
    if (miniInner) {
      miniInner.className = 'mini-pill-inner is-' + activeStatus;
    }
    const timerHero = document.getElementById('float-timer-hero');
    if (timerHero) {
      timerHero.className = 'float-timer-hero is-' + activeStatus;
    }

    // 2. UPDATE MODE B: NORMAL WIDGET VIEW
    if (state.mode === 'dual') {
      if (modeBadge) modeBadge.textContent = '⚡ DUAL MODE';
      if (clockSingle) clockSingle.style.display = 'none';
      if (clockDual) clockDual.style.display = 'flex';

      if (dualSw) dualSw.textContent = swParts.base + '.' + swParts.millis2;
      if (dualTimer) dualTimer.textContent = tgtParts.base + '.' + tgtParts.millis2;

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
      if (clockSingle) {
        clockSingle.style.display = 'block';
        clockSingle.innerHTML = tgtParts.base + '<small id="float-millis">.' + tgtParts.millis2 + '</small>';
        clockSingle.classList.toggle('warning', tgtMs <= 300000 && tgtMs > 0 && state.targetTimer.status === 'running');
      }
      if (clockDual) clockDual.style.display = 'none';

      const isRunning = state.targetTimer.status === 'running';
      if (playBtnText) playBtnText.textContent = isRunning ? 'Pause' : 'Play';
      if (playBtn) playBtn.classList.toggle('running', isRunning);

    } else {
      if (modeBadge) modeBadge.textContent = 'STOPWATCH';
      if (clockSingle) {
        clockSingle.style.display = 'block';
        clockSingle.classList.remove('warning');
        clockSingle.innerHTML = swParts.base + '<small id="float-millis">.' + swParts.millis2 + '</small>';
      }
      if (clockDual) clockDual.style.display = 'none';

      const isRunning = state.stopwatch.status === 'running';
      if (playBtnText) playBtnText.textContent = isRunning ? 'Pause' : 'Play';
      if (playBtn) playBtn.classList.toggle('running', isRunning);
    }

    if (normalStatusDot) {
      normalStatusDot.className = 'status-pulse-dot ' + activeStatus;
    }

    // Sub-Gauges (Normal Mode)
    if (subLaps) subLaps.textContent = state.laps ? state.laps.length : 0;
    if (subSplit) {
      if (state.laps && state.laps.length > 0) {
        subSplit.textContent = formatTimeParts(state.laps[0].lapDuration).base;
      } else {
        subSplit.textContent = '00:00:00';
      }
    }
    if (subState) {
      subState.textContent = (activeStatus || 'READY').toUpperCase();
    }

    requestAnimationFrame(tick);
  }

  tick();

  // Render Expanded Laps
  function renderExpandedLaps() {
    if (!expandedLapsList) return;
    if (expandedLapCount) expandedLapCount.textContent = state.laps ? state.laps.length : 0;

    if (!state.laps || state.laps.length === 0) {
      expandedLapsList.innerHTML = '<div class="expanded-lap-empty">No laps recorded yet. Press L to record split.</div>';
      return;
    }

    expandedLapsList.innerHTML = state.laps.slice(0, 5).map(lap => {
      const splitP = formatTimeParts(lap.lapDuration);
      const totalP = formatTimeParts(lap.totalTime);
      return '<div class="expanded-lap-row">' +
        '<span class="expanded-lap-num">#' + String(lap.num).padStart(2, '0') + '</span>' +
        '<span class="expanded-lap-split">+' + splitP.base + '.' + splitP.millis2 + '</span>' +
        '<span class="expanded-lap-total">' + totalP.base + '</span>' +
      '</div>';
    }).join('');
  }

  // =========================================================================
  // TWO FLOATING MODES: TRANSITIONS & WINDOW POSITION PRESERVATION
  // =========================================================================
  function transitionToMode(mode) {
    if (mode !== 'mini' && mode !== 'normal') mode = 'normal';
    currentVisualMode = mode;
    document.body.className = 'mode-' + mode;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ algotimer_float_mode: mode });
      } else {
        localStorage.setItem('algotimer_float_mode', mode);
      }
    } catch (e) {}

    const targetDims = DIMENSIONS[mode];

    // Preserve window position across mode transitions
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
      chrome.windows.getCurrent((win) => {
        if (!win) return;
        const corner = CORNERS[currentCornerIdx];
        const screenW = screen.availWidth;
        const screenH = screen.availHeight;

        let newLeft = win.left;
        let newTop = win.top;

        // Keep anchored to the dock corner
        if (corner === 'top-right') {
          newLeft = (win.left + win.width) - targetDims.width;
          newTop = win.top;
        } else if (corner === 'bottom-right') {
          newLeft = (win.left + win.width) - targetDims.width;
          newTop = (win.top + win.height) - targetDims.height;
        } else if (corner === 'bottom-left') {
          newLeft = win.left;
          newTop = (win.top + win.height) - targetDims.height;
        } else {
          newLeft = win.left;
          newTop = win.top;
        }

        newLeft = Math.max(10, Math.min(screenW - targetDims.width - 10, newLeft));
        newTop = Math.max(10, Math.min(screenH - targetDims.height - 10, newTop));

        chrome.windows.update(win.id, {
          width: targetDims.width,
          height: targetDims.height,
          left: Math.round(newLeft),
          top: Math.round(newTop)
        });
      });
    } else {
      try {
        window.resizeTo(targetDims.width, targetDims.height);
      } catch (e) {}
    }

    if (activePipWindow) {
      try {
        activePipWindow.resizeTo(targetDims.width, targetDims.height);
      } catch (e) {}
    }
  }

  // Click on Mini Pill -> Expand to Normal Floating Mode
  if (miniPillView) {
    miniPillView.addEventListener('click', () => {
      transitionToMode('normal');
    });
  }

  // Click on Minimize Button -> Transition to Mini Timer Mode
  if (btnMinimizeToMini) {
    btnMinimizeToMini.addEventListener('click', (e) => {
      e.stopPropagation();
      transitionToMode('mini');
    });
  }

  // Smart Responsive Sizing via ResizeObserver
  function checkResponsiveLayout() {
    const h = window.innerHeight;
    const w = window.innerWidth;

    if (currentVisualMode === 'normal') {
      if (h >= 320 && w >= 320) {
        document.body.classList.add('is-expanded');
        renderExpandedLaps();
      } else {
        document.body.classList.remove('is-expanded');
      }
    }
  }

  window.addEventListener('resize', checkResponsiveLayout);

  // =========================================================================
  // CONTROL BUTTONS (START, LAP, RESET)
  // =========================================================================
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
  // ALWAYS ON TOP: Document Picture-in-Picture
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
      const curDims = DIMENSIONS[currentVisualMode] || DIMENSIONS.normal;
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: curDims.width,
        height: curDims.height
      });

      activePipWindow = pipWindow;
      if (pipBtn) pipBtn.classList.add('active');
      const pipText = document.getElementById('btn-pip-text');
      if (pipText) pipText.textContent = 'Pinned';

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
        if (pipText) pipText.textContent = 'Pin';
      });

    } catch (err) {
      console.warn('PiP launch error:', err);
    }
  }

  if (pipBtn) pipBtn.addEventListener('click', launchAlwaysOnTopPiP);

  // =========================================================================
  // CORNER DOCK CYCLING: Snaps window to screen corners
  // =========================================================================
  if (cornerBtn) {
    cornerBtn.addEventListener('click', () => {
      currentCornerIdx = (currentCornerIdx + 1) % CORNERS.length;
      const corner = CORNERS[currentCornerIdx];
      if (cornerLabel) cornerLabel.textContent = cornerNames[corner];

      const curDims = DIMENSIONS[currentVisualMode] || DIMENSIONS.normal;
      const screenW = screen.availWidth;
      const screenH = screen.availHeight;

      let left = 20, top = 40;
      if (corner === 'top-right') {
        left = screenW - curDims.width - 25;
        top = 40;
      } else if (corner === 'bottom-right') {
        left = screenW - curDims.width - 25;
        top = screenH - curDims.height - 40;
      } else if (corner === 'bottom-left') {
        left = 25;
        top = screenH - curDims.height - 40;
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
              width: curDims.width,
              height: curDims.height
            });
          }
        });
      } else {
        window.moveTo(Math.round(left), Math.round(top));
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
    if (res && res.state) {
      state = Object.assign(state, res.state);
      renderExpandedLaps();
    }
  });

  // Load and apply saved mode
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['algotimer_float_mode'], (res) => {
        if (res && res.algotimer_float_mode) {
          transitionToMode(res.algotimer_float_mode);
        } else {
          transitionToMode('normal');
        }
      });
    } else {
      const savedMode = localStorage.getItem('algotimer_float_mode');
      transitionToMode(savedMode || 'normal');
    }
  } catch (e) {
    transitionToMode('normal');
  }

  // Listen for broadcast messages from background / popup
  if (isExtension && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'TICK' && msg.state) {
        state = Object.assign(state, msg.state);
        renderExpandedLaps();
      }
    });
  }
})();
