// AlgoTimer - Background Service Worker (Manifest V3)
// Features: Zero-drift background engine, dual concurrent timer support, dynamic audio alerts, badge updates

const DEFAULT_STATE = {
  mode: 'stopwatch', // 'stopwatch' | 'timer' | 'dual'
  allowDualActive: true, // dynamic feature: both stopwatch and target countdown can run concurrently!

  // Dedicated Stopwatch Engine
  stopwatch: {
    status: 'stopped', // 'stopped' | 'running' | 'paused'
    startTime: null,
    elapsedBeforePause: 0
  },

  // Dedicated Target Timer Engine
  targetTimer: {
    status: 'stopped', // 'stopped' | 'running' | 'paused' | 'finished'
    startTime: null,
    elapsedBeforePause: 0,
    targetDurationMs: 30 * 60 * 1000 // Default 30 mins
  },

  // Legacy compatibility fields
  status: 'stopped',
  startTime: null,
  elapsedBeforePause: 0,
  targetDurationMs: 30 * 60 * 1000,

  soundEnabled: true,
  floatingWidgetEnabled: true,
  laps: [],
  currentProblem: {
    title: '',
    platform: 'LeetCode',
    difficulty: 'Medium'
  },
  history: []
};

// Normalize and migrate state to ensure both engines exist
function normalizeState(raw) {
  const state = Object.assign({}, DEFAULT_STATE, raw || {});

  if (!state.stopwatch) {
    state.stopwatch = {
      status: state.mode === 'stopwatch' ? (state.status || 'stopped') : 'stopped',
      startTime: state.mode === 'stopwatch' ? state.startTime : null,
      elapsedBeforePause: state.mode === 'stopwatch' ? (state.elapsedBeforePause || 0) : 0
    };
  }

  if (!state.targetTimer) {
    state.targetTimer = {
      status: state.mode === 'timer' ? (state.status || 'stopped') : 'stopped',
      startTime: state.mode === 'timer' ? state.startTime : null,
      elapsedBeforePause: state.mode === 'timer' ? (state.elapsedBeforePause || 0) : 0,
      targetDurationMs: state.targetDurationMs || (30 * 60 * 1000)
    };
  }

  if (state.allowDualActive === undefined) {
    state.allowDualActive = true;
  }

  syncLegacyProperties(state);
  return state;
}

// Keep legacy fields in sync for backward compatibility
function syncLegacyProperties(state) {
  if (state.mode === 'timer') {
    state.status = state.targetTimer.status;
    state.startTime = state.targetTimer.startTime;
    state.elapsedBeforePause = state.targetTimer.elapsedBeforePause;
  } else if (state.mode === 'dual') {
    const isRunning = state.stopwatch.status === 'running' || state.targetTimer.status === 'running';
    const isPaused = !isRunning && (state.stopwatch.status === 'paused' || state.targetTimer.status === 'paused');
    state.status = isRunning ? 'running' : (isPaused ? 'paused' : 'stopped');
    state.startTime = state.stopwatch.startTime || state.targetTimer.startTime;
    state.elapsedBeforePause = state.stopwatch.elapsedBeforePause;
  } else {
    state.status = state.stopwatch.status;
    state.startTime = state.stopwatch.startTime;
    state.elapsedBeforePause = state.stopwatch.elapsedBeforePause;
  }
  state.targetDurationMs = state.targetTimer.targetDurationMs;
}

// Initialize default state
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['algoTimerState']);
  const state = normalizeState(data.algoTimerState);
  await chrome.storage.local.set({ algoTimerState: state });
  updateBadge(state);
});

// Periodic alarm for accurate background badge update & completion check
chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 }); // Every second when active

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timerTick') {
    const data = await chrome.storage.local.get(['algoTimerState']);
    const state = normalizeState(data.algoTimerState);

    // Target countdown completion check
    if (state.targetTimer && state.targetTimer.status === 'running') {
      const elapsed = Date.now() - state.targetTimer.startTime + state.targetTimer.elapsedBeforePause;
      const remaining = state.targetTimer.targetDurationMs - elapsed;

      if (remaining <= 0) {
        // Target Timer Finished!
        state.targetTimer.status = 'finished';
        state.targetTimer.elapsedBeforePause = state.targetTimer.targetDurationMs;
        state.targetTimer.startTime = null;
        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });

        // Trigger Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: "⏱️ Time's Up! - AlgoTimer",
          message: `Target problem-solving time (${formatMinutes(state.targetTimer.targetDurationMs)}) reached!`,
          priority: 2
        });

        // Set Done Badge
        chrome.action.setBadgeText({ text: 'DONE' });
        chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });

        // Broadcast to tabs
        broadcastState(state);
        return;
      }
    }

    updateBadge(state);
  }
});

// Format time for Chrome toolbar badge
function updateBadge(state) {
  if (!state) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  // If Target Timer is running, prioritize its countdown
  if (state.targetTimer && state.targetTimer.status === 'running') {
    const elapsed = Date.now() - state.targetTimer.startTime + state.targetTimer.elapsedBeforePause;
    const remainingSec = Math.max(0, Math.ceil((state.targetTimer.targetDurationMs - elapsed) / 1000));
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const text = mins > 0 ? `${mins}m` : `${secs}s`;
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: remainingSec <= 300 ? '#ef4444' : '#0284c7' });
    return;
  }

  // If Stopwatch is running
  if (state.stopwatch && state.stopwatch.status === 'running') {
    const elapsed = Date.now() - state.stopwatch.startTime + state.stopwatch.elapsedBeforePause;
    const totalSec = Math.floor(elapsed / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const text = mins > 99 ? `${mins}m` : `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });
    return;
  }

  // Paused status
  if ((state.stopwatch && state.stopwatch.status === 'paused') || 
      (state.targetTimer && state.targetTimer.status === 'paused')) {
    chrome.action.setBadgeText({ text: 'PAUSE' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    return;
  }

  // Finished status
  if (state.targetTimer && state.targetTimer.status === 'finished') {
    chrome.action.setBadgeText({ text: 'DONE' });
    chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });
    return;
  }

  chrome.action.setBadgeText({ text: '' });
}

function formatMinutes(ms) {
  const m = Math.round(ms / 60000);
  return `${m} minute${m === 1 ? '' : 's'}`;
}

// Broadcast updated state to all tabs & content scripts
async function broadcastState(state) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'STATE_UPDATED', state }).catch(() => {});
      }
    }
  } catch (err) {}
}

// Handle messages from Popup or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const data = await chrome.storage.local.get(['algoTimerState']);
    let state = normalizeState(data.algoTimerState);

    switch (message.type) {
      case 'GET_STATE': {
        sendResponse({ state });
        break;
      }

      case 'START': {
        const target = message.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

        // Start Stopwatch
        if (target === 'both' || target === 'stopwatch') {
          if (state.stopwatch.status !== 'running') {
            state.stopwatch.status = 'running';
            state.stopwatch.startTime = Date.now();
          }
          // If mutual exclusion is explicitly forced
          if (!state.allowDualActive && target === 'stopwatch' && state.targetTimer.status === 'running') {
            state.targetTimer.status = 'paused';
            state.targetTimer.elapsedBeforePause += Date.now() - state.targetTimer.startTime;
            state.targetTimer.startTime = null;
          }
        }

        // Start Target Timer
        if (target === 'both' || target === 'timer') {
          if (state.targetTimer.status !== 'running') {
            if (state.targetTimer.status === 'finished') {
              state.targetTimer.elapsedBeforePause = 0;
            }
            state.targetTimer.status = 'running';
            state.targetTimer.startTime = Date.now();
          }
          // If mutual exclusion is explicitly forced
          if (!state.allowDualActive && target === 'timer' && state.stopwatch.status === 'running') {
            state.stopwatch.status = 'paused';
            state.stopwatch.elapsedBeforePause += Date.now() - state.stopwatch.startTime;
            state.stopwatch.startTime = null;
          }
        }

        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'PAUSE': {
        const target = message.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

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

        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'RESET': {
        const target = message.target || (state.mode === 'dual' ? 'both' : (state.mode === 'timer' ? 'timer' : 'stopwatch'));

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

        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'SET_MODE': {
        state.mode = message.mode; // 'stopwatch' | 'timer' | 'dual'
        // CRITICAL: We do NOT stop or reset timers when switching modes!
        // Both can stay running or paused dynamically.
        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'SET_TARGET': {
        state.targetTimer.targetDurationMs = message.targetDurationMs;
        state.targetDurationMs = message.targetDurationMs;
        if (state.targetTimer.status !== 'running') {
          state.targetTimer.elapsedBeforePause = 0;
          state.targetTimer.status = 'stopped';
          state.targetTimer.startTime = null;
        }
        syncLegacyProperties(state);
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'ADD_LAP': {
        const swElapsed = state.stopwatch.status === 'running'
          ? Date.now() - state.stopwatch.startTime + state.stopwatch.elapsedBeforePause
          : state.stopwatch.elapsedBeforePause;

        const prevLapTime = state.laps.length > 0 ? state.laps[0].totalMs : 0;
        const splitMs = swElapsed - prevLapTime;

        const newLap = {
          id: state.laps.length + 1,
          label: message.label || `Phase ${state.laps.length + 1}`,
          totalMs: swElapsed,
          splitMs: Math.max(0, splitMs),
          timestamp: Date.now()
        };

        state.laps.unshift(newLap);
        await chrome.storage.local.set({ algoTimerState: state });
        broadcastState(state);
        sendResponse({ success: true, state, lap: newLap });
        break;
      }

      case 'LOG_PROBLEM': {
        const session = {
          id: Date.now().toString(),
          title: message.title || 'Untitled Problem',
          platform: message.platform || 'LeetCode',
          difficulty: message.difficulty || 'Medium',
          durationMs: message.durationMs || 0,
          verdict: message.verdict || 'Solved',
          notes: message.notes || '',
          timestamp: new Date().toISOString()
        };
        state.history = state.history || [];
        state.history.unshift(session);
        await chrome.storage.local.set({ algoTimerState: state });
        broadcastState(state);
        sendResponse({ success: true, session, state });
        break;
      }

      case 'CLEAR_HISTORY': {
        state.history = [];
        await chrome.storage.local.set({ algoTimerState: state });
        sendResponse({ success: true, state });
        break;
      }

      case 'UPDATE_SETTINGS': {
        if (message.soundEnabled !== undefined) state.soundEnabled = message.soundEnabled;
        if (message.floatingWidgetEnabled !== undefined) state.floatingWidgetEnabled = message.floatingWidgetEnabled;
        if (message.allowDualActive !== undefined) state.allowDualActive = message.allowDualActive;
        await chrome.storage.local.set({ algoTimerState: state });
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true;
});