// AlgoTimer - Problem Solving Stopwatch & Timer UI Logic
// Supports: Resizable Anywhere Pop-Up Screen, Compact Mode, Concurrent Dual Timers, Milestones & Safe Audio

document.addEventListener('DOMContentLoaded', async () => {
  const runtimeAlert = document.getElementById('runtime-alert');
  const reportRuntimeError = (message) => {
    if (runtimeAlert) {
      runtimeAlert.textContent = `AlgoTimer could not finish loading: ${message}. Reload the extension and reopen the timer.`;
      runtimeAlert.hidden = false;
    }
  };
  window.addEventListener('error', (event) => {
    console.error('AlgoTimer popup runtime error:', event.error || event.message);
    reportRuntimeError(event.message || 'unexpected UI error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('AlgoTimer popup operation failed:', event.reason);
    reportRuntimeError(event.reason instanceof Error ? event.reason.message : 'timer operation failed');
  });

  // DOM Elements - Navigation & Header
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const lapBadge = document.getElementById('lap-badge');

  // Pop Up Screen & Compact Mode Elements
  const btnToggleCompact = document.getElementById('btn-toggle-compact');
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
  const settingFloatingDisplayMode = document.getElementById('setting-floating-display-mode');

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

  // Safe sound player - CANNOT throw errors
  function safeSound(fnName) {
    try {
      if (window.soundFX && typeof window.soundFX[fnName] === 'function') {
        window.soundFX[fnName]();
      }
    } catch (e) {
      console.warn('Audio call error suppressed:', e);
    }
  }

  // Safe normalize state helper
  function normalizeState(raw) {
    const s = Object.assign({}, state, raw || {});
    if (!s.stopwatch || typeof s.stopwatch !== 'object') {
      s.stopwatch = {
        status: s.mode === 'stopwatch' ? (s.status || 'stopped') : 'stopped',
        startTime: s.mode === 'stopwatch' ? s.startTime : null,
        elapsedBeforePause: Number(s.elapsedBeforePause) || 0
      };
    } else {
      s.stopwatch.status = s.stopwatch.status || 'stopped';
      s.stopwatch.elapsedBeforePause = Number(s.stopwatch.elapsedBeforePause) || 0;
    }

    if (!s.targetTimer || typeof s.targetTimer !== 'object') {
      s.targetTimer = {
        status: s.mode === 'timer' ? (s.status || 'stopped') : 'stopped',
        startTime: s.mode === 'timer' ? s.startTime : null,
        elapsedBeforePause: Number(s.elapsedBeforePause) || 0,
        targetDurationMs: Number(s.targetDurationMs) || (30 * 60 * 1000)
      };
    } else {
      s.targetTimer.status = s.targetTimer.status || 'stopped';
      s.targetTimer.elapsedBeforePause = Number(s.targetTimer.elapsedBeforePause) || 0;
      s.targetTimer.targetDurationMs = Number(s.targetTimer.targetDurationMs) || (30 * 60 * 1000);
    }

    if (s.allowDualActive === undefined) s.allowDualActive = true;
    return s;
  }

  // Local storage persistence for standalone browser view (zero server / zero network)
  function saveMockState(s) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('algotimer_standalone_state', JSON.stringify(s));
      }
    } catch (e) {}
  }

  function loadMockState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('algotimer_standalone_state');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  }

  // Safe Chrome message wrapper: strictly identify actual extension environment
  const isExtension = typeof chrome !== 'undefined' &&
                      Boolean(chrome.runtime) &&
                      Boolean(chrome.runtime.id) &&
                      typeof location !== 'undefined' &&
                      location.protocol === 'chrome-extension:';

  function sendMessage(msg) {
    return new Promise((resolve) => {
      if (isExtension) {
        try {
          chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
              // Extension background worker may be inactive or page in test mode; fallback to local handler
              resolve(handleMockMessage(msg));
            } else {
              resolve(response || {});
            }
          });
        } catch (err) {
          resolve(handleMockMessage(msg));
        }
      } else {
        // Standalone browser mode: 100% client-side, zero servers, zero network!
        resolve(handleMockMessage(msg));
      }
    });
  }

  // Mock message handler for browser preview / local testing
  function handleMockMessage(msg) {
    switch (msg.type) {
      case 'GET_STATE': {
        const saved = loadMockState();
        if (saved) state = normalizeState(saved);
        return { success: true, state };
      }

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
        saveMockState(state);
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
        saveMockState(state);
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
        saveMockState(state);
        return { success: true, state };
      }

      case 'SET_MODE': {
        state.mode = msg.mode;
        saveMockState(state);
        return { success: true, state };
      }

      case 'SET_TARGET': {
        state.targetTimer.targetDurationMs = Number(msg.targetDurationMs) || (30 * 60 * 1000);
        state.targetDurationMs = state.targetTimer.targetDurationMs;
        if (state.targetTimer.status !== 'running') {
          state.targetTimer.elapsedBeforePause = 0;
          state.targetTimer.status = 'stopped';
          state.targetTimer.startTime = null;
        }
        saveMockState(state);
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
        saveMockState(state);
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
        saveMockState(state);
        return { success: true, state, session: item };
      }

      case 'CLEAR_HISTORY':
        state.history = [];
        saveMockState(state);
        return { success: true, state };

      case 'UPDATE_SETTINGS':
        if (msg.soundEnabled !== undefined) state.soundEnabled = msg.soundEnabled;
        if (msg.floatingWidgetEnabled !== undefined) state.floatingWidgetEnabled = msg.floatingWidgetEnabled;
        if (msg.allowDualActive !== undefined) state.allowDualActive = msg.allowDualActive;
        saveMockState(state);
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
    if (!ms || isNaN(ms) || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);

    const base = hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    return { base, tenths, fullText: `${base}.${tenths}` };
  }

  function formatMinutesShort(ms) {
    const mins = Math.round((Number(ms) || 0) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  // Safe time calculations
  function getStopwatchElapsed() {
    if (!state.stopwatch) return 0;
    const elapsedBefore = Number(state.stopwatch.elapsedBeforePause) || 0;
    if (state.stopwatch.status === 'running' && state.stopwatch.startTime) {
      return Date.now() - state.stopwatch.startTime + elapsedBefore;
    }
    return elapsedBefore;
  }

  function getTargetElapsed() {
    if (!state.targetTimer) return 0;
    const elapsedBefore = Number(state.targetTimer.elapsedBeforePause) || 0;
    if (state.targetTimer.status === 'running' && state.targetTimer.startTime) {
      return Date.now() - state.targetTimer.startTime + elapsedBefore;
    }
    return elapsedBefore;
  }

  function getTargetRemaining() {
    if (!state.targetTimer) return 0;
    const targetMs = Number(state.targetTimer.targetDurationMs) || (30 * 60 * 1000);
    const elapsed = getTargetElapsed();
    return Math.max(0, targetMs - elapsed);
  }

  // ================= COMPACT MINI-MODE TOGGLE =================
  if (btnToggleCompact) {
    btnToggleCompact.addEventListener('click', () => {
      document.body.classList.toggle('is-compact');
      const isCompact = document.body.classList.contains('is-compact');
      btnToggleCompact.classList.toggle('active', isCompact);
      const textSpan = btnToggleCompact.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = isCompact ? 'Full' : 'Compact';
      safeSound('tick');
    });
  }

  // ================= PERSISTENT FLOATING WINDOW =================
  function triggerPopoutWindow() {
    if (isExtension && chrome.runtime && chrome.runtime.sendMessage) {
      sendMessage({ type: 'OPEN_FLOAT_WINDOW' });
    } else {
      window.open('float.html', 'AlgoTimerFloat', 'width=380,height=470,resizable=yes');
    }
  }

  if (btnPopoutPip) btnPopoutPip.addEventListener('click', triggerPopoutWindow);
  if (settingBtnLaunchPip) settingBtnLaunchPip.addEventListener('click', triggerPopoutWindow);
  if (btnPopoutWindow) btnPopoutWindow.addEventListener('click', triggerPopoutWindow);
  const btnOpenFloatingFromTimer = document.getElementById('btn-open-floating-from-timer');
  if (btnOpenFloatingFromTimer) btnOpenFloatingFromTimer.addEventListener('click', triggerPopoutWindow);
  const btnOpenShortcutsFromTimer = document.getElementById('btn-open-shortcuts-from-timer');
  if (btnOpenShortcutsFromTimer) {
    btnOpenShortcutsFromTimer.addEventListener('click', () => {
      document.querySelector('.nav-tab[data-tab="settings"]')?.click();
      document.getElementById('windows-companion-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

    // ================= DYNAMIC THEME ENGINE =================
  const THEMES = ['sunset', 'warm', 'aurora', 'graphite', 'black'];
  const THEME_LABELS = {
    sunset: 'Sunset Glass',
    warm: 'Warm Minimal',
    aurora: 'Aurora',
    graphite: 'Graphite Neon',
    black: 'Full Black'
  };
  const LEGACY_THEMES = { cosmic: 'sunset', cyan: 'warm', violet: 'aurora', emerald: 'graphite' };
  const THEME_GRADIENTS = {
    sunset: { stop1: '#ff9a62', stop2: '#fb7185', stop3: '#c084fc' },
    warm: { stop1: '#f97316', stop2: '#ea580c', stop3: '#fdba74' },
    aurora: { stop1: '#5b7cfa', stop2: '#8b5cf6', stop3: '#fb7185' },
    graphite: { stop1: '#b59aff', stop2: '#8b6ee8', stop3: '#f2c65d' },
    black: { stop1: '#f5cc55', stop2: '#8eeaff', stop3: '#c4a8ff' }
  };

  let currentTheme = 'sunset';

  function updateDialThemeGradient(themeName) {
    const grad = THEME_GRADIENTS[themeName] || THEME_GRADIENTS.sunset;
    const s1 = document.getElementById('grad-stop-1');
    const s2 = document.getElementById('grad-stop-2');
    const s3 = document.getElementById('grad-stop-3');
    if (s1) s1.setAttribute('stop-color', grad.stop1);
    if (s2) s2.setAttribute('stop-color', grad.stop2);
    if (s3) s3.setAttribute('stop-color', grad.stop3);
  }

  function applyTheme(themeName) {
    themeName = LEGACY_THEMES[themeName] || themeName;
    if (!THEMES.includes(themeName)) themeName = 'sunset';
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);

    const themeLabel = document.getElementById('header-theme-label');
    if (themeLabel) {
      themeLabel.textContent = THEME_LABELS[themeName];
    }

    document.querySelectorAll('.theme-pill-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.themeChoice === themeName);
    });

    updateDialThemeGradient(themeName);

    try {
      if (isExtension && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ activeTheme: themeName });
      } else {
        localStorage.setItem('algotimer_theme', themeName);
      }
    } catch (e) {}
  }

  // Quick theme cycler button
  const btnQuickTheme = document.getElementById('btn-quick-theme');
  if (btnQuickTheme) {
    btnQuickTheme.addEventListener('click', () => {
      const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
      applyTheme(THEMES[nextIdx]);
    });
  }

  // Settings theme pills
  document.querySelectorAll('.theme-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.themeChoice;
      if (choice) applyTheme(choice);
    });
  });

  // Load saved theme
  try {
    if (isExtension && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['activeTheme'], (res) => {
        if (res && res.activeTheme) applyTheme(res.activeTheme);
        else applyTheme('sunset');
      });
    } else {
      const savedTheme = localStorage.getItem('algotimer_theme');
      applyTheme(savedTheme || 'sunset');
    }
  } catch (e) {
    applyTheme('sunset');
  }

  // ================= MAIN RENDER LOOP =================
  function updateUI() {
    const swElapsed = getStopwatchElapsed();
    const targetRemaining = getTargetRemaining();
    const targetElapsed = getTargetElapsed();
    const activeStatus = state.mode === 'dual'
      ? (state.stopwatch.status === 'running' || state.targetTimer.status === 'running'
        ? 'running'
        : state.stopwatch.status === 'paused' || state.targetTimer.status === 'paused' ? 'paused' : 'stopped')
      : state.mode === 'timer' ? state.targetTimer.status : state.stopwatch.status;
    const timerRunningState = document.getElementById('timer-running-state');
    if (timerRunningState) {
      const stateLabel = activeStatus === 'running' ? 'RUNNING'
        : activeStatus === 'paused' ? 'PAUSED'
          : activeStatus === 'finished' ? 'FINISHED' : 'READY';
      timerRunningState.textContent = stateLabel;
      timerRunningState.dataset.state = activeStatus;
    }

    // 1. Dual Mode Rendering
    if (state.mode === 'dual') {
      if (singleModeView) singleModeView.style.display = 'none';
      if (dualModeView) dualModeView.style.display = 'flex';
      if (concurrentTargetBanner) concurrentTargetBanner.style.display = 'none';
      if (concurrentStopwatchBanner) concurrentStopwatchBanner.style.display = 'none';

      // Stopwatch Card
      const swParts = formatTimeParts(swElapsed);
      if (dualSwDigits) dualSwDigits.innerHTML = `${swParts.base}<small id="dual-sw-millis">.${swParts.tenths}</small>`;
      if (dualSwBadge) {
        dualSwBadge.textContent = (state.stopwatch.status || 'stopped').toUpperCase();
        dualSwBadge.className = `dual-badge ${state.stopwatch.status}`;
      }
      if (btnDualSwText) {
        btnDualSwText.textContent = state.stopwatch.status === 'running' ? 'Pause' : 'Start';
      }

      const swCard = document.getElementById('dual-stopwatch-card');
      if (swCard) {
        if (state.stopwatch.status === 'running') swCard.classList.add('active-running');
        else swCard.classList.remove('active-running');
      }

      // Target Timer Card
      const timerParts = formatTimeParts(targetRemaining);
      if (dualTimerDigits) dualTimerDigits.innerHTML = `${timerParts.base}<small id="dual-timer-millis">.${timerParts.tenths}</small>`;
      
      const targetDuration = Number(state.targetTimer.targetDurationMs) || (30 * 60 * 1000);
      const timerProgressRatio = Math.min(1, targetElapsed / targetDuration);
      if (dualTimerProgress) dualTimerProgress.style.width = `${timerProgressRatio * 100}%`;

      const timerCard = document.getElementById('dual-timer-card');
      if (state.targetTimer.status === 'finished') {
        if (dualTimerBadge) {
          dualTimerBadge.textContent = 'FINISHED';
          dualTimerBadge.className = 'dual-badge warning';
        }
        if (dualTimerDigits) dualTimerDigits.classList.add('warning');
        if (dualTimerProgress) dualTimerProgress.classList.add('warning');
        if (timerCard) timerCard.classList.add('warning-running');
        if (btnDualTimerText) btnDualTimerText.textContent = 'Restart';
      } else if (state.targetTimer.status === 'running') {
        if (dualTimerBadge) {
          dualTimerBadge.textContent = `${formatMinutesShort(targetDuration)} TARGET`;
          dualTimerBadge.className = 'dual-badge running';
        }
        if (btnDualTimerText) btnDualTimerText.textContent = 'Pause';
        if (timerCard) timerCard.classList.add('active-running');

        if (targetRemaining <= 300000) {
          if (dualTimerDigits) dualTimerDigits.classList.add('warning');
          if (dualTimerProgress) dualTimerProgress.classList.add('warning');
          if (timerCard) timerCard.classList.add('warning-running');
          if (!warned5min) {
            safeSound('warning');
            warned5min = true;
          }
        } else {
          if (dualTimerDigits) dualTimerDigits.classList.remove('warning');
          if (dualTimerProgress) dualTimerProgress.classList.remove('warning');
          if (timerCard) timerCard.classList.remove('warning-running');
        }

        if (targetRemaining <= 60000 && !warned1min) {
          safeSound('warning');
          warned1min = true;
        }

        if (targetRemaining === 0) {
          state.targetTimer.status = 'finished';
          safeSound('finish');
        }
      } else {
        if (dualTimerBadge) {
          dualTimerBadge.textContent = state.targetTimer.status === 'paused' ? 'PAUSED' : `${formatMinutesShort(targetDuration)} TARGET`;
          dualTimerBadge.className = `dual-badge ${state.targetTimer.status}`;
        }
        if (btnDualTimerText) btnDualTimerText.textContent = 'Start';
        if (timerCard) {
          timerCard.classList.remove('active-running');
          timerCard.classList.remove('warning-running');
        }
      }

      // Master Synchronization Button
      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) {
        if (dualMasterIcon) dualMasterIcon.textContent = '⏸';
        if (dualMasterText) dualMasterText.textContent = 'Pause Both';
        if (btnDualMasterToggle) btnDualMasterToggle.classList.add('running');
      } else {
        if (dualMasterIcon) dualMasterIcon.textContent = '⚡';
        if (dualMasterText) dualMasterText.textContent = 'Start Both Together';
        if (btnDualMasterToggle) btnDualMasterToggle.classList.remove('running');
      }

    } else {
      // 2. Single Mode Rendering (Stopwatch or Target Timer)
      if (singleModeView) singleModeView.style.display = 'block';
      if (dualModeView) dualModeView.style.display = 'none';

      if (state.mode === 'timer') {
        // Target Countdown Mode
        const parts = formatTimeParts(targetRemaining);
        const targetDuration = Number(state.targetTimer.targetDurationMs) || (30 * 60 * 1000);
        if (dialDigits) dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
        if (dialStatusLabel) dialStatusLabel.textContent = state.targetTimer.status === 'finished' ? 'FINISHED' : 'TARGET COUNTDOWN';
        if (dialTargetLabel) {
          dialTargetLabel.style.display = 'block';
          dialTargetLabel.textContent = `Target: ${formatTimeParts(targetDuration).base}`;
        }

        const progressRatio = Math.min(1, targetElapsed / targetDuration);
        const dashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
        if (dialProgress) dialProgress.style.strokeDashoffset = dashoffset;

        // Warnings & Finished
        if (targetRemaining <= 300000 && targetRemaining > 60000 && state.targetTimer.status === 'running') {
          if (dialDigits) dialDigits.classList.add('warning');
          if (dialProgress) dialProgress.classList.add('warning');
          if (!warned5min) {
            safeSound('warning');
            warned5min = true;
          }
        } else if (targetRemaining <= 60000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
          if (dialDigits) dialDigits.classList.add('warning');
          if (dialProgress) dialProgress.classList.add('warning');
          if (!warned1min) {
            safeSound('warning');
            warned1min = true;
          }
        } else if (targetRemaining === 0 && state.targetTimer.status === 'running') {
          state.targetTimer.status = 'finished';
          safeSound('finish');
        } else {
          if (dialDigits) dialDigits.classList.remove('warning');
          if (dialProgress) dialProgress.classList.remove('warning');
        }

        // Toggle run button text
        if (state.targetTimer.status === 'running') {
          if (btnToggleRun) btnToggleRun.classList.add('running');
          if (btnToggleText) btnToggleText.textContent = 'Pause';
        } else {
          if (btnToggleRun) btnToggleRun.classList.remove('running');
          if (btnToggleText) btnToggleText.textContent = state.targetTimer.status === 'finished' ? 'Restart' : 'Start';
        }

        // Background Concurrent Stopwatch Banner
        if (state.stopwatch.status === 'running') {
          if (concurrentStopwatchBanner) concurrentStopwatchBanner.style.display = 'flex';
          if (concurrentStopwatchTime) concurrentStopwatchTime.textContent = formatTimeParts(swElapsed).base;
        } else {
          if (concurrentStopwatchBanner) concurrentStopwatchBanner.style.display = 'none';
        }
        if (concurrentTargetBanner) concurrentTargetBanner.style.display = 'none';

      } else {
        // Stopwatch Mode
        const parts = formatTimeParts(swElapsed);
        if (dialDigits) dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
        if (dialStatusLabel) dialStatusLabel.textContent = 'STOPWATCH';
        if (dialTargetLabel) dialTargetLabel.style.display = 'none';
        if (dialDigits) dialDigits.classList.remove('warning');
        if (dialProgress) dialProgress.classList.remove('warning');

        // Continuous 60s rotating ring
        
    // Sub-Gauges (Laps, Split, Status)
    const subLapsVal = document.getElementById('sub-laps-val');
    if (subLapsVal) subLapsVal.textContent = state.laps ? state.laps.length : 0;

    const subSplitVal = document.getElementById('sub-split-val');
    if (subSplitVal) {
      if (state.laps && state.laps.length > 0) {
        const lastLap = state.laps[0];
        subSplitVal.textContent = formatTimeParts(lastLap.lapDuration).base;
      } else {
        subSplitVal.textContent = '00:00';
      }
    }

    const subStateVal = document.getElementById('sub-state-val');
    if (subStateVal) {
      const curStatus = state.mode === 'stopwatch' ? state.stopwatch.status : (state.mode === 'timer' ? state.targetTimer.status : 'DUAL');
      subStateVal.textContent = (curStatus || 'READY').toUpperCase();
    }

        const secRatio = (swElapsed % 60000) / 60000;
        if (dialProgress) dialProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - secRatio);

        // Toggle run button text
        if (state.stopwatch.status === 'running') {
          if (btnToggleRun) btnToggleRun.classList.add('running');
          if (btnToggleText) btnToggleText.textContent = 'Pause';
        } else {
          if (btnToggleRun) btnToggleRun.classList.remove('running');
          if (btnToggleText) btnToggleText.textContent = 'Start';
        }

        // Background Concurrent Target Timer Banner
        if (state.targetTimer.status === 'running') {
          if (concurrentTargetBanner) concurrentTargetBanner.style.display = 'flex';
          if (concurrentTargetTime) concurrentTargetTime.textContent = formatTimeParts(targetRemaining).base;
        } else {
          if (concurrentTargetBanner) concurrentTargetBanner.style.display = 'none';
        }
        if (concurrentStopwatchBanner) concurrentStopwatchBanner.style.display = 'none';
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      animationFrameId = requestAnimationFrame(updateUI);
    }
  }

  // ================= CONTROL SYNC =================
  function applyStateToControls() {
    [btnModeStopwatch, btnModeTimer, btnModeDual].forEach(b => {
      if (b) b.classList.remove('active');
    });

    if (state.mode === 'dual') {
      if (btnModeDual) btnModeDual.classList.add('active');
      if (presetsContainer) presetsContainer.style.display = 'none';
    } else if (state.mode === 'timer') {
      if (btnModeTimer) btnModeTimer.classList.add('active');
      if (presetsContainer) presetsContainer.style.display = 'block';
    } else {
      if (btnModeStopwatch) btnModeStopwatch.classList.add('active');
      if (presetsContainer) presetsContainer.style.display = 'none';
    }

    const targetDuration = Number(state.targetTimer.targetDurationMs) || (30 * 60 * 1000);
    const mins = Math.round(targetDuration / 60000);
    presetChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.mins) === mins);
    });
    dualChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.mins) === mins);
    });

    if (settingDualActive) settingDualActive.checked = state.allowDualActive !== false;
    if (settingSound) settingSound.checked = state.soundEnabled !== false;
    if (settingFloating) settingFloating.checked = state.floatingWidgetEnabled !== false;
    if (settingFloatingDisplayMode) settingFloatingDisplayMode.value = state.floatingWidgetDisplayMode || 'coding_only';
    if (window.soundFX) window.soundFX.enabled = settingSound ? settingSound.checked : true;
  }

  async function switchMode(newMode) {
    if (state.mode === newMode) return;
    safeSound('tick');
    const res = await sendMessage({ type: 'SET_MODE', mode: newMode });
    if (res && res.state) {
      state = normalizeState(res.state);
      applyStateToControls();
    }
  }

  if (btnModeStopwatch) btnModeStopwatch.addEventListener('click', () => switchMode('stopwatch'));
  if (btnModeTimer) btnModeTimer.addEventListener('click', () => switchMode('timer'));
  if (btnModeDual) btnModeDual.addEventListener('click', () => switchMode('dual'));

  // ================= SINGLE MODE CONTROLS =================
  if (btnToggleRun) {
    btnToggleRun.addEventListener('click', async () => {
      safeSound('start');

      if (state.mode === 'timer') {
        if (state.targetTimer.status === 'running') {
          safeSound('pause');
          const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
          if (res && res.state) state = normalizeState(res.state);
        } else {
          const res = await sendMessage({ type: 'START', target: 'timer' });
          if (res && res.state) state = normalizeState(res.state);
        }
      } else {
        if (state.stopwatch.status === 'running') {
          safeSound('pause');
          const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
          if (res && res.state) state = normalizeState(res.state);
        } else {
          const res = await sendMessage({ type: 'START', target: 'stopwatch' });
          if (res && res.state) state = normalizeState(res.state);
        }
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      safeSound('tick');
      warned5min = false;
      warned1min = false;
      const target = state.mode === 'timer' ? 'timer' : 'stopwatch';
      const res = await sendMessage({ type: 'RESET', target });
      if (res && res.state) state = normalizeState(res.state);
      renderLaps();
    });
  }

  if (btnLap) btnLap.addEventListener('click', () => recordLap());

  // ================= DUAL MODE CONTROLS =================
  if (btnDualMasterToggle) {
    btnDualMasterToggle.addEventListener('click', async () => {
      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';

      if (bothRunning) {
        safeSound('pause');
        const res = await sendMessage({ type: 'PAUSE', target: 'both' });
        if (res && res.state) state = normalizeState(res.state);
      } else {
        safeSound('start');
        const res = await sendMessage({ type: 'START', target: 'both' });
        if (res && res.state) state = normalizeState(res.state);
      }
    });
  }

  if (btnDualMasterReset) {
    btnDualMasterReset.addEventListener('click', async () => {
      safeSound('tick');
      warned5min = false;
      warned1min = false;
      const res = await sendMessage({ type: 'RESET', target: 'both' });
      if (res && res.state) state = normalizeState(res.state);
      renderLaps();
    });
  }

  if (btnDualSwToggle) {
    btnDualSwToggle.addEventListener('click', async () => {
      if (state.stopwatch.status === 'running') {
        safeSound('pause');
        const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
        if (res && res.state) state = normalizeState(res.state);
      } else {
        safeSound('start');
        const res = await sendMessage({ type: 'START', target: 'stopwatch' });
        if (res && res.state) state = normalizeState(res.state);
      }
    });
  }

  if (btnDualSwLap) btnDualSwLap.addEventListener('click', () => recordLap());

  if (btnDualSwReset) {
    btnDualSwReset.addEventListener('click', async () => {
      safeSound('tick');
      const res = await sendMessage({ type: 'RESET', target: 'stopwatch' });
      if (res && res.state) state = normalizeState(res.state);
      renderLaps();
    });
  }

  if (btnDualTimerToggle) {
    btnDualTimerToggle.addEventListener('click', async () => {
      if (state.targetTimer.status === 'running') {
        safeSound('pause');
        const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
        if (res && res.state) state = normalizeState(res.state);
      } else {
        safeSound('start');
        const res = await sendMessage({ type: 'START', target: 'timer' });
        if (res && res.state) state = normalizeState(res.state);
      }
    });
  }

  if (btnDualTimerReset) {
    btnDualTimerReset.addEventListener('click', async () => {
      safeSound('tick');
      warned5min = false;
      warned1min = false;
      const res = await sendMessage({ type: 'RESET', target: 'timer' });
      if (res && res.state) state = normalizeState(res.state);
    });
  }

  // Presets
  async function applyPresetMins(mins) {
    safeSound('tick');
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

  if (btnCustomTime) {
    btnCustomTime.addEventListener('click', () => {
      if (customTimeBox) {
        customTimeBox.style.display = customTimeBox.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  if (btnApplyCustom) {
    btnApplyCustom.addEventListener('click', async () => {
      const hrs = parseInt(customHours.value) || 0;
      const mins = parseInt(customMinutes.value) || 0;
      const secs = parseInt(customSeconds.value) || 0;
      const totalMs = (hrs * 3600 + mins * 60 + secs) * 1000;

      if (totalMs < 10000) {
        alert('Target duration must be at least 10 seconds.');
        return;
      }

      if (customTimeBox) customTimeBox.style.display = 'none';
      safeSound('tick');
      const res = await sendMessage({ type: 'SET_TARGET', targetDurationMs: totalMs });
      if (res && res.state) {
        state = normalizeState(res.state);
        applyStateToControls();
      }
    });
  }

  // Concurrent Banners
  if (btnConcurrentTargetPause) {
    btnConcurrentTargetPause.addEventListener('click', async () => {
      safeSound('pause');
      const res = await sendMessage({ type: 'PAUSE', target: 'timer' });
      if (res && res.state) state = normalizeState(res.state);
    });
  }

  if (btnConcurrentTargetSwitch) {
    btnConcurrentTargetSwitch.addEventListener('click', () => {
      switchMode('timer');
    });
  }

  if (btnConcurrentStopwatchPause) {
    btnConcurrentStopwatchPause.addEventListener('click', async () => {
      safeSound('pause');
      const res = await sendMessage({ type: 'PAUSE', target: 'stopwatch' });
      if (res && res.state) state = normalizeState(res.state);
    });
  }

  if (btnConcurrentStopwatchSwitch) {
    btnConcurrentStopwatchSwitch.addEventListener('click', () => {
      switchMode('stopwatch');
    });
  }

  // Laps
  async function recordLap(customLabel = null) {
    const elapsed = getStopwatchElapsed();
    if (state.stopwatch.status !== 'running' && elapsed === 0) return;
    safeSound('lap');
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
    if (lapBadge) {
      if (count > 0) {
        lapBadge.style.display = 'inline-block';
        lapBadge.textContent = count;
      } else {
        lapBadge.style.display = 'none';
      }
    }

    if (!lapsList) return;
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

  // History & Sessions
  function renderHistory() {
    const history = state.history || [];
    if (statSolvedCount) statSolvedCount.textContent = history.length;

    const totalMs = history.reduce((acc, cur) => acc + (Number(cur.durationMs) || 0), 0);
    if (statTotalTime) statTotalTime.textContent = formatMinutesShort(totalMs);

    if (!historyList) return;
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

  // Modal Log
  if (btnLogModalOpen) {
    btnLogModalOpen.addEventListener('click', () => {
      const swElapsed = getStopwatchElapsed();
      const duration = swElapsed > 0 ? swElapsed : getTargetElapsed();
      const parts = formatTimeParts(duration);
      if (modalTimeDisplay) modalTimeDisplay.textContent = parts.fullText;
      if (modalTitle) modalTitle.value = activeProblemTitle ? activeProblemTitle.value.trim() : '';
      if (modalPlatform && activePlatform) modalPlatform.value = activePlatform.value;
      if (modalDifficulty && activeDifficulty) modalDifficulty.value = activeDifficulty.value;
      if (modalNotes) modalNotes.value = '';
      if (modalLog) modalLog.style.display = 'flex';
    });
  }

  if (btnModalClose) btnModalClose.addEventListener('click', () => { if (modalLog) modalLog.style.display = 'none'; });
  if (btnModalCancel) btnModalCancel.addEventListener('click', () => { if (modalLog) modalLog.style.display = 'none'; });

  if (btnModalSave) {
    btnModalSave.addEventListener('click', async () => {
      const title = modalTitle ? modalTitle.value.trim() : 'Untitled Problem';
      const platform = modalPlatform ? modalPlatform.value : 'LeetCode';
      const difficulty = modalDifficulty ? modalDifficulty.value : 'Medium';
      const verdict = document.querySelector('input[name="verdict"]:checked')?.value || 'Solved';
      const notes = modalNotes ? modalNotes.value.trim() : '';
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

      if (modalLog) modalLog.style.display = 'none';
      safeSound('lap');

      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      const histTab = document.querySelector('.nav-tab[data-tab="history"]');
      const histContent = document.getElementById('tab-history');
      if (histTab) histTab.classList.add('active');
      if (histContent) histContent.classList.add('active');
    });
  }

  // CSV Export
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const history = state.history || [];
      if (history.length === 0) {
        alert('No sessions to export yet.');
        return;
      }

      let csv = 'ID,Date,Problem,Platform,Difficulty,Verdict,Duration (sec),Formatted Time,Notes\n';
      history.forEach(h => {
        const durSec = Math.round((Number(h.durationMs) || 0) / 1000);
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
  }

  // Clear History
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear your problem history?')) {
        const res = await sendMessage({ type: 'CLEAR_HISTORY' });
        if (res && res.state) {
          state = normalizeState(res.state);
          renderHistory();
        }
      }
    });
  }

  // Settings Events
  if (settingDualActive) {
    settingDualActive.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      state.allowDualActive = enabled;
      await sendMessage({ type: 'UPDATE_SETTINGS', allowDualActive: enabled });
    });
  }

  if (settingSound) {
    settingSound.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      if (window.soundFX) window.soundFX.enabled = enabled;
      await sendMessage({ type: 'UPDATE_SETTINGS', soundEnabled: enabled });
    });
  }

  if (settingFloating) {
    settingFloating.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await sendMessage({ type: 'UPDATE_SETTINGS', floatingWidgetEnabled: enabled });
    });
  }

  if (settingFloatingDisplayMode) {
    settingFloatingDisplayMode.addEventListener('change', async (e) => {
      await sendMessage({ type: 'UPDATE_SETTINGS', floatingWidgetDisplayMode: e.target.value });
    });
  }

  const btnOpenShortcuts = document.getElementById('btn-open-shortcuts');
  const companionSettings = document.getElementById('windows-companion-settings');
  const companionStatusLabel = document.getElementById('companion-status');
  const companionHotkeys = document.getElementById('companion-hotkeys');
  const btnShowCompanion = document.getElementById('btn-show-companion');
  const btnReconnectCompanion = document.getElementById('btn-reconnect-companion');
  const companionCornerSelect = document.getElementById('companion-corner-select');
  const companionPinnedToggle = document.getElementById('companion-pinned');
  const companionTopmostNote = document.getElementById('companion-topmost-note');
  const btnSaveCompanionPosition = document.getElementById('btn-save-companion-position');
  const btnSaveCompanionHotkeys = document.getElementById('btn-save-companion-shortcuts');
  const btnResetCompanionHotkeys = document.getElementById('btn-reset-companion-shortcuts');
  const defaultCompanionHotkeys = {
    'start-timer': 'Ctrl+Alt+1',
    'pause-timer': 'Ctrl+Alt+2',
    'record-lap': 'Ctrl+Alt+3',
    'reset-timer': 'Ctrl+Alt+4',
    'toggle-window': 'Ctrl+Alt+5'
  };
  const companionCommandLabels = {
    'start-timer': 'Start / Resume',
    'pause-timer': 'Pause',
    'record-lap': 'Lap',
    'reset-timer': 'Reset',
    'toggle-window': 'Show / Hide'
  };

  function renderCompanionStatus(companion) {
    if (!companionSettings || !companion) return;
    companionStatusLabel.textContent = companion.message || companion.status || 'Companion status unavailable';
    companionStatusLabel.dataset.status = companion.status || 'unknown';
    if (companionCornerSelect) companionCornerSelect.value = companion.corner || 'top-right';
    if (companionPinnedToggle) companionPinnedToggle.checked = Boolean(companion.pinned);
    if (companionTopmostNote) {
      companionTopmostNote.textContent = companion.status === 'connected'
        ? 'Always-on-top is active while the Windows companion is running.'
        : 'Always-on-top requires the connected Windows companion.';
    }
    companionHotkeys.replaceChildren();
    Object.entries(companionCommandLabels).forEach(([command, label]) => {
      const row = document.createElement('div');
      row.className = 'companion-hotkey-row';
      row.dataset.command = command;
      const name = document.createElement('span');
      name.className = 'companion-hotkey-name';
      name.textContent = label;
      const binding = document.createElement('input');
      binding.type = 'text';
      binding.className = 'companion-hotkey-binding';
      binding.setAttribute('aria-label', `${label} global shortcut`);
      binding.placeholder = 'Ctrl+Alt+key';
      binding.value = companion.hotkeys?.[command] ?? defaultCompanionHotkeys[command];
      const enabledLabel = document.createElement('label');
      enabledLabel.className = 'hotkey-enabled';
      const enabled = document.createElement('input');
      enabled.type = 'checkbox';
      enabled.className = 'companion-hotkey-enabled';
      enabled.checked = binding.value.length > 0;
      binding.disabled = !enabled.checked;
      enabled.addEventListener('change', () => {
        binding.disabled = !enabled.checked;
        if (!enabled.checked) binding.value = '';
        else if (!binding.value.trim()) binding.value = defaultCompanionHotkeys[command];
      });
      enabledLabel.append(enabled, document.createTextNode('On'));
      const availability = document.createElement('span');
      availability.className = 'companion-hotkey-state';
      availability.textContent = companion.status !== 'connected'
        ? 'Offline'
        : (!binding.value ? 'Off' : (companion.registered?.[command] === false ? 'Conflict' : 'Ready'));
      availability.dataset.state = availability.textContent.toLowerCase();
      row.append(name, binding, enabledLabel, availability);
      companionHotkeys.append(row);
    });
  }

  if (!isExtension && companionSettings) companionSettings.hidden = true;
  if (btnShowCompanion) {
    btnShowCompanion.addEventListener('click', async () => {
      const response = await sendMessage({ type: 'SHOW_COMPANION_WINDOW' });
      if (!response.success && companionStatusLabel) {
        companionStatusLabel.textContent = response.error || 'Connect the Windows companion first.';
      }
      if (btnSaveCompanionPosition) {
        btnSaveCompanionPosition.addEventListener('click', async () => {
          const response = await sendMessage({
            type: 'SET_COMPANION_WINDOW_SETTINGS',
            corner: companionCornerSelect?.value || 'top-right',
            pinned: Boolean(companionPinnedToggle?.checked)
          });
          companionStatusLabel.textContent = response.success
            ? 'Sending placement to the Windows companion…'
            : response.error || 'Could not save native timer placement.';
          if (!response.success) companionStatusLabel.dataset.status = 'unavailable';
        });
      }
    });
  }
  if (btnReconnectCompanion) {
    btnReconnectCompanion.addEventListener('click', async () => {
      const response = await sendMessage({ type: 'RECONNECT_COMPANION' });
      if (response.companion) renderCompanionStatus(response.companion);
      else if (companionStatusLabel) companionStatusLabel.textContent = 'Could not reconnect to the Windows companion.';
    });
  }
  if (btnResetCompanionHotkeys) {
    btnResetCompanionHotkeys.addEventListener('click', () => {
      Object.entries(defaultCompanionHotkeys).forEach(([command, shortcut]) => {
        const row = companionHotkeys.querySelector(`[data-command="${command}"]`);
        const binding = row?.querySelector('.companion-hotkey-binding');
        const enabled = row?.querySelector('.companion-hotkey-enabled');
        if (binding) {
          binding.value = shortcut;
          binding.disabled = false;
        }
        if (enabled) enabled.checked = true;
      });
      companionStatusLabel.textContent = 'Defaults loaded. Save to apply them.';
    });
  }
  if (btnSaveCompanionHotkeys) {
    btnSaveCompanionHotkeys.addEventListener('click', async () => {
      const hotkeys = {};
      for (const [command, label] of Object.entries(companionCommandLabels)) {
        const row = companionHotkeys.querySelector(`[data-command="${command}"]`);
        const enabled = row?.querySelector('.companion-hotkey-enabled')?.checked;
        const binding = row?.querySelector('.companion-hotkey-binding')?.value.trim() || '';
        if (enabled && (!binding.includes('+') || !/(ctrl|control|alt|shift|win|windows)/i.test(binding))) {
          companionStatusLabel.textContent = `Add a modifier and key for ${label}, or switch it off.`;
          companionStatusLabel.dataset.status = 'unavailable';
          row?.querySelector('.companion-hotkey-binding')?.focus();
          return;
        }
        hotkeys[command] = enabled ? binding : '';
      }
      const response = await sendMessage({ type: 'SET_COMPANION_HOTKEYS', hotkeys });
      if (!response.success) {
        companionStatusLabel.textContent = response.error || 'Could not save global shortcuts.';
        companionStatusLabel.dataset.status = 'unavailable';
      } else {
        companionStatusLabel.textContent = 'Sending shortcut changes to Windows…';
      }
    });
  }
  if (isExtension && companionSettings) {
    sendMessage({ type: 'GET_COMPANION_STATUS' }).then((response) => renderCompanionStatus(response.companion));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.algoTimerCompanionStatus) {
        renderCompanionStatus(changes.algoTimerCompanionStatus.newValue);
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.getAll) {
    chrome.commands.getAll((commands) => {
      if (chrome.runtime.lastError) {
        console.warn('Could not read keyboard shortcuts:', chrome.runtime.lastError.message);
        return;
      }
      commands.forEach((command) => {
        const label = document.getElementById(`shortcut-${command.name}`);
        if (label) label.textContent = command.shortcut || 'Not set';
      });
    });
  }

  if (btnOpenShortcuts && typeof chrome !== 'undefined' && chrome.tabs) {
    btnOpenShortcuts.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, () => {
        if (chrome.runtime.lastError) console.warn('Could not open shortcut settings:', chrome.runtime.lastError.message);
      });
    });
  }

  // Tab Navigation
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-${tabId}`);
      if (targetContent) targetContent.classList.add('active');

      if (tabId === 'laps') renderLaps();
      if (tabId === 'history') renderHistory();
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    if (activeElement?.isContentEditable || ['input', 'textarea', 'select'].includes(activeElement?.tagName?.toLowerCase())) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (state.mode === 'dual' && btnDualMasterToggle) btnDualMasterToggle.click();
      else if (btnToggleRun) btnToggleRun.click();
    } else if (e.key === 'r' || e.key === 'R') {
      if (state.mode === 'dual' && btnDualMasterReset) btnDualMasterReset.click();
      else if (btnReset) btnReset.click();
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
