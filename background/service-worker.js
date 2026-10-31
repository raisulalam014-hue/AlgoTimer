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
  floatingWidgetDisplayMode: 'coding_only', // 'coding_only' | 'running_only' | 'always'
  laps: [],
  currentProblem: {
    title: '',
    platform: 'LeetCode',
    difficulty: 'Medium'
  },
  history: []
};

// Normalize and migrate state safely ensuring all properties exist
function normalizeState(raw) {
  const state = Object.assign({}, DEFAULT_STATE, raw || {});

  if (!state.stopwatch || typeof state.stopwatch !== 'object') {
    state.stopwatch = {
      status: state.mode === 'stopwatch' ? (state.status || 'stopped') : 'stopped',
      startTime: state.mode === 'stopwatch' ? state.startTime : null,
      elapsedBeforePause: Number(state.elapsedBeforePause) || 0
    };
  } else {
    state.stopwatch = {
      status: state.stopwatch.status || 'stopped',
      startTime: state.stopwatch.startTime || null,
      elapsedBeforePause: Number(state.stopwatch.elapsedBeforePause) || 0
    };
  }

  if (!state.targetTimer || typeof state.targetTimer !== 'object') {
    state.targetTimer = {
      status: state.mode === 'timer' ? (state.status || 'stopped') : 'stopped',
      startTime: state.mode === 'timer' ? state.startTime : null,
      elapsedBeforePause: Number(state.elapsedBeforePause) || 0,
      targetDurationMs: Number(state.targetDurationMs) || (30 * 60 * 1000)
    };
  } else {
    state.targetTimer = {
      status: state.targetTimer.status || 'stopped',
      startTime: state.targetTimer.startTime || null,
      elapsedBeforePause: Number(state.targetTimer.elapsedBeforePause) || 0,
      targetDurationMs: Number(state.targetTimer.targetDurationMs) || (30 * 60 * 1000)
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
  try {
    const data = await chrome.storage.local.get(['algoTimerState']);
    const state = normalizeState(data.algoTimerState);
    await chrome.storage.local.set({ algoTimerState: state });
    updateBadge(state);
  } catch (e) {
    console.warn('onInstalled init error:', e);
  }
});

// Periodic alarm for accurate background badge update & completion check
try {
  chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 });
} catch (e) {}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timerTick') {
    try {
      const data = await chrome.storage.local.get(['algoTimerState']);
      const state = normalizeState(data.algoTimerState);

      // Target countdown completion check
      if (state.targetTimer && state.targetTimer.status === 'running') {
        const start = state.targetTimer.startTime || Date.now();
        const elapsed = (Date.now() - start) + (Number(state.targetTimer.elapsedBeforePause) || 0);
        const remaining = state.targetTimer.targetDurationMs - elapsed;

        if (remaining <= 0) {
          // Target Timer Finished!
          state.targetTimer.status = 'finished';
          state.targetTimer.elapsedBeforePause = state.targetTimer.targetDurationMs;
          state.targetTimer.startTime = null;
          syncLegacyProperties(state);
          await chrome.storage.local.set({ algoTimerState: state });

          // Trigger Notification
          if (chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: '../icons/icon128.png',
              title: "⏱️ Time's Up! - AlgoTimer",
              message: `Target problem-solving time (${formatMinutes(state.targetTimer.targetDurationMs)}) reached!`,
              priority: 2
            });
          }

          if (chrome.action) {
            chrome.action.setBadgeText({ text: 'DONE' });
            chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });
          }

          broadcastState(state);
          return;
        }
      }

      updateBadge(state);
    } catch (e) {
      console.warn('Alarm tick error:', e);
    }
  }
});

// Format time for Chrome toolbar badge
function updateBadge(state) {
  if (!state || typeof chrome === 'undefined' || !chrome.action) {
    return;
  }

  try {
    // If Target Timer is running, prioritize its countdown
    if (state.targetTimer && state.targetTimer.status === 'running') {
      const start = state.targetTimer.startTime || Date.now();
      const elapsed = (Date.now() - start) + (Number(state.targetTimer.elapsedBeforePause) || 0);
      const remainingSec = Math.max(0, Math.ceil((state.targetTimer.targetDurationMs - elapsed) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const text = String(mins > 0 ? `${mins}m` : `${secs}s`);
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: remainingSec <= 300 ? '#ef4444' : '#0284c7' });
      return;
    }

    // If Stopwatch is running
    if (state.stopwatch && state.stopwatch.status === 'running') {
      const start = state.stopwatch.startTime || Date.now();
      const elapsed = (Date.now() - start) + (Number(state.stopwatch.elapsedBeforePause) || 0);
      const totalSec = Math.floor(elapsed / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const text = String(mins > 99 ? `${mins}m` : `${mins}:${secs < 10 ? '0' : ''}${secs}`);
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
  } catch (e) {
    // Ignore badge errors
  }
}

function formatMinutes(ms) {
  const m = Math.round(ms / 60000);
  return `${m} minute${m === 1 ? '' : 's'}`;
}

// Broadcast updated state to all tabs safely consuming lastError
async function broadcastState(state) {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        chrome.tabs.sendMessage(tab.id, { type: 'STATE_UPDATED', state }, () => {
          if (chrome.runtime.lastError) {
            // Checked and consumed cleanly so Chrome never flags it as an unchecked error!
          }
        });
      }
    }
  } catch (err) {}
}

// Handle messages from Popup or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const data = await chrome.storage.local.get(['algoTimerState']);
      let state = normalizeState(data.algoTimerState);

      switch (message.type) {
        case 'GET_STATE': {
          sendResponse({ success: true, state });
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
          state.mode = message.mode;
          syncLegacyProperties(state);
          await chrome.storage.local.set({ algoTimerState: state });
          updateBadge(state);
          broadcastState(state);
          sendResponse({ success: true, state });
          break;
        }

        case 'SET_TARGET': {
          state.targetTimer.targetDurationMs = Number(message.targetDurationMs) || (30 * 60 * 1000);
          state.targetDurationMs = state.targetTimer.targetDurationMs;
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
          const start = state.stopwatch.startTime || Date.now();
          const swElapsed = state.stopwatch.status === 'running'
            ? (Date.now() - start) + (Number(state.stopwatch.elapsedBeforePause) || 0)
            : (Number(state.stopwatch.elapsedBeforePause) || 0);

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
            durationMs: Number(message.durationMs) || 0,
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
          if (message.floatingWidgetDisplayMode !== undefined) state.floatingWidgetDisplayMode = message.floatingWidgetDisplayMode;
          if (message.allowDualActive !== undefined) state.allowDualActive = message.allowDualActive;
          await chrome.storage.local.set({ algoTimerState: state });
          broadcastState(state);
          sendResponse({ success: true, state });
          break;
        }

        case 'OPEN_FLOAT_WINDOW':
        case 'OPEN_POPUP_WINDOW': {
          if (chrome.windows && chrome.windows.create) {
            chrome.windows.create({
              url: chrome.runtime.getURL('float.html'),
              type: 'popup',
              width: 280,
              height: 180,
              top: 40,
              left: 100,
              focused: true
            });
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('Service worker message handler error:', err);
      sendResponse({ error: err.message });
    }
  })();

  return true;
});
