// AlgoTimer - In-Page Problem Solving Floating Widget Content Script
// Supports: Free Resizing, 4-Corner Docking, Dual Real-Time Timers (Stopwatch + Countdown)

(function () {
  if (window.__algotimer_injected) return;
  window.__algotimer_injected = true;

  // Global State
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
  const CORNERS = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
  const SIZES = ['normal', 'compact', 'mini'];
  
  // Stored preferences
  let currentCorner = 'top-right';
  let currentSize = 'normal';
  let customWidth = null;

  // Safe Chrome Message Sender
  function safeSendMessage(msg, callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            // Service worker asleep or no listener; safe to ignore
          } else if (callback && response) {
            callback(response);
          }
        });
      } catch (e) {
        // Safe catch
      }
    }
  }

  // Load Saved Placement & Size from Storage
  function loadPreferences() {
    try {
      const savedCorner = localStorage.getItem('algotimer_corner');
      if (savedCorner && CORNERS.includes(savedCorner)) currentCorner = savedCorner;

      const savedSize = localStorage.getItem('algotimer_size');
      if (savedSize && SIZES.includes(savedSize)) currentSize = savedSize;

      const savedWidth = localStorage.getItem('algotimer_width');
      if (savedWidth) customWidth = parseInt(savedWidth, 10);
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get(['widgetCorner', 'widgetSize', 'widgetWidth'], (res) => {
          if (res) {
            if (res.widgetCorner && CORNERS.includes(res.widgetCorner)) currentCorner = res.widgetCorner;
            if (res.widgetSize && SIZES.includes(res.widgetSize)) currentSize = res.widgetSize;
            if (res.widgetWidth) customWidth = res.widgetWidth;
            applyPositionAndSize();
          }
        });
      } catch (e) {}
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem('algotimer_corner', currentCorner);
      localStorage.setItem('algotimer_size', currentSize);
      if (customWidth) localStorage.setItem('algotimer_width', customWidth);
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({
          widgetCorner: currentCorner,
          widgetSize: currentSize,
          widgetWidth: customWidth
        });
      } catch (e) {}
    }
  }

  // Auto-detect problem title based on current platform
  function detectProblemInfo() {
    const host = window.location.hostname;
    let title = '';
    let platform = 'Coding';

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

  // Build and Inject Floating Root DOM
  const root = document.createElement('div');
  root.id = 'algotimer-floating-root';

  const widget = document.createElement('div');
  widget.className = 'algotimer-widget';
  widget.id = 'algotimer-widget-card';

  const probInfo = detectProblemInfo();

  widget.innerHTML = `
    <!-- Header (Draggable) -->
    <div class="algotimer-header" id="algotimer-drag-handle">
      <div class="algotimer-title">
        <span class="algotimer-icon"></span>
        <span id="algotimer-brand-text">AlgoTimer</span>
      </div>
      <div class="algotimer-header-actions">
        <!-- Corner Dock Cycler (↗, ↘, ↙, ↖) -->
        <button class="algotimer-btn-icon" id="algotimer-btn-corner" title="Dock to next corner (Top-Right, Bottom-Right, Bottom-Left, Top-Left)">
          <span class="algotimer-corner-badge" id="algotimer-corner-indicator">↗</span>
        </button>

        <!-- Size Toggle (Normal -> Compact -> Mini) -->
        <button class="algotimer-btn-icon" id="algotimer-btn-size" title="Toggle Size (Normal, Compact, Mini)">
          🗜️
        </button>

        <!-- Pop Out Window / PiP -->
        <button class="algotimer-btn-icon pip-btn" id="algotimer-btn-pip" title="Always-on-top PiP Float Screen">
          ⤢
        </button>

        <!-- Hide / Close -->
        <button class="algotimer-btn-icon" id="algotimer-btn-close" title="Hide timer">
          ✕
        </button>
      </div>
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

      <!-- Dual clocks view (Stopwatch + Countdown Active) -->
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
          Lap
        </button>
        <button class="algotimer-btn" id="algotimer-btn-reset" title="Reset">
          ↺
        </button>
      </div>
    </div>

    <!-- Resizing Corner Grip Handle -->
    <div class="algotimer-resize-grip" id="algotimer-resize-grip" title="Drag corner to freely resize smaller or larger"></div>
  `;

  root.appendChild(widget);
  document.body.appendChild(root);

  // References
  const clockDisplay = document.getElementById('algotimer-clock-display');
  const dualClocksDisplay = document.getElementById('algotimer-dual-clocks-display');
  const dualSwTime = document.getElementById('algotimer-dual-sw-time');
  const dualTimerTime = document.getElementById('algotimer-dual-timer-time');
  const playBtn = document.getElementById('algotimer-btn-play');
  const lapBtn = document.getElementById('algotimer-btn-lap');
  const resetBtn = document.getElementById('algotimer-btn-reset');
  const modeTag = document.getElementById('algotimer-mode-tag');
  const cornerBtn = document.getElementById('algotimer-btn-corner');
  const cornerIndicator = document.getElementById('algotimer-corner-indicator');
  const sizeBtn = document.getElementById('algotimer-btn-size');
  const pipBtn = document.getElementById('algotimer-btn-pip');
  const closeBtn = document.getElementById('algotimer-btn-close');
  const resizeGrip = document.getElementById('algotimer-resize-grip');

  const cornerSymbols = {
    'top-right': '↗ TR',
    'bottom-right': '↘ BR',
    'bottom-left': '↙ BL',
    'top-left': '↖ TL'
  };

  // Apply Position & Size to Elements
  function applyPositionAndSize() {
    // Clear root corner classes
    CORNERS.forEach(c => root.classList.remove(`corner-${c}`));
    root.classList.add(`corner-${currentCorner}`);

    if (cornerIndicator) {
      cornerIndicator.textContent = cornerSymbols[currentCorner] || '↗';
    }

    // Apply size attribute
    widget.setAttribute('data-size', currentSize);

    if (customWidth) {
      widget.style.width = `${customWidth}px`;
    } else {
      widget.style.width = '';
    }
  }

  // Load and apply initial stored preferences
  loadPreferences();
  applyPositionAndSize();

  // Corner Cycle Button
  cornerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = CORNERS.indexOf(currentCorner);
    currentCorner = CORNERS[(idx + 1) % CORNERS.length];
    
    // Clear manual coordinate overrides if any
    root.style.top = '';
    root.style.bottom = '';
    root.style.left = '';
    root.style.right = '';

    applyPositionAndSize();
    savePreferences();
  });

  // Size Preset Cycle Button
  sizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = SIZES.indexOf(currentSize);
    currentSize = SIZES[(idx + 1) % SIZES.length];
    customWidth = null; // reset manual drag width on preset click
    applyPositionAndSize();
    savePreferences();
  });

  // Corner Drag-to-Resize Handle Logic
  (function setupResizing() {
    let isResizing = false;
    let startX, startW;

    resizeGrip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startW = widget.offsetWidth;

      const onMouseMove = (ev) => {
        if (!isResizing) return;
        const dx = ev.clientX - startX;
        let newW = Math.max(140, Math.min(420, startW + dx));
        widget.style.width = `${newW}px`;
        customWidth = newW;

        // Auto-adapt size tier based on width
        if (newW < 180) {
          widget.setAttribute('data-size', 'mini');
          currentSize = 'mini';
        } else if (newW < 230) {
          widget.setAttribute('data-size', 'compact');
          currentSize = 'compact';
        } else {
          widget.setAttribute('data-size', 'normal');
          currentSize = 'normal';
        }
      };

      const onMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          savePreferences();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  })();

  // Draggable logic for Header
  (function setupDraggable() {
    let isDragging = false;
    let startX, startY, origX, origY;

    const handle = document.getElementById('algotimer-drag-handle');

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = root.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;

      // Switch to manual pixel positioning
      CORNERS.forEach(c => root.classList.remove(`corner-${c}`));

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newX = Math.max(10, Math.min(window.innerWidth - root.offsetWidth - 10, origX + dx));
        let newY = Math.max(10, Math.min(window.innerHeight - root.offsetHeight - 10, origY + dy));

        root.style.left = `${newX}px`;
        root.style.top = `${newY}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          // Check if near any of the 4 corners for snap-docking
          const rect = root.getBoundingClientRect();
          const midX = window.innerWidth / 2;
          const midY = window.innerHeight / 2;

          if (rect.top < 60 && rect.right > window.innerWidth - 60) {
            currentCorner = 'top-right';
            root.style.left = '';
            root.style.top = '';
            applyPositionAndSize();
          } else if (rect.top < 60 && rect.left < 60) {
            currentCorner = 'top-left';
            root.style.left = '';
            root.style.top = '';
            applyPositionAndSize();
          } else if (rect.bottom > window.innerHeight - 60 && rect.right > window.innerWidth - 60) {
            currentCorner = 'bottom-right';
            root.style.left = '';
            root.style.top = '';
            applyPositionAndSize();
          } else if (rect.bottom > window.innerHeight - 60 && rect.left < 60) {
            currentCorner = 'bottom-left';
            root.style.left = '';
            root.style.top = '';
            applyPositionAndSize();
          } else {
            // Save nearest corner label
            const isRight = rect.left + rect.width / 2 > midX;
            const isBottom = rect.top + rect.height / 2 > midY;
            if (isRight && !isBottom) currentCorner = 'top-right';
            else if (!isRight && !isBottom) currentCorner = 'top-left';
            else if (isRight && isBottom) currentCorner = 'bottom-right';
            else currentCorner = 'bottom-left';
            if (cornerIndicator) cornerIndicator.textContent = cornerSymbols[currentCorner] || '↗';
          }
          savePreferences();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  })();

  // Close / Hide button
  closeBtn.addEventListener('click', () => {
    root.style.display = 'none';
  });

  // Pop Up Screen (Document PiP or window popup)
  pipBtn.addEventListener('click', async () => {
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 280,
          height: 180
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
    // Fallback: request standalone popup window via background
    safeSendMessage({ type: 'OPEN_POPUP_WINDOW' });
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

  // Animation frame clock ticker: smoothly updates stopwatch and countdown
  function tick() {
    const swElapsed = getStopwatchElapsed();
    const targetRemaining = getTargetRemaining();

    if (state.mode === 'dual') {
      modeTag.textContent = '⚡ DUAL (BOTH ACTIVE)';
      clockDisplay.style.display = 'none';
      dualClocksDisplay.style.display = 'flex';

      const swFormatted = formatTime(swElapsed);
      const timerFormatted = formatTime(targetRemaining);

      dualSwTime.textContent = swFormatted;
      dualTimerTime.textContent = timerFormatted;

      if (targetRemaining <= 300000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
        dualTimerTime.classList.add('warning');
      } else {
        dualTimerTime.classList.remove('warning');
      }

      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) {
        playBtn.textContent = '⏸ Pause Both';
      } else {
        playBtn.textContent = '▶ Start Both';
      }

    } else if (state.mode === 'timer') {
      modeTag.textContent = 'TARGET COUNTDOWN';
      clockDisplay.style.display = 'block';
      dualClocksDisplay.style.display = 'none';

      const formatted = formatTime(targetRemaining);
      clockDisplay.textContent = formatted;

      if (targetRemaining <= 300000 && targetRemaining > 0 && state.targetTimer.status === 'running') {
        clockDisplay.classList.add('warning');
      } else {
        clockDisplay.classList.remove('warning');
      }

      if (state.targetTimer.status === 'running') {
        playBtn.textContent = '⏸ Pause';
      } else {
        playBtn.textContent = '▶ Start';
      }

    } else {
      // Stopwatch mode
      modeTag.textContent = 'STOPWATCH MODE';
      clockDisplay.style.display = 'block';
      dualClocksDisplay.style.display = 'none';
      clockDisplay.classList.remove('warning');

      const formatted = formatTime(swElapsed);
      clockDisplay.textContent = formatted;

      if (state.stopwatch.status === 'running') {
        playBtn.textContent = '⏸ Pause';
      } else {
        playBtn.textContent = '▶ Start';
      }
    }

    animFrameId = requestAnimationFrame(tick);
  }

  tick();

  // Button actions
  playBtn.addEventListener('click', () => {
    if (state.mode === 'dual') {
      const bothRunning = state.stopwatch.status === 'running' && state.targetTimer.status === 'running';
      if (bothRunning) safeSendMessage({ type: 'PAUSE', target: 'both' });
      else safeSendMessage({ type: 'START', target: 'both' });
    } else if (state.mode === 'timer') {
      if (state.targetTimer.status === 'running') safeSendMessage({ type: 'PAUSE', target: 'timer' });
      else safeSendMessage({ type: 'START', target: 'timer' });
    } else {
      if (state.stopwatch.status === 'running') safeSendMessage({ type: 'PAUSE', target: 'stopwatch' });
      else safeSendMessage({ type: 'START', target: 'stopwatch' });
    }
  });

  lapBtn.addEventListener('click', () => {
    safeSendMessage({ type: 'ADD_LAP' });
  });

  resetBtn.addEventListener('click', () => {
    const target = state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch');
    safeSendMessage({ type: 'RESET', target });
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
  safeSendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.state) {
      syncState(response.state);
    }
  });

  // State update listener
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'STATE_UPDATED') {
        syncState(msg.state);
      }
    });
  }
})();
