// AlgoTimer - In-Page Problem Solving Floating Widget Content Script

(function () {
  if (window.__algotimer_injected) return;
  window.__algotimer_injected = true;

  let state = {
    mode: 'stopwatch',
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

  // Create and inject the floating widget element
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
        <button class="algotimer-btn-icon" id="algotimer-btn-min" title="Minimize">−</button>
        <button class="algotimer-btn-icon" id="algotimer-btn-close" title="Hide (Reopen from extension)">✕</button>
      </div>
    </div>

    <!-- Minimized pill view -->
    <div class="algotimer-mini-content" id="algotimer-mini-drag">
      <span class="algotimer-icon"></span>
      <span class="algotimer-mini-clock" id="algotimer-mini-time">00:00</span>
      <button class="algotimer-mini-btn" id="algotimer-mini-toggle" title="Start/Pause">▶</button>
      <button class="algotimer-mini-btn" id="algotimer-btn-expand" title="Expand">⛶</button>
    </div>

    <!-- Body -->
    <div class="algotimer-body">
      <div class="algotimer-problem-tag" id="algotimer-problem-name" title="${probInfo.title}">
        ${probInfo.title}
      </div>
      <div class="algotimer-mode-badge" id="algotimer-mode-tag">
        STOPWATCH MODE
      </div>
      <div class="algotimer-clock" id="algotimer-clock-display">
        00:00
      </div>
      <div class="algotimer-controls">
        <button class="algotimer-btn algotimer-btn-primary" id="algotimer-btn-play">
          ▶ Start
        </button>
        <button class="algotimer-btn" id="algotimer-btn-lap" title="Split / Lap">
          🚩 Lap
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
  const miniTime = document.getElementById('algotimer-mini-time');
  const playBtn = document.getElementById('algotimer-btn-play');
  const miniToggle = document.getElementById('algotimer-mini-toggle');
  const lapBtn = document.getElementById('algotimer-btn-lap');
  const resetBtn = document.getElementById('algotimer-btn-reset');
  const modeTag = document.getElementById('algotimer-mode-tag');
  const minBtn = document.getElementById('algotimer-btn-min');
  const expandBtn = document.getElementById('algotimer-btn-expand');
  const closeBtn = document.getElementById('algotimer-btn-close');

  // Dragging logic
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

  // Minimizing logic
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

  // Calculate current elapsed ms
  function getElapsed() {
    if (state.status === 'running') {
      return Date.now() - state.startTime + state.elapsedBeforePause;
    }
    return state.elapsedBeforePause;
  }

  // Animation frame clock ticker
  function tick() {
    const elapsed = getElapsed();

    if (state.mode === 'timer') {
      modeTag.textContent = 'TARGET TIMER';
      const remaining = Math.max(0, state.targetDurationMs - elapsed);
      const formatted = formatTime(remaining);
      clockDisplay.textContent = formatted;
      miniTime.textContent = formatted;

      if (remaining <= 300000 && remaining > 0 && state.status === 'running') {
        clockDisplay.classList.add('warning');
      } else {
        clockDisplay.classList.remove('warning');
      }
    } else {
      modeTag.textContent = 'STOPWATCH MODE';
      clockDisplay.classList.remove('warning');
      const formatted = formatTime(elapsed);
      clockDisplay.textContent = formatted;
      miniTime.textContent = formatted;
    }

    // Status classes
    if (state.status === 'paused') {
      clockDisplay.classList.add('paused');
    } else {
      clockDisplay.classList.remove('paused');
    }

    // Play/Pause button updates
    if (state.status === 'running') {
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.add('algotimer-btn-primary');
      miniToggle.textContent = '⏸';
    } else {
      playBtn.textContent = '▶ Start';
      playBtn.classList.add('algotimer-btn-primary');
      miniToggle.textContent = '▶';
    }

    animFrameId = requestAnimationFrame(tick);
  }

  // Start ticker
  tick();

  // Button actions
  playBtn.addEventListener('click', () => {
    if (state.status === 'running') {
      chrome.runtime.sendMessage({ type: 'PAUSE' });
    } else {
      chrome.runtime.sendMessage({ type: 'START' });
    }
  });

  miniToggle.addEventListener('click', () => {
    if (state.status === 'running') {
      chrome.runtime.sendMessage({ type: 'PAUSE' });
    } else {
      chrome.runtime.sendMessage({ type: 'START' });
    }
  });

  lapBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ADD_LAP' });
  });

  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET' });
  });

  // Sync state from background
  function syncState(newState) {
    if (!newState) return;
    state = newState;
    if (state.floatingWidgetEnabled === false) {
      root.style.display = 'none';
    } else if (root.style.display === 'none') {
      root.style.display = 'block';
    }
  }

  // Initial state fetch
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
