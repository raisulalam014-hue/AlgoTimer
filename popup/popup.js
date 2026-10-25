// AlgoTimer - Problem Solving Stopwatch & Timer UI Logic
// Supports: Document Picture-in-Picture Pop-Up Screen, Concurrent Dual Timers, Milestones, History & Sound Alerts

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Navigation & Header
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const lapBadge = document.getElementById('lap-badge');

  // Pop Up Screen Elements
  const btnPopoutPip = document.getElementById('btn-popout-pip');
  const btnPopoutWindow = document.getElementById('btn-popout-window');
  const settingBtnLaunchPip = document.getElementById('setting-btn-launch-pip');

  // Mode buttons
  const btnModeStopwatch = document.getElementById('btn-mode-stopwatch');
  const btnModeTimer = document.getElementById('btn-mode-timer');
  const btnModeDual = document.getElementById('btn-mode-dual');

  // Views
  const singleModeView = document.getElementById('single-mode-view');
  const dualModeView = document.getElementById('dual-mode-view');

  // Concurrent Banners
  const concurrentTargetBanner = document.getElementById('concurrent-target-banner');
  const concurrentTargetTime = document.getElementById('concurrent-target-time');
  const btnConcurrentTargetPause = document.getElementById('btn-concurrent-target-pause');
  const btnConcurrentTargetSwitch = document.getElementById('btn-concurrent-target-switch');

  const concurrentStopwatchBanner = document.getElementById('concurrent-stopwatch-banner');
  const concurrentStopwatchTime = document.getElementById('concurrent-stopwatch-time');
  const btnConcurrentStopwatchPause = document.getElementById('btn-concurrent-stopwatch-pause');
  const btnConcurrentStopwatchSwitch = document.getElementById('btn-concurrent-stopwatch-switch');

  // Single Mode Elements
  const dialDigits = document.getElementById('dial-digits');
  const dialProgress = document.getElementById('dial-progress');
  const dialStatusLabel = document.getElementById('dial-status-label');
  const dialTargetLabel = document.getElementById('dial-target-label');
  const btnToggleRun = document.getElementById('btn-toggle-run');
  const btnToggleText = document.getElementById('btn-toggle-text');
  const btnReset = document.getElementById('btn-reset');
  const btnLap = document.getElementById('btn-lap');

  // Presets & Custom Target
  const presetsContainer = document.getElementById('presets-container');
  const presetChips = document.querySelectorAll('.preset-chip');
  const btnCustomTime = document.getElementById('btn-custom-time');
  const customTimeBox = document.getElementById('custom-time-box');
  const btnApplyCustom = document.getElementById('btn-apply-custom');
  const customHours = document.getElementById('custom-hours');
  const customMinutes = document.getElementById('custom-minutes');
  const customSeconds = document.getElementById('custom-seconds');

  // Dual Mode View Elements
  const dualSwDigits = document.getElementById('dual-sw-digits');
  const dualSwBadge = document.getElementById('dual-sw-badge');
  const btnDualSwToggle = document.getElementById('btn-dual-sw-toggle');
  const btnDualSwText = document.getElementById('btn-dual-sw-text');
  const btnDualSwLap = document.getElementById('btn-dual-sw-lap');
  const btnDualSwReset = document.getElementById('btn-dual-sw-reset');

  const dualTimerDigits = document.getElementById('dual-timer-digits');
  const dualTimerBadge = document.getElementById('dual-timer-badge');
  const dualTimerProgress = document.getElementById('dual-timer-progress');
  const dualChips = document.querySelectorAll('.dual-chip');
  const btnDualTimerToggle = document.getElementById('btn-dual-timer-toggle');
  const btnDualTimerText = document.getElementById('btn-dual-timer-text');
  const btnDualTimerReset = document.getElementById('btn-dual-timer-reset');

  const btnDualMasterToggle = document.getElementById('btn-dual-master-toggle');
  const dualMasterIcon = document.getElementById('dual-master-icon');
  const dualMasterText = document.getElementById('dual-master-text');
  const btnDualMasterReset = document.getElementById('btn-dual-master-reset');

  // Laps & History
  const lapPhaseBtns = document.querySelectorAll('.lap-phase-btn');
  const lapsList = document.getElementById('laps-list');
  const historyList = document.getElementById('history-list');
  const statSolvedCount = document.getElementById('stat-solved-count');
  const statTotalTime = document.getElementById('stat-total-time');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Settings
  const settingDualActive = document.getElementById('setting-dual-active');
  const settingSound = document.getElementById('setting-sound');
  const settingFloating = document.getElementById('setting-floating');

  // Problem Logging
  const activeProblemTitle = document.getElementById('active-problem-title');
  const activePlatform = document.getElementById('active-platform');
  const activeDifficulty = document.getElementById('active-difficulty');

  // Modal elements
  const modalLog = document.getElementById('modal-log');
  const btnLogModalOpen = document.getElementById('btn-log-modal-open');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalSave = document.getElementById('btn-modal-save');
  const modalTitle = document.getElementById('modal-title');
  const modalPlatform = document.getElementById('modal-platform');
  const modalDifficulty = document.getElementById('modal-difficulty');
  const modalTimeDisplay = document.getElementById('modal-time-display');
  const modalNotes = document.getElementById('modal-notes');

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 86;
  if (dialProgress) dialProgress.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;

  // Local state cache
  let state = {
    mode: 'stopwatch',
    allowDualActive: true,
    stopwatch: {
      status: 'stopped',
      startTime: null,
      elapsedBeforePause: 0
    },
    targetTimer: {
      status: 'stopped',
      startTime: null,
      elapsedBeforePause: 0,
      targetDurationMs: 30 * 60 * 1000
    },
    status: 'stopped',
    startTime: null,
    elapsedBeforePause: 0,
    targetDurationMs: 30 * 60 * 1000,
    soundEnabled: true,
    floatingWidgetEnabled: true,
    laps: [],
    history: []
  };

  let animationFrameId = null;
  let warned5min = false;
  let warned1min = false;

  // Detect popout query param
  if (new URLSearchParams(window.location.search).has('popout')) {
    document.body.classList.add('is-popout');
  }

  // Normalize state helper
  function normalizeState(raw) {
    const s = Object.assign({}, state, raw || {});
    if (!s.stopwatch) {
      s.stopwatch = {
        status: s.mode === 'stopwatch' ? (s.status || 'stopped') : 'stopped',
        startTime: s.mode === 'stopwatch' ? s.startTime : null,
        elapsedBeforePause: s.mode === 'stopwatch' ? (s.elapsedBeforePause || 0) : 0
      };
    }
    if (!s.targetTimer) {
      s.targetTimer = {
        status: s.mode === 'timer' ? (s.status || 'stopped') : 'stopped',
        startTime: s.mode === 'timer' ? s.startTime : null,
        elapsedBeforePause: s.mode === 'timer' ? (s.elapsedBeforePause || 0) : 0,
        targetDurationMs: s.targetDurationMs || (30 * 60 * 1000)
      };
    }
    if (s.allowDualActive === undefined) s.allowDualActive = true;
    return s;
  }

  // Safe Chrome message wrapper
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;

  function sendMessage(msg) {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response || {});
          }
        });
      } else {
        resolve(handleMockMessage(msg));
      }
    });
  }

  // Mock message handler for browser preview / local testing
  function handleMockMessage(msg) {
    switch (msg.type) {
      case 'GET_STATE':
        return { state };

      case 'START': {
        const target = msg.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

        if (target === 'both' || target === 'stopwatch') {
          if (state.stopwatch.status !== 'running') {
            state.stopwatch.status = 'running';
            state.stopwatch.startTime = Date.now();
          }
          if (!state.allowDualActive && target === 'stopwatch' && state.targetTimer.status === 'running') {
            state.targetTimer.status = 'paused';
            state.targetTimer.elapsedBeforePause += Date.now() - state.targetTimer.startTime;
            state.targetTimer.startTime = null;
          }
        }

        if (target === 'both' || target === 'timer') {
          if (state.targetTimer.status !== 'running') {
            if (state.targetTimer.status === 'finished') {
              state.targetTimer.elapsedBeforePause = 0;
            }
            state.targetTimer.status = 'running';
            state.targetTimer.startTime = Date.now();
          }
          if (!state.allowDualActive && target === 'timer' && state.stopwatch.status === 'running') {
            state.stopwatch.status = 'paused';
            state.stopwatch.elapsedBeforePause += Date.now() - state.stopwatch.startTime;
            state.stopwatch.startTime = null;
          }
        }
        return { success: true, state };
      }

      case 'PAUSE': {
        const target = msg.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

        if (target === 'both' || target === 'stopwatch') {
          if (state.stopwatch.status === 'running') {
            state.stopwatch.status = 'paused';
            state.stopwatch.elapsedBeforePause += Date.now() - state.stopwatch.startTime;
            state.stopwatch.startTime = null;
          }
        }

        if (target === 'both' || target === 'timer') {
          if (state.targetTimer.status === 'running') {
            state.targetTimer.status = 'paused';
            state.targetTimer.elapsedBeforePause += Date.now() - state.targetTimer.startTime;
            state.targetTimer.startTime = null;
          }
        }
        return { success: true, state };
      }

      case 'RESET': {
        const target = msg.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

        if (target === 'both' || target === 'stopwatch') {
          state.stopwatch.status = 'stopped';
          state.stopwatch.startTime = null;
          state.stopwatch.elapsedBeforePause = 0;
          state.laps = [];
        }

        if (target === 'both' || target === 'timer') {
          state.targetTimer.status = 'stopped';
          state.targetTimer.startTime = null;
          state.targetTimer.elapsedBeforePause = 0;
        }
        return { success: true, state };
      }

      case 'SET_MODE': {
        state.mode = msg.mode;
        return { success: true, state };
      }

      case 'SET_TARGET': {
        state.targetTimer.targetDurationMs = msg.targetDurationMs;
        state.targetDurationMs = msg.targetDurationMs;
        if (state.targetTimer.status !== 'running') {
          state.targetTimer.elapsedBeforePause = 0;
          state.targetTimer.status = 'stopped';
          state.targetTimer.startTime = null;
        }
        return { success: true, state };
      }

      case 'ADD_LAP': {
        const elapsed = getStopwatchElapsed();
        const prevLapTime = state.laps.length > 0 ? state.laps[0].totalMs : 0;
        const splitMs = Math.max(0, elapsed - prevLapTime);
        const lap = {
          id: state.laps.length + 1,
          label: msg.label || ('Phase ' + (state.laps.length + 1)),
          totalMs: elapsed,
          splitMs: splitMs,
          timestamp: Date.now()
        };
        state.laps.unshift(lap);
        return { success: true, state, lap };
      }

      case 'LOG_PROBLEM': {
        const item = {
          id: Date.now().toString(),
          title: msg.title,
          platform: msg.platform,
          difficulty: msg.difficulty,
          durationMs: msg.durationMs,
          verdict: msg.verdict,
          notes: msg.notes,
          timestamp: new Date().toISOString()
        };
        state.history = state.history || [];
        state.history.unshift(item);
        return { success: true, state, session: item };
      }

      case 'CLEAR_HISTORY':
        state.history = [];
        return { success: true, state };

      case 'UPDATE_SETTINGS':
        if (msg.soundEnabled !== undefined) state.soundEnabled = msg.soundEnabled;
        if (msg.floatingWidgetEnabled !== undefined) state.floatingWidgetEnabled = msg.floatingWidgetEnabled;
        if (msg.allowDualActive !== undefined) state.allowDualActive = msg.allowDualActive;
        return { success: true, state };

      default:
        return { success: true, state };
    }
  }

  // Formatting helpers
  function pad(n, len = 2) {
    return String(n).padStart(len, '0');
  }

  function formatTimeParts(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);

    const base = hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    return { base, tenths, fullText: `${base}.${tenths}` };
  }

  function formatMinutesShort(ms) {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  // Time calculations for independent engines
  function getStopwatchElapsed() {
    if (state.stopwatch.status === 'running') {
      return Date.now() - state.stopwatch.startTime + state.stopwatch.elapsedBeforePause;
    }
    return state.stopwatch.elapsedBeforePause;
  }

  function getTargetElapsed() {
    if (state.targetTimer.status === 'running') {
      return Date.now() - state.targetTimer.startTime + state.targetTimer.elapsedBeforePause;
    }
    return state.targetTimer.elapsedBeforePause;
  }

  function getTargetRemaining() {
    const elapsed = getTargetElapsed();
    return Math.max(0, state.targetTimer.targetDurationMs - elapsed);
  }

  // ================= POP UP SCREEN SYSTEM =================
  async function triggerPopoutPiP() {
    if ('documentPictureInPicture' in window) {
      try {
        if (window._pipWindow) {
          window._pipWindow.close();
          return;
        }

        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 380,
          height: 620
        });
        window._pipWindow = pipWindow;

        // Copy all CSS stylesheets & styles
        [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(el => {
          pipWindow.document.head.appendChild(el.cloneNode(true));
        });

        pipWindow.document.title = 'AlgoTimer - Always-on-Top Floating Screen';

        const appContainer = document.querySelector('.app-container');
        pipWindow.document.body.appendChild(appContainer);
        pipWindow.document.body.classList.add('is-pip');
        document.body.classList.add('is-pip');

        pipWindow.addEventListener('pagehide', () => {
          document.body.appendChild(appContainer);
          document.body.classList.remove('is-pip');
          window._pipWindow = null;
        });

        return;
      } catch (err) {
        console.warn('Document Picture-in-Picture failed, falling back to standalone window:', err);
      }
    }

    // Fallback: standalone popup window
    triggerPopoutWindow();
  }

  function triggerPopoutWindow() {
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup/popup.html?popout=true'),
        type: 'popup',
        width: 400,
        height: 640,
        focused: true
      });
    } else {
      window.open('popup.html?popout=true', 'AlgoTimerPopout', 'width=400,height=640,resizable=yes');
    }
  }

  if (btnPopoutPip) btnPopoutPip.addEventListener('click', triggerPopoutPiP);
  if (settingBtnLaunchPip) settingBtnLaunchPip.addEventListener('click', triggerPopoutPiP);
  if (btnPopoutWindow) btnPopoutWindow.addEventListener('click', triggerPopoutWindow);

  // ================= MAIN RENDER LOOP =================
  function updateUI() {
    const swElapsed = getStopwatchElapsed();
    const targetRemaining = getTargetRemaining();
    const targetElapsed = getTargetElapsed();

    // 1. Dual Mode Rendering
    if (state.mode === 'dual') {
      singleModeView.style.display = 'none';
      dualModeView.style.display = 'flex';
      concurrentTargetBanner.style.display = 'none';
      concurrentStopwatchBanner.style.display = 'none';

      // Stopwatch Card
      const swParts = formatTimeParts(swElapsed);
      dualSwDigits.innerHTML = `${swParts.base}<small id="dual-sw-millis">.${swParts.tenths}</small>`;
      dualSwBadge.textContent = state.stopwatch.status.toUpperCase();
      dualSwBadge.className = `dual-badge ${state.stopwatch.status}`;
      btnDualSwText.textContent = state.stopwatch.status === 'running' ? 'Pause' : 'Start';

      const swCard = document.getElementById('dual-stopwatch-card');
      if (state.stopwatch.status === 'running') swCard.classList.add('active-running');
      else swCard.classList.remove('active-running');

      // Target Timer Card
      const timerParts = formatTimeParts(targetRemaining);
      dualTimerDigits.innerHTML = `${timerParts.base}<small id="dual-timer-millis">.${timerParts.tenths}</small>`;
      
      const timerProgressRatio = Math.min(1, targetElapsed / state.targetTimer.targetDurationMs);
      dualTimerProgress.style.width = `${timerProgressRatio * 100}%`;

      const timerCard = document.getElementById('dual-timer-card');
      if (state.targetTimer.status === 'finished') {
        dualTimerBadge.textContent = 'FINISHED';
        dualTimerBadge.className = 'dual-badge warning';
        dualTimerDigits.classList.add('warning');
        dualTimerProgress.classList.add('warning');
        timerCard.classList.add('warning-running');
        btnDualTimerText.textContent = 'Restart';
      } else if (state.targetTimer.status === 'running') {
        dualTimerBadge.textContent = `${formatMinutesShort(state.targetTimer.targetDurationMs)} TARGET`;
        dualTimerBadge.className = 'dual-badge running';
        btnDualTimerText.textContent = 'Pause';
        timerCard.classList.add('active-running');

        if (targetRemaining <= 300000) {
          dualTimerDigits.classList.add('warning');
          dualTimerProgress.classList.add('warning');
          timerCard.classList.add('warning-running');
          if (!warned5min && window.soundFX) {
            window.soundFX.warning();
            warned5min = true;
          }
        } else {
          dualTimerDigits.classList.remove('warning');
          dualTimerProgress.classList.remove('warning');
          timerCard.classList.remove('warning-running');
        }

        if (targetRemaining <= 60000 && !warned1min && window.soundFX) {
          window.soundFX.warning();
          warned1min = true;
        }

        if (targetRemaining === 0) {
          state.targetTimer.status = 'finished';
          if (window.soundFX) window.soundFX.finish();
        }
      } else {
        dualTimerBadge.textContent = state.targetTimer.status === 'paused' ? 'PAUSED' : `${formatMinutesShort(state.targetTimer.targetDurationMs)} TARGET`;
        dualTimerBadge.className = `dual-badge ${state.targetTimer.status}`;
        btnDualTimerText.textContent = 'Start';
        timerCard.classList.remove('active-running');
        timerCard.classList.remove('warning-running');
      }

      // Master Synchronization Button
      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) {
        dualMasterIcon.textContent = '⏸';
        dualMasterText.textContent = 'Pause Both';
        btnDualMasterToggle.classList.add('running');
      } else {
        dualMasterIcon.textContent = '⚡';
        dualMasterText.textContent = 'Start Both Together';
        btnDualMasterToggle.classList.remove('running');
      }

    } else {
      // 2. Single Mode Rendering (Stopwatch or Target Timer)
      singleModeView.style.display = 'block';
      dualModeView.style.display = 'none';

      if (state.mode === 'timer') {
        // Target Countdown Mode
        const parts = formatTimeParts(targetRemaining);
        dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
        dialStatusLabel.textContent = state.targetTimer.status === 'finished' ? 'FINISHED' : 'TARGET COUNTDOWN';
        dialTargetLabel.style.display = 'block';
        dialTargetLabel.textContent = `Target: ${formatTimeParts(state.targetTimer.targetDurationMs).base}`;

        const progressRatio = Math.min(1, targetElapsed / state.targetTimer.targetDurationMs);
        const dashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
        dialProgress.style.strokeDashoffset = dashoffset;

        // Warnings & Finished
        if (targetRemaining <= 300000 && targetRemaining > 60000 && state.targetTimer.status === 'running') {
          dialDigits.classList.add('warning');
          dialProgress.classList.add('warning');
          if (!warned5min && window.soundFX) {
            window.soundFX.warning();
            warned5min = true;
          }
        } else if (targetRemaining <= 60000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
          dialDigits.classList.add('warning');
          dialProgress.classList.add('warning');
          if (!warned1min && window.soundFX) {
            window.soundFX.warning();
            warned1min = true;
          }
        } else if (targetRemaining === 0 && state.targetTimer.status === 'running') {
          state.targetTimer.status = 'finished';
          if (window.soundFX) window.soundFX.finish();
        } else {
          dialDigits.classList.remove('warning');
          dialProgress.classList.remove('warning');
        }

        // Toggle run button text for target timer
        if (state.targetTimer.status === 'running') {
          btnToggleRun.classList.add('running');
          btnToggleText.textContent = 'Pause';
        } else {
          btnToggleRun.classList.remove('running');
          btnToggleText.textContent = state.targetTimer.status === 'finished' ? 'Restart' : 'Start';
        }

        // Background Concurrent Stopwatch Banner
        if (state.stopwatch.status === 'running') {
          concurrentStopwatchBanner.style.display = 'flex';
          concurrentStopwatchTime.textContent = formatTimeParts(swElapsed).base;
        } else {
          concurrentStopwatchBanner.style.display = 'none';
        }
        concurrentTargetBanner.style.display = 'none';

      } else {
        // Stopwatch Mode
        const parts = formatTimeParts(swElapsed);
        dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
        dialStatusLabel.textContent = 'STOPWATCH';
        dialTargetLabel.style.display = 'none';
        dialDigits.classList.remove('warning');
        dialProgress.classList.remove('warning');

        // Continuous 60s rotating ring
        const secRatio = (swElapsed % 60000) / 60000;
        dialProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - secRatio);

        // Toggle run button text for stopwatch
        if (state.stopwatch.status === 'running') {
          btnToggleRun.classList.add('running');
          btnToggleText.textContent = 'Pause';
        } else {
          btnToggleRun.classList.remove('running');
          btnToggleText.textContent = 'Start';
        }

        // Background Concurrent Target Timer Banner
        if (state.targetTimer.status === 'running') {
          concurrentTargetBanner.style.display = 'flex';
          concurrentTargetTime.textContent = formatTimeParts(targetRemaining).base;
        } else {
          concurrentTargetBanner.style.display = 'none';
        }
        concurrentStopwatchBanner.style.display = 'none';
      }
    }

    animationFrameId = requestAnimationFrame(updateUI);
  }

  // ================= CONTROL SYNC =================
  function applyStateToControls() {
    // Mode switcher buttons
    [btnModeStopwatch, btnModeTimer, btnModeDual].forEach(b => b.classList.remove('active'));
    if (state.mode === 'dual') {
      btnModeDual.classList.add('active');
      presetsContainer.style.display = 'none';
    } else if (state.mode === 'timer') {
      btnModeTimer.classList.add('active');
      presetsContainer.style.display = 'block';
    } else {
      btnModeStopwatch.classList.add('active');
      presetsContainer.style.display = 'none';
    }

    // Preset active highlight
    const mins = Math.round(state.targetTimer.targetDurationMs / 60000);
    presetChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.mins) === mins);
    });
    dualChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.mins) === mins);
    });

    // Settings
    settingDualActive.checked = state.allowDualActive !== false;
    settingSound.checked = state.soundEnabled !== false;
    settingFloating.checked = state.floatingWidgetEnabled !== false;
    if (window.soundFX) window.soundFX.enabled = settingSound.checked;
  }

  // Switch mode without stopping running timers!
  async function switchMode(newMode) {
    if (state.mode === newMode) return;
    if (window.soundFX) window.soundFX.tick();
    const res = await sendMessage({ type: 'SET_MODE', mode: newMode });
    if (res && res.state) {
      state = normalizeState(res.state);
      applyStateToControls();
    }
  }

  btnModeStopwatch.addEventListener('click', () => switchMode('stopwatch'));
  btnModeTimer.addEventListener('click', () => switchMode('timer'));
  btnModeDual.addEventListener('click', () => switchMode('dual'));

  // ================= SINGLE MODE CONTROLS =================
  btnToggleRun.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.start();

    if (state.mode === 'timer') {
      if (state.targetTimer.status === 'running') {
        const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
        if (res && res.state) state = normalizeState(res.state);
      } else {
        const res = await sendMessage({ type: 'START', target: 'timer' });
        if (res && res.state) state = normalizeState(res.state);
      }
    } else {
      if (state.stopwatch.status === 'running') {
        const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
        if (res && res.state) state = normalizeState(res.state);
      } else {
        const res = await sendMessage({ type: 'START', target: 'stopwatch' });
        if (res && res.state) state = normalizeState(res.state);
      }
    }
  });

  btnReset.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    warned5min = false;
    warned1min = false;
    const target = state.mode === 'timer' ? 'timer' : 'stopwatch';
    const res = await sendMessage({ type: 'RESET', target });
    if (res && res.state) state = normalizeState(res.state);
    renderLaps();
  });

  btnLap.addEventListener('click', () => recordLap());

  // ================= DUAL MODE CONTROLS =================
  // Master Sync Start / Pause Both
  btnDualMasterToggle.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.start();
    const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';

    if (bothRunning) {
      const res = await sendMessage({ type: 'PAUSE', target: 'both' });
      if (res && res.state) state = normalizeState(res.state);
    } else {
      const res = await sendMessage({ type: 'START', target: 'both' });
      if (res && res.state) state = normalizeState(res.state);
    }
  });

  btnDualMasterReset.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    warned5min = false;
    warned1min = false;
    const res = await sendMessage({ type: 'RESET', target: 'both' });
    if (res && res.state) state = normalizeState(res.state);
    renderLaps();
  });

  // Stopwatch Card Controls
  btnDualSwToggle.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.start();
    if (state.stopwatch.status === 'running') {
      const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
      if (res && res.state) state = normalizeState(res.state);
    } else {
      const res = await sendMessage({ type: 'START', target: 'stopwatch' });
      if (res && res.state) state = normalizeState(res.state);
    }
  });

  btnDualSwLap.addEventListener('click', () => recordLap());

  btnDualSwReset.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    const res = await sendMessage({ type: 'RESET', target: 'stopwatch' });
    if (res && res.state) state = normalizeState(res.state);
    renderLaps();
  });

  // Target Timer Card Controls
  btnDualTimerToggle.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.start();
    if (state.targetTimer.status === 'running') {
      const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
      if (res && res.state) state = normalizeState(res.state);
    } else {
      const res = await sendMessage({ type: 'START', target: 'timer' });
      if (res && res.state) state = normalizeState(res.state);
    }
  });

  btnDualTimerReset.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    warned5min = false;
    warned1min = false;
    const res = await sendMessage({ type: 'RESET', target: 'timer' });
    if (res && res.state) state = normalizeState(res.state);
  });

  // Target Presets
  async function applyPresetMins(mins) {
    if (window.soundFX) window.soundFX.tick();
    warned5min = false;
    warned1min = false;
    const targetDurationMs = mins * 60 * 1000;
    const res = await sendMessage({ type: 'SET_TARGET', targetDurationMs });
    if (res && res.state) {
      state = normalizeState(res.state);
      applyStateToControls();
    }
  }

  presetChips.forEach(chip => {
    if (chip.id === 'btn-custom-time') return;
    chip.addEventListener('click', () => applyPresetMins(parseInt(chip.dataset.mins)));
  });

  dualChips.forEach(chip => {
    chip.addEventListener('click', () => applyPresetMins(parseInt(chip.dataset.mins)));
  });

  btnCustomTime.addEventListener('click', () => {
    customTimeBox.style.display = customTimeBox.style.display === 'none' ? 'flex' : 'none';
  });

  btnApplyCustom.addEventListener('click', async () => {
    const hrs = parseInt(customHours.value) || 0;
    const mins = parseInt(customMinutes.value) || 0;
    const secs = parseInt(customSeconds.value) || 0;
    const totalMs = (hrs * 3600 + mins * 60 + secs) * 1000;

    if (totalMs < 10000) {
      alert('Target duration must be at least 10 seconds.');
      return;
    }

    customTimeBox.style.display = 'none';
    if (window.soundFX) window.soundFX.tick();
    const res = await sendMessage({ type: 'SET_TARGET', targetDurationMs: totalMs });
    if (res && res.state) {
      state = normalizeState(res.state);
      applyStateToControls();
    }
  });

  // ================= CONCURRENT BANNER ACTIONS =================
  btnConcurrentTargetPause.addEventListener('click', async () => {
    const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
    if (res && res.state) state = normalizeState(res.state);
  });

  btnConcurrentTargetSwitch.addEventListener('click', () => {
    switchMode('timer');
  });

  btnConcurrentStopwatchPause.addEventListener('click', async () => {
    const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
    if (res && res.state) state = normalizeState(res.state);
  });

  btnConcurrentStopwatchSwitch.addEventListener('click', () => {
    switchMode('stopwatch');
  });

  // ================= LAPS & CHECKPOINTS =================
  async function recordLap(customLabel = null) {
    const elapsed = getStopwatchElapsed();
    if (state.stopwatch.status !== 'running' && elapsed === 0) return;
    if (window.soundFX) window.soundFX.lap();
    const res = await sendMessage({ type: 'ADD_LAP', label: customLabel });
    if (res && res.state) {
      state = normalizeState(res.state);
      renderLaps();
    }
  }

  lapPhaseBtns.forEach(btn => {
    btn.addEventListener('click', () => recordLap(btn.dataset.phase));
  });

  function renderLaps() {
    const count = (state.laps || []).length;
    if (count > 0) {
      lapBadge.style.display = 'inline-block';
      lapBadge.textContent = count;
    } else {
      lapBadge.style.display = 'none';
    }

    if (!state.laps || state.laps.length === 0) {
      lapsList.innerHTML = `
        <div class="empty-state">
          <p>No laps recorded yet.</p>
          <small>Click <strong>Lap</strong> while solving or select a phase above.</small>
        </div>
      `;
      return;
    }

    lapsList.innerHTML = state.laps.map(lap => `
      <div class="lap-row">
        <div class="lap-num-label">
          <span class="lap-tag">#${lap.id}</span>
          <span class="lap-name">${lap.label}</span>
        </div>
        <div class="lap-times">
          <div class="lap-split">+${formatTimeParts(lap.splitMs).base}</div>
          <div class="lap-total">Total: ${formatTimeParts(lap.totalMs).base}</div>
        </div>
      </div>
    `).join('');
  }

  // ================= SESSIONS & HISTORY =================
  function renderHistory() {
    const history = state.history || [];
    statSolvedCount.textContent = history.length;

    const totalMs = history.reduce((acc, cur) => acc + (cur.durationMs || 0), 0);
    statTotalTime.textContent = formatMinutesShort(totalMs);

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <p>No solved problem sessions yet.</p>
          <small>Log your completed problems to track your speed and consistency!</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map(item => {
      const diffClass = `badge-${(item.difficulty || 'medium').toLowerCase()}`;
      const verdictClass = `badge-${(item.verdict || 'solved').toLowerCase().replace(/\s+/g, '')}`;
      return `
        <div class="history-card">
          <div class="history-card-top">
            <span class="history-title">${item.title}</span>
            <span class="history-duration">${formatTimeParts(item.durationMs).base}</span>
          </div>
          <div class="history-card-badges">
            <span class="badge ${diffClass}">${item.difficulty}</span>
            <span class="badge ${verdictClass}">${item.verdict}</span>
            <span style="font-size: 10px; color: var(--text-dim); margin-left: auto;">
              ${new Date(item.timestamp).toLocaleDateString()}
            </span>
          </div>
          ${item.notes ? `<div class="history-notes">"${item.notes}"</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Log Modal Open
  btnLogModalOpen.addEventListener('click', () => {
    const swElapsed = getStopwatchElapsed();
    const duration = swElapsed > 0 ? swElapsed : getTargetElapsed();
    const parts = formatTimeParts(duration);
    modalTimeDisplay.textContent = parts.fullText;
    modalTitle.value = activeProblemTitle.value.trim() || '';
    modalPlatform.value = activePlatform.value;
    modalDifficulty.value = activeDifficulty.value;
    modalNotes.value = '';
    modalLog.style.display = 'flex';
  });

  btnModalClose.addEventListener('click', () => { modalLog.style.display = 'none'; });
  btnModalCancel.addEventListener('click', () => { modalLog.style.display = 'none'; });

  btnModalSave.addEventListener('click', async () => {
    const title = modalTitle.value.trim() || 'Untitled Problem';
    const platform = modalPlatform.value;
    const difficulty = modalDifficulty.value;
    const verdict = document.querySelector('input[name="verdict"]:checked')?.value || 'Solved';
    const notes = modalNotes.value.trim();
    const swElapsed = getStopwatchElapsed();
    const durationMs = swElapsed > 0 ? swElapsed : getTargetElapsed();

    const res = await sendMessage({
      type: 'LOG_PROBLEM',
      title,
      platform,
      difficulty,
      verdict,
      notes,
      durationMs
    });

    if (res && res.state) {
      state = normalizeState(res.state);
      renderHistory();
    }

    modalLog.style.display = 'none';
    if (window.soundFX) window.soundFX.lap();

    // Auto-switch to history tab
    navTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    document.querySelector('.nav-tab[data-tab="history"]').classList.add('active');
    document.getElementById('tab-history').classList.add('active');
  });

  // CSV Export
  btnExportCsv.addEventListener('click', () => {
    const history = state.history || [];
    if (history.length === 0) {
      alert('No sessions to export yet.');
      return;
    }

    let csv = 'ID,Date,Problem,Platform,Difficulty,Verdict,Duration (sec),Formatted Time,Notes\n';
    history.forEach(h => {
      const durSec = Math.round(h.durationMs / 1000);
      const formatted = formatTimeParts(h.durationMs).base;
      const cleanNotes = (h.notes || '').replace(/"/g, '""');
      const cleanTitle = (h.title || '').replace(/"/g, '""');
      csv += `"${h.id}","${h.timestamp}","${cleanTitle}","${h.platform}","${h.difficulty}","${h.verdict}",${durSec},"${formatted}","${cleanNotes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algotimer-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear History
  btnClearHistory.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your problem history?')) {
      const res = await sendMessage({ type: 'CLEAR_HISTORY' });
      if (res && res.state) {
        state = normalizeState(res.state);
        renderHistory();
      }
    }
  });

  // Settings Events
  settingDualActive.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    state.allowDualActive = enabled;
    await sendMessage({ type: 'UPDATE_SETTINGS', allowDualActive: enabled });
  });

  settingSound.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    if (window.soundFX) window.soundFX.enabled = enabled;
    await sendMessage({ type: 'UPDATE_SETTINGS', soundEnabled: enabled });
  });

  settingFloating.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await sendMessage({ type: 'UPDATE_SETTINGS', floatingWidgetEnabled: enabled });
  });

  // Tab Navigation
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');

      if (tabId === 'laps') renderLaps();
      if (tabId === 'history') renderHistory();
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (state.mode === 'dual') btnDualMasterToggle.click();
      else btnToggleRun.click();
    } else if (e.key === 'r' || e.key === 'R') {
      if (state.mode === 'dual') btnDualMasterReset.click();
      else btnReset.click();
    } else if (e.key === 'l' || e.key === 'L') {
      recordLap();
    } else if (e.key === 'm' || e.key === 'M') {
      if (state.mode === 'stopwatch') switchMode('timer');
      else if (state.mode === 'timer') switchMode('dual');
      else switchMode('stopwatch');
    }
  });

  // Storage Change Sync
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.algoTimerState) {
        state = normalizeState(changes.algoTimerState.newValue);
        applyStateToControls();
        renderLaps();
        renderHistory();
      }
    });
  }

  // Initial Load
  const initRes = await sendMessage({ type: 'GET_STATE' });
  if (initRes && initRes.state) {
    state = normalizeState(initRes.state);
  }
  applyStateToControls();
  renderLaps();
  renderHistory();
  updateUI();
});
