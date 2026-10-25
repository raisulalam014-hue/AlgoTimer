// AlgoTimer - Problem Solving Stopwatch & Timer UI Logic
// Supports: Resizable Anywhere Pop-Up Screen, Compact Mode, Concurrent Dual Timers, Milestones & Safe Audio

document.addEventListener('DOMContentLoaded', async () => {
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
        return { success: true, state };

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
        state.targetTimer.targetDurationMs = Number(msg.targetDurationMs) || (30 * 60 * 1000);
        state.targetDurationMs = state.targetTimer.targetDurationMs;
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

  // ================= POP UP SCREEN SYSTEM (PiP & RESIZABLE WINDOW) =================
  async function triggerPopoutPiP() {
    if ('documentPictureInPicture' in window) {
      try {
        if (window._pipWindow) {
          window._pipWindow.close();
          return;
        }

        // Request native OS Always-On-Top window
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 360,
          height: 580
        });
        window._pipWindow = pipWindow;

        // Copy styles
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

    // Fallback: standalone resizable window
    triggerPopoutWindow();
  }

  function triggerPopoutWindow() {
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url: chrome.runtime.getURL('float.html'),
        type: 'popup',
        width: 280,
        height: 180,
        focused: true
      });
    } else {
      window.open('float.html', 'AlgoTimerFloat', 'width=280,height=180,resizable=yes');
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
    if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) {
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
