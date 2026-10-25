// AlgoTimer - In-Page Problem Solving Floating Widget Content Script
// Supports: Draggable overlay, Dual Timer concurrent displays, Pop Out Picture-in-Picture floating screen

(function () {
  if (window.__algotimer_injected) return;
  window.__algotimer_injected = true;

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
    floatingWidgetEnabled: true
  };

  let animFrameId = null;
  let isMinimized = false;

  // Auto-detect problem title based on current platform
  function detectProblemInfo() {
    const host = window.location.hostname;
    let title = '';
    let platform = 'Other';

    if (host.includes('leetcode.com')) {
      platform = 'LeetCode';
      const el = document.querySelector('div[data-cy="question-title"]') || 
                 document.querySelector('div.text-title-large') ||
                 document.querySelector('a.hover\\:text-blue-s');
      if (el) title = el.textContent.trim();
      else {
        const match = window.location.pathname.match(/\/problems\/([^/]+)/);
        if (match) title = match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } else if (host.includes('codeforces.com')) {
      platform = 'Codeforces';
      const el = document.querySelector('.problem-statement .title');
      if (el) title = el.textContent.trim();
    } else if (host.includes('hackerrank.com')) {
      platform = 'HackerRank';
      const el = document.querySelector('.challenge-title') || document.querySelector('h1');
      if (el) title = el.textContent.trim();
    } else if (host.includes('neetcode.io')) {
      platform = 'NeetCode';
      const el = document.querySelector('h1') || document.querySelector('.text-2xl');
      if (el) title = el.textContent.trim();
    } else if (host.includes('geeksforgeeks.org')) {
      platform = 'GeeksforGeeks';
      const el = document.querySelector('.problem-tab__name') || document.querySelector('h1');
      if (el) title = el.textContent.trim();
    }

    return { title: title || 'Problem Solving Session', platform };
  }

  // Format milliseconds to MM:SS or HH:MM:SS
  function formatTime(ms, showTenths = false) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);

    const pad = (n) => (n < 10 ? '0' + n : n);

    let base = '';
    if (hrs > 0) {
      base = `${hrs}:${pad(mins)}:${pad(secs)}`;
    } else {
      base = `${pad(mins)}:${pad(secs)}`;
    }

    return showTenths ? `${base}.${tenths}` : base;
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
    return s;
  }

  // Create and inject floating widget
  const root = document.createElement('div');
  root.id = 'algotimer-floating-root';

  const widget = document.createElement('div');
  widget.className = 'algotimer-widget';

  const probInfo = detectProblemInfo();

  widget.innerHTML = `
    <!-- Header (Draggable) -->
    <div class="algotimer-header" id="algotimer-drag-handle">
      <div class="algotimer-title">
        <span class="algotimer-icon"></span>
        <span>AlgoTimer</span>
      </div>
      <div class="algotimer-header-actions">
        <button class="algotimer-btn-icon pip-btn" id="algotimer-btn-pip" title="Pop Up Screen: Float Always-on-Top over other apps">🗗</button>
        <button class="algotimer-btn-icon" id="algotimer-btn-min" title="Minimize">−</button>
        <button class="algotimer-btn-icon" id="algotimer-btn-close" title="Hide">✕</button>
      </div>
    </div>

    <!-- Minimized pill view -->
    <div class="algotimer-mini-content" id="algotimer-mini-drag">
      <span class="algotimer-icon"></span>
      <span class="algotimer-mini-clock" id="algotimer-mini-time">00:00</span>
      <button class="algotimer-mini-btn" id="algotimer-mini-toggle" title="Start/Pause">▶</button>
      <button class="algotimer-mini-btn" id="algotimer-btn-expand" title="Expand">⤢</button>
    </div>

    <!-- Body -->
    <div class="algotimer-body">
      <div class="algotimer-problem-tag" id="algotimer-problem-name" title="${probInfo.title}">
        ${probInfo.title}
      </div>
      <div class="algotimer-mode-badge" id="algotimer-mode-tag">
        STOPWATCH MODE
      </div>

      <!-- Single clock view -->
      <div class="algotimer-clock" id="algotimer-clock-display">
        00:00
      </div>

      <!-- Dual clocks view -->
      <div class="algotimer-dual-clocks" id="algotimer-dual-clocks-display" style="display: none;">
        <div class="algotimer-dual-row">
          <span class="algotimer-subtag">⏱️ Elapsed</span>
          <span class="algotimer-dual-time" id="algotimer-dual-sw-time">00:00</span>
        </div>
        <div class="algotimer-dual-row">
          <span class="algotimer-subtag">⏳ Target</span>
          <span class="algotimer-dual-time" id="algotimer-dual-timer-time">30:00</span>
        </div>
      </div>

      <div class="algotimer-controls">
        <button class="algotimer-btn algotimer-btn-primary" id="algotimer-btn-play">
          ▶ Start
        </button>
        <button class="algotimer-btn" id="algotimer-btn-lap" title="Split / Lap">
          🏁 Lap
        </button>
        <button class="algotimer-btn" id="algotimer-btn-reset" title="Reset">
          ↺
        </button>
      </div>
    </div>
  `;

  root.appendChild(widget);
  document.body.appendChild(root);

  // References
  const clockDisplay = document.getElementById('algotimer-clock-display');
  const dualClocksDisplay = document.getElementById('algotimer-dual-clocks-display');
  const dualSwTime = document.getElementById('algotimer-dual-sw-time');
  const dualTimerTime = document.getElementById('algotimer-dual-timer-time');
  const miniTime = document.getElementById('algotimer-mini-time');
  const playBtn = document.getElementById('algotimer-btn-play');
  const miniToggle = document.getElementById('algotimer-mini-toggle');
  const lapBtn = document.getElementById('algotimer-btn-lap');
  const resetBtn = document.getElementById('algotimer-btn-reset');
  const modeTag = document.getElementById('algotimer-mode-tag');
  const minBtn = document.getElementById('algotimer-btn-min');
  const expandBtn = document.getElementById('algotimer-btn-expand');
  const closeBtn = document.getElementById('algotimer-btn-close');
  const pipBtn = document.getElementById('algotimer-btn-pip');

  // Draggable logic
  function setupDraggable(handle) {
    let isDragging = false;
    let startX, startY, origX, origY;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = root.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newX = Math.max(10, Math.min(window.innerWidth - root.offsetWidth - 10, origX + dx));
        let newY = Math.max(10, Math.min(window.innerHeight - root.offsetHeight - 10, origY + dy));

        root.style.left = `${newX}px`;
        root.style.top = `${newY}px`;
        root.style.right = 'auto';
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  setupDraggable(document.getElementById('algotimer-drag-handle'));
  setupDraggable(document.getElementById('algotimer-mini-drag'));

  // Minimize / Expand / Close
  minBtn.addEventListener('click', () => {
    isMinimized = true;
    widget.classList.add('minimized');
  });

  expandBtn.addEventListener('click', () => {
    isMinimized = false;
    widget.classList.remove('minimized');
  });

  closeBtn.addEventListener('click', () => {
    root.style.display = 'none';
  });

  // Pop Up Screen (Document PiP or window popup)
  pipBtn.addEventListener('click', async () => {
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 300,
          height: 250
        });

        // Copy styles
        [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(el => {
          pipWindow.document.head.appendChild(el.cloneNode(true));
        });

        pipWindow.document.body.appendChild(widget);
        pipWindow.addEventListener('pagehide', () => {
          root.appendChild(widget);
        });
        return;
      } catch (err) {
        console.warn('PiP from widget failed:', err);
      }
    }
    // Fallback: request popup via background
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP_WINDOW' });
  });

  // Calculate elapsed
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

  // Animation frame clock ticker
  function tick() {
    const swElapsed = getStopwatchElapsed();
    const targetRemaining = getTargetRemaining();

    if (state.mode === 'dual') {
      modeTag.textContent = '⚡ DUAL MODE (BOTH)';
      clockDisplay.style.display = 'none';
      dualClocksDisplay.style.display = 'flex';

      const swFormatted = formatTime(swElapsed);
      const timerFormatted = formatTime(targetRemaining);

      dualSwTime.textContent = swFormatted;
      dualTimerTime.textContent = timerFormatted;
      miniTime.textContent = `${swFormatted} | ${timerFormatted}`;

      if (targetRemaining <= 300000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
        dualTimerTime.classList.add('warning');
      } else {
        dualTimerTime.classList.remove('warning');
      }

      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) {
        playBtn.textContent = '⏸ Pause Both';
        miniToggle.textContent = '⏸';
      } else {
        playBtn.textContent = '⚡ Start Both';
        miniToggle.textContent = '▶';
      }

    } else if (state.mode === 'timer') {
      modeTag.textContent = 'TARGET TIMER';
      clockDisplay.style.display = 'block';
      dualClocksDisplay.style.display = 'none';

      const formatted = formatTime(targetRemaining);
      clockDisplay.textContent = formatted;
      miniTime.textContent = formatted;

      if (targetRemaining <= 300000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
        clockDisplay.classList.add('warning');
      } else {
        clockDisplay.classList.remove('warning');
      }

      if (state.targetTimer.status === 'running') {
        playBtn.textContent = '⏸ Pause';
        miniToggle.textContent = '⏸';
      } else {
        playBtn.textContent = '▶ Start';
        miniToggle.textContent = '▶';
      }

    } else {
      // Stopwatch mode
      modeTag.textContent = 'STOPWATCH MODE';
      clockDisplay.style.display = 'block';
      dualClocksDisplay.style.display = 'none';
      clockDisplay.classList.remove('warning');

      const formatted = formatTime(swElapsed);
      clockDisplay.textContent = formatted;
      miniTime.textContent = formatted;

      if (state.stopwatch.status === 'running') {
        playBtn.textContent = '⏸ Pause';
        miniToggle.textContent = '⏸';
      } else {
        playBtn.textContent = '▶ Start';
        miniToggle.textContent = '▶';
      }
    }

    animFrameId = requestAnimationFrame(tick);
  }

  tick();

  // Button actions
  playBtn.addEventListener('click', () => {
    if (state.mode === 'dual') {
      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) chrome.runtime.sendMessage({ type: 'PAUSE', target: 'both' });
      else chrome.runtime.sendMessage({ type: 'START', target: 'both' });
    } else if (state.mode === 'timer') {
      if (state.targetTimer.status === 'running') chrome.runtime.sendMessage({ type: 'PAUSE', target: 'timer' });
      else chrome.runtime.sendMessage({ type: 'START', target: 'timer' });
    } else {
      if (state.stopwatch.status === 'running') chrome.runtime.sendMessage({ type: 'PAUSE', target: 'stopwatch' });
      else chrome.runtime.sendMessage({ type: 'START', target: 'stopwatch' });
    }
  });

  miniToggle.addEventListener('click', () => {
    playBtn.click();
  });

  lapBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ADD_LAP' });
  });

  resetBtn.addEventListener('click', () => {
    const target = state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch');
    chrome.runtime.sendMessage({ type: 'RESET', target });
  });

  // Sync state from background
  function syncState(newState) {
    if (!newState) return;
    state = normalizeState(newState);
    if (state.floatingWidgetEnabled === false) {
      root.style.display = 'none';
    } else if (root.style.display === 'none') {
      root.style.display = 'block';
    }
  }

  // Initial fetch
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.state) {
      syncState(response.state);
    }
  });

  // State update listener
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATED') {
      syncState(msg.state);
    }
  });
})();
