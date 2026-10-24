// AlgoTimer - Background Service Worker (Manifest V3)

const DEFAULT_STATE = {
  mode: 'stopwatch', // 'stopwatch' | 'timer'
  status: 'stopped', // 'stopped' | 'running' | 'paused' | 'finished'
  startTime: null,
  elapsedBeforePause: 0,
  targetDurationMs: 30 * 60 * 1000, // Default 30 mins
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

// Initialize default state
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['algoTimerState']);
  if (!data.algoTimerState) {
    await chrome.storage.local.set({ algoTimerState: DEFAULT_STATE });
  }
  updateBadge(data.algoTimerState || DEFAULT_STATE);
});

// Periodic alarm for accurate background badge update & completion check
chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 }); // Every second when active

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timerTick') {
    const data = await chrome.storage.local.get(['algoTimerState']);
    const state = data.algoTimerState;
    if (!state || state.status !== 'running') return;

    const elapsed = Date.now() - state.startTime + state.elapsedBeforePause;

    if (state.mode === 'timer') {
      const remaining = state.targetDurationMs - elapsed;
      if (remaining <= 0) {
        // Timer Finished!
        state.status = 'finished';
        state.elapsedBeforePause = state.targetDurationMs;
        state.startTime = null;
        await chrome.storage.local.set({ algoTimerState: state });

        // Trigger Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: "⏱️ Time's Up! - AlgoTimer",
          message: `Target problem-solving time (${formatMinutes(state.targetDurationMs)}) reached!`,
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

// Format time for badge
function updateBadge(state) {
  if (!state || state.status === 'stopped') {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (state.status === 'paused') {
    chrome.action.setBadgeText({ text: 'PAUSE' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber
    return;
  }

  if (state.status === 'finished') {
    chrome.action.setBadgeText({ text: 'DONE' });
    chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' }); // Rose
    return;
  }

  const elapsed = state.status === 'running' 
    ? Date.now() - state.startTime + state.elapsedBeforePause 
    : state.elapsedBeforePause;

  let text = '';
  if (state.mode === 'timer') {
    const remainingSec = Math.max(0, Math.ceil((state.targetDurationMs - elapsed) / 1000));
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    text = mins > 0 ? `${mins}m` : `${secs}s`;
    chrome.action.setBadgeBackgroundColor({ color: remainingSec <= 300 ? '#ef4444' : '#0284c7' });
  } else {
    const totalSec = Math.floor(elapsed / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    text = mins > 99 ? `${mins}m` : `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    chrome.action.setBadgeBackgroundColor({ color: '#0284c7' }); // Sky blue
  }

  chrome.action.setBadgeText({ text });
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
        chrome.tabs.sendMessage(tab.id, { type: 'STATE_UPDATED', state }).catch(() => {
          // Tab might not have content script injected, ignore
        });
      }
    }
  } catch (err) {
    // Ignore broadcast errors
  }
}

// Handle messages from Popup or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const data = await chrome.storage.local.get(['algoTimerState']);
    let state = data.algoTimerState || DEFAULT_STATE;

    switch (message.type) {
      case 'GET_STATE': {
        sendResponse({ state });
        break;
      }

      case 'START': {
        if (state.status === 'running') break;
        state.status = 'running';
        state.startTime = Date.now();
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'PAUSE': {
        if (state.status !== 'running') break;
        state.status = 'paused';
        state.elapsedBeforePause += Date.now() - state.startTime;
        state.startTime = null;
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'RESET': {
        state.status = 'stopped';
        state.startTime = null;
        state.elapsedBeforePause = 0;
        state.laps = [];
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'SET_MODE': {
        state.mode = message.mode;
        state.status = 'stopped';
        state.startTime = null;
        state.elapsedBeforePause = 0;
        state.laps = [];
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'SET_TARGET': {
        state.targetDurationMs = message.targetDurationMs;
        if (state.mode === 'timer' && state.status !== 'running') {
          state.elapsedBeforePause = 0;
          state.status = 'stopped';
        }
        await chrome.storage.local.set({ algoTimerState: state });
        updateBadge(state);
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      case 'ADD_LAP': {
        const elapsed = state.status === 'running' 
          ? Date.now() - state.startTime + state.elapsedBeforePause 
          : state.elapsedBeforePause;
        
        const prevLapTime = state.laps.length > 0 ? state.laps[0].totalMs : 0;
        const splitMs = elapsed - prevLapTime;

        const newLap = {
          id: state.laps.length + 1,
          label: message.label || `Phase ${state.laps.length + 1}`,
          totalMs: elapsed,
          splitMs: Math.max(0, splitMs),
          timestamp: Date.now()
        };

        state.laps.unshift(newLap); // Newest first
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
        await chrome.storage.local.set({ algoTimerState: state });
        broadcastState(state);
        sendResponse({ success: true, state });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true; // Keep channel open for async response
});
