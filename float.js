// AlgoTimer - Standalone Floating Timer for Other Apps (VS Code, Desktop, etc.)
// Supports: Document Picture-in-Picture Always-on-Top, 4-Corner OS Window Snapping, Multi-size Resizing

(function () {
  let state = {
    mode: 'stopwatch',
    allowDualActive: true,
    stopwatch: { status: 'stopped', startTime: null, elapsedBeforePause: 0 },
    targetTimer: { status: 'stopped', startTime: null, elapsedBeforePause: 0, targetDurationMs: 30 * 60 * 1000 }
  };

  const CORNERS = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
  const SIZES = [
    { name: 'normal', width: 280, height: 180 },
    { name: 'compact', width: 220, height: 135 },
    { name: 'mini', width: 175, height: 95 }
  ];

  let currentCornerIdx = 0;
  let currentSizeIdx = 0;
  let activePipWindow = null;

  const clockSingle = document.getElementById('float-clock-single');
  const clockDual = document.getElementById('float-clock-dual');
  const dualSw = document.getElementById('float-dual-sw');
  const dualTimer = document.getElementById('float-dual-timer');
  const modeBadge = document.getElementById('float-mode-badge');
  const playBtn = document.getElementById('btn-play');
  const lapBtn = document.getElementById('btn-lap');
  const resetBtn = document.getElementById('btn-reset');
  const pipBtn = document.getElementById('btn-pip-always-ontop');
  const bannerPipBtn = document.getElementById('btn-banner-pip');
  const cornerBtn = document.getElementById('btn-corner-cycle');
  const cornerLabel = document.getElementById('corner-label');
  const sizeBtn = document.getElementById('btn-size-cycle');
  const sizeLabel = document.getElementById('size-label');

  const cornerNames = {
    'top-right': '↗ TR',
    'bottom-right': '↘ BR',
    'bottom-left': '↙ BL',
    'top-left': '↖ TL'
  };

  // Safe sound player
  function playSound(name) {
    if (window.soundFX && typeof window.soundFX[name] === 'function') {
      try { window.soundFX[name](); } catch (e) {}
    }
  }

  // Safe message sender
  function sendMsg(msg, cb) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {}
          else if (cb && res) cb(res);
        });
      } catch (e) {}
    }
  }

  // Format MM:SS or HH:MM:SS
  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => (n < 10 ? '0' + n : n);
    if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  }

  function getSwElapsed() {
    if (state.stopwatch.status === 'running') {
      return Date.now() - state.stopwatch.startTime + state.stopwatch.elapsedBeforePause;
    }
    return state.stopwatch.elapsedBeforePause || 0;
  }

  function getTargetRemaining() {
    let elapsed = state.targetTimer.elapsedBeforePause || 0;
    if (state.targetTimer.status === 'running') {
      elapsed += Date.now() - state.targetTimer.startTime;
    }
    return Math.max(0, (state.targetTimer.targetDurationMs || 1800000) - elapsed);
  }

  // Animation Frame Loop
  function tick() {
    const swMs = getSwElapsed();
    const tgtMs = getTargetRemaining();

    if (state.mode === 'dual') {
      modeBadge.textContent = '⚡ DUAL MODE';
      clockSingle.style.display = 'none';
      clockDual.style.display = 'flex';

      dualSw.textContent = formatTime(swMs);
      dualTimer.textContent = formatTime(tgtMs);

      if (tgtMs <= 300000 && tgtMs > 0 && state.targetTimer.status === 'running') {
        dualTimer.classList.add('warning');
      } else {
        dualTimer.classList.remove('warning');
      }

      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      playBtn.textContent = bothRunning ? '⏸ Pause Both' : '▶ Start Both';

    } else if (state.mode === 'timer') {
      modeBadge.textContent = 'TARGET COUNTDOWN';
      clockSingle.style.display = 'block';
      clockDual.style.display = 'none';

      clockSingle.textContent = formatTime(tgtMs);
      if (tgtMs <= 300000 && tgtMs > 0 && state.targetTimer.status === 'running') {
        clockSingle.classList.add('warning');
      } else {
        clockSingle.classList.remove('warning');
      }

      playBtn.textContent = state.targetTimer.status === 'running' ? '⏸ Pause' : '▶ Start';

    } else {
      modeBadge.textContent = 'STOPWATCH MODE';
      clockSingle.style.display = 'block';
      clockDual.style.display = 'none';
      clockSingle.classList.remove('warning');

      clockSingle.textContent = formatTime(swMs);
      playBtn.textContent = state.stopwatch.status === 'running' ? '⏸ Pause' : '▶ Start';
    }

    requestAnimationFrame(tick);
  }

  tick();

  // Control Buttons
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

  lapBtn.addEventListener('click', () => {
    playSound('lap');
    sendMsg({ type: 'ADD_LAP' });
  });

  resetBtn.addEventListener('click', () => {
    playSound('tick');
    const target = state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch');
    sendMsg({ type: 'RESET', target });
  });

  // =========================================================================
  // ALWAYS ON TOP: Document Picture-in-Picture (Floats over VS Code, apps)
  // =========================================================================
  async function launchAlwaysOnTopPiP() {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture is not supported in this Chrome version. Your window is already floating!');
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
      pipBtn.classList.add('active');
      document.getElementById('btn-pip-text').textContent = 'Pinned';
      document.getElementById('banner-pip-tip').style.display = 'none';

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
        pipBtn.classList.remove('active');
        document.getElementById('btn-pip-text').textContent = 'Always on Top';
        document.getElementById('banner-pip-tip').style.display = 'flex';
      });

    } catch (err) {
      console.warn('PiP launch error:', err);
    }
  }

  pipBtn.addEventListener('click', launchAlwaysOnTopPiP);
  bannerPipBtn.addEventListener('click', launchAlwaysOnTopPiP);

  // =========================================================================
  // SIZE TOGGLE: Resizes the actual window smaller (Normal, Compact, Mini)
  // =========================================================================
  sizeBtn.addEventListener('click', () => {
    currentSizeIdx = (currentSizeIdx + 1) % SIZES.length;
    const cur = SIZES[currentSizeIdx];
    document.body.setAttribute('data-size', cur.name);
    sizeLabel.textContent = cur.name.charAt(0).toUpperCase() + cur.name.slice(1);

    // If standalone Chrome window, resize the native OS window
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
      chrome.windows.getCurrent((win) => {
        if (win && win.id) {
          chrome.windows.update(win.id, {
            width: cur.width,
            height: cur.height
          });
        }
      });
    }
  });

  // =========================================================================
  // 4-CORNER MOVE: Moves the native window to screen corners
  // =========================================================================
  cornerBtn.addEventListener('click', () => {
    currentCornerIdx = (currentCornerIdx + 1) % CORNERS.length;
    const corner = CORNERS[currentCornerIdx];
    cornerLabel.textContent = cornerNames[corner] || '↗ TR';

    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
      chrome.windows.getCurrent((win) => {
        if (!win || !win.id) return;
        const cur = SIZES[currentSizeIdx];
        const scrW = window.screen.availWidth || 1920;
        const scrH = window.screen.availHeight || 1080;

        let left = 20;
        let top = 20;

        if (corner === 'top-right') {
          left = scrW - cur.width - 25;
          top = 25;
        } else if (corner === 'bottom-right') {
          left = scrW - cur.width - 25;
          top = scrH - cur.height - 25;
        } else if (corner === 'bottom-left') {
          left = 25;
          top = scrH - cur.height - 25;
        } else if (corner === 'top-left') {
          left = 25;
          top = 25;
        }

        chrome.windows.update(win.id, { left: Math.max(0, left), top: Math.max(0, top) });
      });
    }
  });

  // Sync state from background
  function syncState(s) {
    if (!s) return;
    state = Object.assign({}, state, s);
  }

  sendMsg({ type: 'GET_STATE' }, (res) => {
    if (res && res.state) syncState(res.state);
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'STATE_UPDATED') {
        syncState(msg.state);
      }
    });
  }
})();
