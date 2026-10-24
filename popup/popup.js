// AlgoTimer - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const btnModeStopwatch = document.getElementById('btn-mode-stopwatch');
  const btnModeTimer = document.getElementById('btn-mode-timer');
  const presetsContainer = document.getElementById('presets-container');
  const presetChips = document.querySelectorAll('.preset-chip[data-mins]');
  const btnCustomTime = document.getElementById('btn-custom-time');
  const customTimeBox = document.getElementById('custom-time-box');
  const btnApplyCustom = document.getElementById('btn-apply-custom');
  const customHours = document.getElementById('custom-hours');
  const customMinutes = document.getElementById('custom-minutes');
  const customSeconds = document.getElementById('custom-seconds');

  const dialDigits = document.getElementById('dial-digits');
  const dialMillis = document.getElementById('dial-millis');
  const dialProgress = document.getElementById('dial-progress');
  const dialStatusLabel = document.getElementById('dial-status-label');
  const dialTargetLabel = document.getElementById('dial-target-label');

  const btnToggleRun = document.getElementById('btn-toggle-run');
  const btnToggleText = document.getElementById('btn-toggle-text');
  const btnReset = document.getElementById('btn-reset');
  const btnLap = document.getElementById('btn-lap');
  const lapBadge = document.getElementById('lap-badge');

  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  const lapsList = document.getElementById('laps-list');
  const lapPhaseBtns = document.querySelectorAll('.lap-phase-btn');

  const historyList = document.getElementById('history-list');
  const statSolvedCount = document.getElementById('stat-solved-count');
  const statTotalTime = document.getElementById('stat-total-time');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnClearHistory = document.getElementById('btn-clear-history');

  const settingSound = document.getElementById('setting-sound');
  const settingFloating = document.getElementById('setting-floating');

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

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 86; // r = 86 => ~540.35
  dialProgress.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;

  // Local state cache
  let state = {
    mode: 'stopwatch',
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

  // Safe Chrome message wrapper (handles standalone preview browser vs extension)
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
        // Mock fallback for browser preview
        resolve(handleMockMessage(msg));
      }
    });
  }

  // Mock message handler for local preview
  function handleMockMessage(msg) {
    switch (msg.type) {
      case 'GET_STATE': return { state };
      case 'START':
        state.status = 'running';
        state.startTime = Date.now();
        return { success: true, state };
      case 'PAUSE':
        state.status = 'paused';
        state.elapsedBeforePause += Date.now() - state.startTime;
        state.startTime = null;
        return { success: true, state };
      case 'RESET':
        state.status = 'stopped';
        state.startTime = null;
        state.elapsedBeforePause = 0;
        state.laps = [];
        return { success: true, state };
      case 'SET_MODE':
        state.mode = msg.mode;
        state.status = 'stopped';
        state.startTime = null;
        state.elapsedBeforePause = 0;
        state.laps = [];
        return { success: true, state };
      case 'SET_TARGET':
        state.targetDurationMs = msg.targetDurationMs;
        if (state.mode === 'timer') state.elapsedBeforePause = 0;
        return { success: true, state };
      case 'ADD_LAP': {
        const elapsed = state.status === 'running' 
          ? Date.now() - state.startTime + state.elapsedBeforePause 
          : state.elapsedBeforePause;
        const prevLapTime = state.laps.length > 0 ? state.laps[0].totalMs : 0;
        const splitMs = Math.max(0, elapsed - prevLapTime);
        const lap = {
          id: state.laps.length + 1,
          label: msg.label || `Phase ${state.laps.length + 1}`,
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
      default: return { success: true, state };
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

  // Get current elapsed
  function getElapsed() {
    if (state.status === 'running') {
      return Date.now() - state.startTime + state.elapsedBeforePause;
    }
    return state.elapsedBeforePause;
  }

  // Main UI render loop
  function updateUI() {
    const elapsed = getElapsed();

    // Mode specific displays
    if (state.mode === 'timer') {
      const remaining = Math.max(0, state.targetDurationMs - elapsed);
      const parts = formatTimeParts(remaining);
      dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
      dialStatusLabel.textContent = state.status === 'finished' ? 'FINISHED' : 'TARGET COUNTDOWN';
      dialTargetLabel.style.display = 'block';
      dialTargetLabel.textContent = `Target: ${formatTimeParts(state.targetDurationMs).base}`;

      // Progress bar offset
      const progressRatio = Math.min(1, elapsed / state.targetDurationMs);
      const dashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
      dialProgress.style.strokeDashoffset = dashoffset;

      // Warnings
      if (remaining <= 300000 && remaining > 60000 && state.status === 'running') {
        dialDigits.classList.add('warning');
        dialProgress.classList.add('warning');
        if (!warned5min && window.soundFX) {
          window.soundFX.warning();
          warned5min = true;
        }
      } else if (remaining <= 60000 && remaining > 0 && state.status === 'running') {
        dialDigits.classList.add('warning');
        dialProgress.classList.add('warning');
        if (!warned1min && window.soundFX) {
          window.soundFX.warning();
          warned1min = true;
        }
      } else if (remaining === 0 && state.status === 'running') {
        // Completed!
        state.status = 'finished';
        if (window.soundFX) window.soundFX.finish();
      } else {
        dialDigits.classList.remove('warning');
        dialProgress.classList.remove('warning');
      }
    } else {
      // Stopwatch Mode
      const parts = formatTimeParts(elapsed);
      dialDigits.innerHTML = `${parts.base}<small id="dial-millis">.${parts.tenths}</small>`;
      dialStatusLabel.textContent = 'STOPWATCH';
      dialTargetLabel.style.display = 'none';
      dialDigits.classList.remove('warning');
      dialProgress.classList.remove('warning');

      // Continuous 60s rotating ring
      const cycleMs = 60000;
      const cycleProgress = (elapsed % cycleMs) / cycleMs;
      dialProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - cycleProgress);
    }

    // Toggle button state
    if (state.status === 'running') {
      btnToggleRun.classList.add('running');
      btnToggleText.textContent = 'Pause';
      btnToggleRun.querySelector('svg').innerHTML = `
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      `;
      dialDigits.classList.remove('paused');
    } else if (state.status === 'paused') {
      btnToggleRun.classList.remove('running');
      btnToggleText.textContent = 'Resume';
      btnToggleRun.querySelector('svg').innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      dialDigits.classList.add('paused');
    } else {
      btnToggleRun.classList.remove('running');
      btnToggleText.textContent = 'Start';
      btnToggleRun.querySelector('svg').innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      dialDigits.classList.remove('paused');
    }

    animationFrameId = requestAnimationFrame(updateUI);
  }

  // Load and apply state
  async function refreshState() {
    const res = await sendMessage({ type: 'GET_STATE' });
    if (res && res.state) {
      state = res.state;
      applyStateToControls();
      renderLaps();
      renderHistory();
    }
  }

  function applyStateToControls() {
    if (state.mode === 'timer') {
      btnModeTimer.classList.add('active');
      btnModeStopwatch.classList.remove('active');
      presetsContainer.style.display = 'block';

      // Highlight active preset chip
      const targetMins = Math.round(state.targetDurationMs / 60000);
      let matched = false;
      presetChips.forEach(chip => {
        if (parseInt(chip.dataset.mins) === targetMins) {
          chip.classList.add('active');
          matched = true;
        } else {
          chip.classList.remove('active');
        }
      });
      if (!matched) {
        btnCustomTime.classList.add('active');
      } else {
        btnCustomTime.classList.remove('active');
      }
    } else {
      btnModeStopwatch.classList.add('active');
      btnModeTimer.classList.remove('active');
      presetsContainer.style.display = 'none';
      customTimeBox.style.display = 'none';
    }

    if (state.soundEnabled !== undefined) {
      settingSound.checked = state.soundEnabled;
      if (window.soundFX) window.soundFX.enabled = state.soundEnabled;
    }
    if (state.floatingWidgetEnabled !== undefined) {
      settingFloating.checked = state.floatingWidgetEnabled;
    }
  }

  // Navigation Tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Mode Switchers
  btnModeStopwatch.addEventListener('click', async () => {
    if (state.mode === 'stopwatch') return;
    if (window.soundFX) window.soundFX.tick();
    const res = await sendMessage({ type: 'SET_MODE', mode: 'stopwatch' });
    if (res && res.state) state = res.state;
    applyStateToControls();
    renderLaps();
  });

  btnModeTimer.addEventListener('click', async () => {
    if (state.mode === 'timer') return;
    if (window.soundFX) window.soundFX.tick();
    const res = await sendMessage({ type: 'SET_MODE', mode: 'timer' });
    if (res && res.state) state = res.state;
    applyStateToControls();
    renderLaps();
  });

  // Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const mins = parseInt(chip.dataset.mins);
      if (window.soundFX) window.soundFX.tick();
      warned5min = false;
      warned1min = false;
      const res = await sendMessage({
        type: 'SET_TARGET',
        targetDurationMs: mins * 60 * 1000
      });
      if (res && res.state) state = res.state;
      applyStateToControls();
    });
  });

  // Custom Time Toggle & Apply
  btnCustomTime.addEventListener('click', () => {
    customTimeBox.style.display = customTimeBox.style.display === 'none' ? 'flex' : 'none';
  });

  btnApplyCustom.addEventListener('click', async () => {
    const h = parseInt(customHours.value) || 0;
    const m = parseInt(customMinutes.value) || 0;
    const s = parseInt(customSeconds.value) || 0;
    const totalMs = (h * 3600 + m * 60 + s) * 1000;

    if (totalMs <= 0) return;
    if (window.soundFX) window.soundFX.tick();

    warned5min = false;
    warned1min = false;
    const res = await sendMessage({ type: 'SET_TARGET', targetDurationMs: totalMs });
    if (res && res.state) state = res.state;
    customTimeBox.style.display = 'none';
    applyStateToControls();
  });

  // Play / Pause Toggle
  btnToggleRun.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    if (state.status === 'running') {
      const res = await sendMessage({ type: 'PAUSE' });
      if (res && res.state) state = res.state;
    } else {
      const res = await sendMessage({ type: 'START' });
      if (res && res.state) state = res.state;
    }
  });

  // Reset Button
  btnReset.addEventListener('click', async () => {
    if (window.soundFX) window.soundFX.tick();
    warned5min = false;
    warned1min = false;
    const res = await sendMessage({ type: 'RESET' });
    if (res && res.state) state = res.state;
    renderLaps();
  });

  // Lap Split Button
  async function recordLap(customLabel = null) {
    if (state.status !== 'running' && state.elapsedBeforePause === 0) return;
    if (window.soundFX) window.soundFX.lap();
    const res = await sendMessage({ type: 'ADD_LAP', label: customLabel });
    if (res && res.state) {
      state = res.state;
      renderLaps();
    }
  }

  btnLap.addEventListener('click', () => recordLap());

  // Phase Buttons (Laps tab)
  lapPhaseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      recordLap(btn.dataset.phase);
    });
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

  // History & Session Logging
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

  // Open Problem Log Modal
  btnLogModalOpen.addEventListener('click', () => {
    const elapsed = getElapsed();
    const parts = formatTimeParts(elapsed);
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
    const durationMs = getElapsed();

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
      state = res.state;
      renderHistory();
    }

    modalLog.style.display = 'none';
    if (window.soundFX) window.soundFX.lap();

    // Auto-switch to history tab to see saved session
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
        state = res.state;
        renderHistory();
      }
    }
  });

  // Settings
  settingSound.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    if (window.soundFX) window.soundFX.enabled = enabled;
    await sendMessage({ type: 'UPDATE_SETTINGS', soundEnabled: enabled });
  });

  settingFloating.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await sendMessage({ type: 'UPDATE_SETTINGS', floatingWidgetEnabled: enabled });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      btnToggleRun.click();
    } else if (e.key === 'r' || e.key === 'R') {
      btnReset.click();
    } else if (e.key === 'l' || e.key === 'L') {
      recordLap();
    } else if (e.key === 'm' || e.key === 'M') {
      if (state.mode === 'stopwatch') btnModeTimer.click();
      else btnModeStopwatch.click();
    }
  });

  // Listen for storage changes from background or other tabs
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.algoTimerState) {
        state = changes.algoTimerState.newValue;
        applyStateToControls();
        renderLaps();
        renderHistory();
      }
    });
  }

  // Initial Load
  await refreshState();
  updateUI();
});
