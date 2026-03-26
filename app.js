// ===== State =====
const DEFAULT_SETTINGS = {
  autoBreak: false,
  autoPomodoro: false,
  longBreakInterval: 4,
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

let settings = { ...DEFAULT_SETTINGS };
let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
let timeLeft = settings.pomodoro * 60; // seconds
let timerInterval = null;
let isRunning = false;
let pomodoroCount = 0;
let tasks = [];
let activeTaskId = null;
let estPomoInput = 1;
let dailyStats = {}; // { 'YYYY-MM-DD': { pomodoros: 0, minutes: 0, tasks: 0 } }

// Per-mode custom durations (set by the picker, persisted)
let modeDurations = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
};

// ===== Platform Detection =====
const isElectron = !!(window.electronAPI);

// ===== DOM Elements =====
const timerDisplay = document.getElementById('timerDisplay');
const timePicker = document.getElementById('timePicker');
const pickerValue = document.getElementById('pickerValue');
const timerActionBtn = document.getElementById('timerActionBtn');
const pomoNumber = document.getElementById('pomoNumber');
const pomoMessage = document.getElementById('pomoMessage');
const modeTabs = document.querySelectorAll('.mode-tab');
const pinBtn = document.getElementById('pinBtn');
const settingsBtn = document.getElementById('settingsBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const reportBtn = document.getElementById('reportBtn'); // Desktop
const mobileReportBtn = document.getElementById('mobileReportBtn'); // Mobile
const reportModal = document.getElementById('reportModal');
const closeReportBtn = document.getElementById('closeReportBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskForm = document.getElementById('addTaskForm');
const taskInput = document.getElementById('taskInput');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const taskList = document.getElementById('taskList');
const estMinus = document.getElementById('estMinus');
const estPlus = document.getElementById('estPlus');
const estValue = document.getElementById('estValue');
const tasksMenuBtn = document.getElementById('tasksMenuBtn');
const tasksDropdown = document.getElementById('tasksDropdown');
const clearFinishedBtn = document.getElementById('clearFinishedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

// ===== Init =====
function init() {
  if (isElectron) {
    document.body.classList.add('is-electron');
  }
  loadSettings();
  loadTasks();
  updatePickerDisplay();
  renderTasks();
  updatePinButton();
  setupEventListeners();
  setupTimePicker();
  updateTitle();
}

// ===== Timer Logic =====
function resetTimer() {
  timeLeft = modeDurations[currentMode] * 60;
  updateTimerDisplay();
  updateTitle();
}

function startTimer() {
  if (isRunning) return;

  // Save the current picker value as the duration
  timeLeft = modeDurations[currentMode] * 60;

  isRunning = true;
  timerActionBtn.textContent = '停止';
  timerActionBtn.classList.add('running');

  // Switch from picker to countdown display
  timePicker.style.display = 'none';
  timerDisplay.style.display = 'block';
  updateTimerDisplay();
  updateTray(true);

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = 0;
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      timerActionBtn.textContent = '开始';
      timerActionBtn.classList.remove('running');
      updateTray(false);
      onTimerComplete();
      return;
    }
    updateTimerDisplay();
    updateTitle();
    updateTray(true);
  }, 1000);
}

function stopTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  timerActionBtn.textContent = '开始';
  timerActionBtn.classList.remove('running');

  // Switch back to picker
  timerDisplay.style.display = 'none';
  timePicker.style.display = 'flex';
  updatePickerDisplay();
  updateTitle();
  updateTray(false);
}

function onTimerComplete() {
  playAlarm();
  playCompleteAnimation();

  // Show picker again after animation
  setTimeout(() => {
    timerDisplay.style.display = 'none';
    timePicker.style.display = 'flex';
  }, 3000);

  if (currentMode === 'pomodoro') {
    pomodoroCount++;
    updatePomoCounter();
    
    // Update daily stats
    const today = getTodayDateString();
    initDailyStats(today);
    dailyStats[today].pomodoros++;
    dailyStats[today].minutes += modeDurations['pomodoro'];
    saveStats();
    
    // History event
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const taskName = activeTask ? activeTask.name : '专注';
    addHistoryEvent('pomodoro', `完成专注 - ${taskName}`);

    // Increment active task's done count
    if (activeTaskId) {
      const task = tasks.find((t) => t.id === activeTaskId);
      if (task) {
        task.donePomo = (task.donePomo || 0) + 1;
        saveTasks();
        renderTasks();
      }
    }

    // Notify
    if (isElectron) {
      window.electronAPI.showNotification('🍅 番茄完成！', `第 ${pomodoroCount} 个番茄已完成，休息一下吧！`);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍅 番茄完成！', { body: `第 ${pomodoroCount} 个番茄已完成，休息一下吧！` });
    }

    // Auto switch to break
    if (pomodoroCount % settings.longBreakInterval === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }

    if (settings.autoBreak) {
      setTimeout(() => startTimer(), 3500);
    }
  } else {
    // Break completed
    if (isElectron) {
      window.electronAPI.showNotification('⏰ 休息结束！', '准备好开始下一个番茄了吗？');
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ 休息结束！', { body: '准备好开始下一个番茄了吗？' });
    }

    switchMode('pomodoro');

    if (settings.autoPomodoro) {
      setTimeout(() => startTimer(), 3500);
    }
  }
}

function switchMode(mode) {
  if (isRunning) stopTimer();
  currentMode = mode;
  document.body.setAttribute('data-mode', mode);

  modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  updatePomoMessage();
  updatePickerDisplay();
  updateTitle();
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
}

function updatePickerDisplay() {
  const mins = modeDurations[currentMode];
  pickerValue.textContent = `${String(mins).padStart(2, '0')}:00`;
}

function updateTitle() {
  if (isRunning) {
    document.title = `${formatTime(timeLeft)} - ${getModeLabel()}`;
  } else {
    document.title = `番茄时钟 - ${getModeLabel()}`;
  }
}

function getModeLabel() {
  return currentMode === 'pomodoro'
    ? '🍅 专注'
    : currentMode === 'shortBreak'
    ? '☕ 短休息'
    : '🌿 长休息';
}

function getModeLabelShort() {
  return currentMode === 'pomodoro' ? '专注' : currentMode === 'shortBreak' ? '短休息' : '长休息';
}

function updateTray(running) {
  if (isElectron) {
    window.electronAPI.updateTrayTime(formatTime(timeLeft), running, getModeLabel());
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updatePomoCounter() {
  pomoNumber.textContent = `#${pomodoroCount + 1}`;
}

function updatePomoMessage() {
  if (currentMode === 'pomodoro') {
    pomoMessage.textContent = '准备开始专注！';
  } else if (currentMode === 'shortBreak') {
    pomoMessage.textContent = '休息一下吧！';
  } else {
    pomoMessage.textContent = '好好放松一下！';
  }
}

// ===== Complete Animation =====
function playCompleteAnimation() {
  document.body.classList.add('timer-complete');
  setTimeout(() => {
    document.body.classList.remove('timer-complete');
  }, 3000);
}

// ===== Scrollable Time Picker =====
function setupTimePicker() {
  let startY = 0;
  let startValue = 0;
  let isDragging = false;

  const pickerLeft = document.getElementById('pickerLeft');
  const pickerRight = document.getElementById('pickerRight');

  function clampValue(val) {
    return Math.max(1, Math.min(60, val));
  }

  function getCurrentMinutes() {
    return modeDurations[currentMode];
  }

  function setMinutes(val) {
    modeDurations[currentMode] = clampValue(val);
    updatePickerDisplay();
    saveSettings();
  }

  // Left/Right arrow clicks
  const PICKER_STEPS = [1, 3, 5, 10, 15, 20, 25, 30, 45, 60];

  pickerLeft.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isRunning) return;
    const current = getCurrentMinutes();
    let nextVal = PICKER_STEPS[PICKER_STEPS.length - 1];
    for (let i = PICKER_STEPS.length - 1; i >= 0; i--) {
      if (PICKER_STEPS[i] < current) {
        nextVal = PICKER_STEPS[i];
        break;
      }
    }
    setMinutes(nextVal);
  });

  pickerRight.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isRunning) return;
    const current = getCurrentMinutes();
    let nextVal = PICKER_STEPS[0];
    for (let i = 0; i < PICKER_STEPS.length; i++) {
      if (PICKER_STEPS[i] > current) {
        nextVal = PICKER_STEPS[i];
        break;
      }
    }
    setMinutes(nextVal);
  });

  // Drag on the number itself
  function onDragStart(y) {
    if (isRunning) return;
    isDragging = true;
    startY = y;
    startValue = getCurrentMinutes();
    timePicker.classList.add('dragging');
  }

  function onDragMove(y) {
    if (!isDragging) return;
    const delta = startY - y;
    const step = Math.round(delta / 15);
    setMinutes(startValue + step);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    timePicker.classList.remove('dragging');
  }

  // Mouse events on picker value
  pickerValue.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onDragStart(e.clientY);
  });
  document.addEventListener('mousemove', (e) => onDragMove(e.clientY));
  document.addEventListener('mouseup', () => onDragEnd());

  // Touch events (iPad/iOS)
  pickerValue.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onDragStart(e.touches[0].clientY);
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (isDragging) {
      e.preventDefault();
      onDragMove(e.touches[0].clientY);
    }
  }, { passive: false });
  document.addEventListener('touchend', () => onDragEnd());

  // Mouse wheel on the picker area
  timePicker.addEventListener('wheel', (e) => {
    if (isRunning) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setMinutes(getCurrentMinutes() + direction);
  }, { passive: false });
}

// ===== Alarm Sound =====
function playAlarm() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, i) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    const startTime = audioCtx.currentTime + i * 0.2;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.7);
  });

  setTimeout(() => {
    const audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((freq, i) => {
      const oscillator = audioCtx2.createOscillator();
      const gainNode = audioCtx2.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx2.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      const startTime = audioCtx2.currentTime + i * 0.2;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.6);
    });
  }, 1500);
}

// ===== Task Management =====
function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task) => {
    const el = document.createElement('div');
    el.className = `task-item${task.completed ? ' completed' : ''}${task.id === activeTaskId ? ' active' : ''}`;
    el.dataset.id = task.id;
    el.innerHTML = `
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
      <div class="task-info" data-id="${task.id}">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-pomos">${task.donePomo || 0}/${task.estPomo} 🍅</div>
      </div>
      <button class="task-delete" data-id="${task.id}" title="删除">✕</button>
    `;
    taskList.appendChild(el);
  });
}

function addTask(name, estPomo) {
  const task = { id: Date.now().toString(), name, estPomo, donePomo: 0, completed: false };
  tasks.push(task);
  if (!activeTaskId) activeTaskId = task.id;
  saveTasks();
  renderTasks();
}

function toggleTaskComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) { 
    task.completed = !task.completed; 
    
    // Update stats if completed
    if (task.completed) {
      const today = getTodayDateString();
      initDailyStats(today);
      dailyStats[today].tasks++;
      saveStats();
      addHistoryEvent('task', `完成任务 - ${task.name}`);
    } else {
      // Reverted completion
      const today = getTodayDateString();
      if (dailyStats[today] && dailyStats[today].tasks > 0) {
        dailyStats[today].tasks--;
        saveStats();
      }
    }
    
    saveTasks(); 
    renderTasks(); 
  }
}

function setActiveTask(id) {
  activeTaskId = id;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (activeTaskId === id) activeTaskId = tasks.length > 0 ? tasks[0].id : null;
  saveTasks();
  renderTasks();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Persistence =====
function loadSettings() {
  try {
    const saved = localStorage.getItem('fanqie-settings');
    if (saved) {
      const data = JSON.parse(saved);
      settings = { ...DEFAULT_SETTINGS, ...data };
    }
    // Initialize modeDurations from custom settings on boot
    modeDurations.pomodoro = settings.pomodoroDuration;
    modeDurations.shortBreak = settings.shortBreakDuration;
    modeDurations.longBreak = settings.longBreakDuration;
  } catch (e) { console.error('Failed to load settings:', e); }
}

function saveSettings() {
  try {
    localStorage.setItem('fanqie-settings', JSON.stringify({
      ...settings
    }));
  } catch (e) { console.error('Failed to save settings:', e); }
}

function loadTasks() {
  try {
    const saved = localStorage.getItem('fanqie-tasks');
    if (saved) {
      const data = JSON.parse(saved);
      tasks = data.tasks || [];
      activeTaskId = data.activeTaskId || null;
      pomodoroCount = data.pomodoroCount || 0;
    }
  } catch (e) { console.error('Failed to load tasks:', e); }
  updatePomoCounter();
}

function saveTasks() {
  try {
    localStorage.setItem('fanqie-tasks', JSON.stringify({ tasks, activeTaskId, pomodoroCount }));
  } catch (e) { console.error('Failed to save tasks:', e); }
}

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function initDailyStats(dateStr) {
  if (!dailyStats[dateStr]) {
    dailyStats[dateStr] = { pomodoros: 0, minutes: 0, tasks: 0, history: [] };
  } else if (!dailyStats[dateStr].history) {
    dailyStats[dateStr].history = [];
  }
}

function addHistoryEvent(type, title) {
  const today = getTodayDateString();
  initDailyStats(today);
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  dailyStats[today].history.push({ time: timeStr, type, title });
  saveStats();
}

function loadStats() {
  try {
    const saved = localStorage.getItem('fanqie-stats');
    if (saved) {
      dailyStats = JSON.parse(saved);
    }
  } catch (e) { console.error('Failed to load stats:', e); }
}

function saveStats() {
  try {
    localStorage.setItem('fanqie-stats', JSON.stringify(dailyStats));
  } catch (e) { console.error('Failed to save stats:', e); }
}

// ===== Pin/AlwaysOnTop =====
async function updatePinButton() {
  if (!isElectron) return;
  try {
    const isTop = await window.electronAPI.getAlwaysOnTop();
    pinBtn.classList.toggle('active', isTop);
  } catch (e) { pinBtn.classList.add('active'); }
}

// ===== Settings UI =====
function openSettings() {
  document.getElementById('settingAutoBreak').checked = settings.autoBreak;
  document.getElementById('settingAutoPomodoro').checked = settings.autoPomodoro;
  document.getElementById('settingLongBreakInterval').value = settings.longBreakInterval;
  
  document.getElementById('settingPomodoro').value = settings.pomodoroDuration;
  document.getElementById('settingShortBreak').value = settings.shortBreakDuration;
  document.getElementById('settingLongBreak').value = settings.longBreakDuration;

  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

function applySettings() {
  settings.autoBreak = document.getElementById('settingAutoBreak').checked;
  settings.autoPomodoro = document.getElementById('settingAutoPomodoro').checked;
  settings.longBreakInterval = parseInt(document.getElementById('settingLongBreakInterval').value) || 4;
  
  settings.pomodoroDuration = parseInt(document.getElementById('settingPomodoro').value) || 25;
  settings.shortBreakDuration = parseInt(document.getElementById('settingShortBreak').value) || 5;
  settings.longBreakDuration = parseInt(document.getElementById('settingLongBreak').value) || 15;

  // Update current durations to match new defaults
  modeDurations.pomodoro = settings.pomodoroDuration;
  modeDurations.shortBreak = settings.shortBreakDuration;
  modeDurations.longBreak = settings.longBreakDuration;

  saveSettings();
  closeSettings();
  
  if (!isRunning) {
    updatePickerDisplay();
    timeLeft = modeDurations[currentMode] * 60;
  }
}

// ===== Report UI =====
function openReport() {
  loadStats();
  renderReport();
  reportModal.style.display = 'flex';
}

function closeReport() {
  reportModal.style.display = 'none';
}

function renderReport() {
  const todayStr = getTodayDateString();
  const todayData = dailyStats[todayStr] || { pomodoros: 0, minutes: 0, tasks: 0 };

  // 1. Today Stats
  document.getElementById('todayPomos').textContent = todayData.pomodoros;
  document.getElementById('todayMinutes').textContent = todayData.minutes;
  document.getElementById('todayTasks').textContent = todayData.tasks;

  // 2. Total Summary & Average Calc
  let totalPomos = 0, totalMins = 0, totalTasks = 0;
  const days = Object.keys(dailyStats);
  const totalDays = days.length;
  
  days.forEach(date => {
    totalPomos += dailyStats[date].pomodoros || 0;
    totalMins += dailyStats[date].minutes || 0;
    totalTasks += dailyStats[date].tasks || 0;
  });

  document.getElementById('totalPomos').textContent = totalPomos;
  document.getElementById('totalHours').textContent = (totalMins / 60).toFixed(1);
  document.getElementById('totalDays').textContent = totalDays;

  // 3. Weekly Chart
  const chartEl = document.getElementById('reportChart');
  chartEl.innerHTML = '';
  
  // 3. Today History List
  const historyEl = document.getElementById('reportHistoryList');
  historyEl.innerHTML = '';
  const historyData = todayData.history || [];
  
  if (historyData.length === 0) {
    historyEl.innerHTML = '<li class="history-empty">今天还没有记录哦，开始专注吧！</li>';
  } else {
    // Show newest at top
    [...historyData].reverse().forEach(evt => {
      const icon = evt.type === 'pomodoro' ? '🍅' : '✅';
      const li = `
        <li class="history-item">
          <span class="history-time">${evt.time}</span>
          <span class="history-icon">${icon}</span>
          <span class="history-title">${escapeHtml(evt.title)}</span>
        </li>
      `;
      historyEl.insertAdjacentHTML('beforeend', li);
    });
  }

  const last7Days = [];
  let maxPomos = 1; // avoid div by 0
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const shortLabel = `${d.getMonth()+1}/${d.getDate()}`;
    const p = dailyStats[dateStr] ? dailyStats[dateStr].pomodoros : 0;
    const m = dailyStats[dateStr] ? dailyStats[dateStr].minutes : 0;
    last7Days.push({ dateStr, label: shortLabel, pomodoros: p, minutes: m, isToday: i === 0 });
    if (p > maxPomos) maxPomos = p;
  }

  last7Days.forEach(day => {
    const heightPct = Math.max((day.pomodoros / maxPomos) * 100, 2); // min 2%
    
    const barHtml = `
      <div class="chart-bar-container">
        <div class="chart-value-tooltip">${day.pomodoros}个 / ${day.minutes}分</div>
        <div class="chart-bar ${day.isToday ? 'today' : ''}" style="height: ${heightPct}%"></div>
        <div class="chart-label">${day.label}</div>
      </div>
    `;
    chartEl.insertAdjacentHTML('beforeend', barHtml);
  });

  // 4. Focus Analysis
  const titleEl = document.getElementById('analysisTitle');
  const descEl = document.getElementById('analysisDesc');
  const iconEl = document.querySelector('.analysis-icon');

  if (totalDays === 0 || totalPomos === 0) {
    iconEl.textContent = '🌱';
    titleEl.textContent = '欢迎来到番茄时钟';
    descEl.textContent = '你还没有完成任何番茄钟，设定一个小目标，开始你的第一个番茄钟吧！';
    return;
  }

  const avgPomos = totalPomos / totalDays;
  const todayPomo = todayData.pomodoros;

  if (todayPomo === 0) {
    iconEl.textContent = '☕';
    titleEl.textContent = '良好的开端是成功的一半';
    descEl.textContent = `你还没开始今天的专注。你平均每天能完成 ${(avgPomos).toFixed(1)} 个番茄，试着完成第一个吧。`;
  } else if (todayPomo < avgPomos * 0.5) {
    iconEl.textContent = '🐢';
    titleEl.textContent = '循序渐进';
    descEl.textContent = `今天已完成 ${todayPomo} 个番茄。还在热身阶段，保持节奏，不要着急，你可以做得更好。`;
  } else if (todayPomo >= avgPomos * 0.5 && todayPomo < avgPomos) {
    iconEl.textContent = '🏃';
    titleEl.textContent = '状态不错';
    descEl.textContent = `今天已完成 ${todayPomo} 个番茄。马上就要追平你的平均水平了，继续保持当前的专注状态！`;
  } else if (todayPomo >= avgPomos && todayPomo <= avgPomos * 1.5) {
    iconEl.textContent = '🔥';
    titleEl.textContent = '表现优异！';
    descEl.textContent = `你今天超越了平均水平！高效工作的同时，别忘了利用短休息时间让眼睛和大脑放松一下。`;
  } else {
    iconEl.textContent = '👑';
    titleEl.textContent = '沉浸心流状态';
    descEl.textContent = `太惊人了，你今天完成了 ${todayPomo} 个番茄！远超平时水平。请务必安排一段长休息来恢复精力！`;
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Request notification permission on web
  if (!isElectron && 'Notification' in window && Notification.permission === 'default') {
    // Request on first user interaction
    document.addEventListener('click', function requestNotif() {
      Notification.requestPermission();
      document.removeEventListener('click', requestNotif);
    }, { once: true });
  }

  // Timer action
  timerActionBtn.addEventListener('click', () => {
    if (isRunning) { stopTimer(); } else { startTimer(); }
  });

  // Mode tabs
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (isRunning) {
        // Do not stop or switch mode if timer is already running
        return;
      }
      switchMode(tab.dataset.mode);
    });
  });

  // Title bar buttons (Electron only)
  if (isElectron) {
    pinBtn.addEventListener('click', () => window.electronAPI.toggleAlwaysOnTop());
    minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
    window.electronAPI.onAlwaysOnTopChanged((isTop) => {
      pinBtn.classList.toggle('active', isTop);
    });
  }

  settingsBtn.addEventListener('click', () => openSettings());
  if (reportBtn) reportBtn.addEventListener('click', () => openReport());
  if (mobileReportBtn) mobileReportBtn.addEventListener('click', () => openReport());

  // Settings modal
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', applySettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Report modal
  closeReportBtn.addEventListener('click', closeReport);
  reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReport();
  });

  // Add Task
  addTaskBtn.addEventListener('click', () => {
    addTaskBtn.style.display = 'none';
    addTaskForm.style.display = 'block';
    taskInput.value = '';
    estPomoInput = 1;
    estValue.textContent = '1';
    taskInput.focus();
  });

  cancelTaskBtn.addEventListener('click', () => {
    addTaskForm.style.display = 'none';
    addTaskBtn.style.display = 'flex';
  });

  saveTaskBtn.addEventListener('click', () => {
    const name = taskInput.value.trim();
    if (name) { addTask(name, estPomoInput); addTaskForm.style.display = 'none'; addTaskBtn.style.display = 'flex'; }
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTaskBtn.click();
    else if (e.key === 'Escape') cancelTaskBtn.click();
  });

  // Est pomodoros
  estMinus.addEventListener('click', () => { if (estPomoInput > 1) { estPomoInput--; estValue.textContent = estPomoInput; } });
  estPlus.addEventListener('click', () => { if (estPomoInput < 20) { estPomoInput++; estValue.textContent = estPomoInput; } });

  // Task list clicks
  taskList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('task-checkbox')) { toggleTaskComplete(target.dataset.id); return; }
    if (target.classList.contains('task-delete')) { deleteTask(target.dataset.id); return; }
    const taskInfo = target.closest('.task-info');
    if (taskInfo) setActiveTask(taskInfo.dataset.id);
  });

  // Tasks menu
  tasksMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); tasksDropdown.classList.toggle('show'); });
  document.addEventListener('click', () => tasksDropdown.classList.remove('show'));

  clearFinishedBtn.addEventListener('click', () => {
    tasks = tasks.filter((t) => !t.completed);
    if (activeTaskId && !tasks.find((t) => t.id === activeTaskId)) activeTaskId = tasks.length > 0 ? tasks[0].id : null;
    saveTasks(); renderTasks(); tasksDropdown.classList.remove('show');
  });

  clearAllBtn.addEventListener('click', () => {
    tasks = []; activeTaskId = null; saveTasks(); renderTasks(); tasksDropdown.classList.remove('show');
  });

  // Keyboard shortcut: Space to start/stop
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); if (isRunning) stopTimer(); else startTimer(); }
  });
}

// ===== Start =====
loadStats();
init();
