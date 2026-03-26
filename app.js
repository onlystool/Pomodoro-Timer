// ===== State =====
const DEFAULT_SETTINGS = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  autoBreak: false,
  autoPomodoro: false,
  longBreakInterval: 4,
};

let settings = { ...DEFAULT_SETTINGS };
let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
let timeLeft = settings.pomodoro * 60; // seconds
let timerInterval = null;
let isRunning = false;
let pomodoroCount = 0; // completed pomodoros in this session
let tasks = [];
let activeTaskId = null;
let estPomoInput = 1;

// ===== DOM Elements =====
const timerDisplay = document.getElementById('timerDisplay');
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
  loadSettings();
  loadTasks();
  resetTimer();
  renderTasks();
  updatePinButton();
  setupEventListeners();
  updateTitle();
}

// ===== Timer Logic =====
function resetTimer() {
  const durations = {
    pomodoro: settings.pomodoro * 60,
    shortBreak: settings.shortBreak * 60,
    longBreak: settings.longBreak * 60,
  };
  timeLeft = durations[currentMode];
  updateTimerDisplay();
  updateTitle();
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerActionBtn.textContent = 'STOP';
  timerActionBtn.classList.add('running');

  updateTray(true);

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = 0;
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      timerActionBtn.textContent = 'START';
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
  timerActionBtn.textContent = 'START';
  timerActionBtn.classList.remove('running');
  updateTitle();
  updateTray(false);
}

function onTimerComplete() {
  playAlarm();
  playCompleteAnimation();

  if (currentMode === 'pomodoro') {
    pomodoroCount++;
    updatePomoCounter();

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
    window.electronAPI?.showNotification(
      '🍅 番茄完成！',
      `第 ${pomodoroCount} 个番茄已完成，休息一下吧！`
    );

    // Auto switch to break
    if (pomodoroCount % settings.longBreakInterval === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }

    if (settings.autoBreak) {
      setTimeout(() => startTimer(), 500);
    }
  } else {
    // Break completed
    window.electronAPI?.showNotification(
      '⏰ 休息结束！',
      '准备好开始下一个番茄了吗？'
    );
    switchMode('pomodoro');

    if (settings.autoPomodoro) {
      setTimeout(() => startTimer(), 500);
    }
  }
}

function switchMode(mode) {
  currentMode = mode;
  document.body.setAttribute('data-mode', mode);

  // Update active tab
  modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Update message
  updatePomoMessage();
  stopTimer();
  resetTimer();
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
}

function updateTitle() {
  const time = formatTime(timeLeft);
  document.title = `${time} - ${getModeLabel()}`;
}

function getModeLabel() {
  return currentMode === 'pomodoro'
    ? '🍅 专注'
    : currentMode === 'shortBreak'
    ? '☕ 短休息'
    : '🌿 长休息';
}

function updateTray(running) {
  window.electronAPI?.updateTrayTime(formatTime(timeLeft), running, getModeLabel());
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
    pomoMessage.textContent = 'Time to focus!';
  } else {
    pomoMessage.textContent = 'Time for a break!';
  }
}

// ===== Complete Animation =====
function playCompleteAnimation() {
  document.body.classList.add('timer-complete');
  setTimeout(() => {
    document.body.classList.remove('timer-complete');
  }, 3000);
}

// ===== Alarm Sound =====
function playAlarm() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Play a pleasant chime pattern
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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

  // Repeat the alarm after 1.5 seconds
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
    el.className = `task-item${task.completed ? ' completed' : ''}${
      task.id === activeTaskId ? ' active' : ''
    }`;
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
  const task = {
    id: Date.now().toString(),
    name,
    estPomo,
    donePomo: 0,
    completed: false,
  };
  tasks.push(task);
  if (!activeTaskId) {
    activeTaskId = task.id;
  }
  saveTasks();
  renderTasks();
}

function toggleTaskComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
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
  if (activeTaskId === id) {
    activeTaskId = tasks.length > 0 ? tasks[0].id : null;
  }
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
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('fanqie-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
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
  } catch (e) {
    console.error('Failed to load tasks:', e);
  }
  updatePomoCounter();
}

function saveTasks() {
  try {
    localStorage.setItem(
      'fanqie-tasks',
      JSON.stringify({
        tasks,
        activeTaskId,
        pomodoroCount,
      })
    );
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
}

// ===== Pin/AlwaysOnTop =====
async function updatePinButton() {
  try {
    const isTop = await window.electronAPI?.getAlwaysOnTop();
    pinBtn.classList.toggle('active', isTop);
  } catch (e) {
    pinBtn.classList.add('active');
  }
}

// ===== Settings UI =====
function openSettings() {
  document.getElementById('settingPomodoro').value = settings.pomodoro;
  document.getElementById('settingShortBreak').value = settings.shortBreak;
  document.getElementById('settingLongBreak').value = settings.longBreak;
  document.getElementById('settingAutoBreak').checked = settings.autoBreak;
  document.getElementById('settingAutoPomodoro').checked = settings.autoPomodoro;
  document.getElementById('settingLongBreakInterval').value = settings.longBreakInterval;
  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

function applySettings() {
  settings.pomodoro = parseInt(document.getElementById('settingPomodoro').value) || 25;
  settings.shortBreak = parseInt(document.getElementById('settingShortBreak').value) || 5;
  settings.longBreak = parseInt(document.getElementById('settingLongBreak').value) || 15;
  settings.autoBreak = document.getElementById('settingAutoBreak').checked;
  settings.autoPomodoro = document.getElementById('settingAutoPomodoro').checked;
  settings.longBreakInterval =
    parseInt(document.getElementById('settingLongBreakInterval').value) || 4;

  saveSettings();
  if (!isRunning) {
    resetTimer();
  }
  closeSettings();
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Timer action
  timerActionBtn.addEventListener('click', () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  // Mode tabs
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      switchMode(tab.dataset.mode);
    });
  });

  // Title bar buttons
  pinBtn.addEventListener('click', () => {
    window.electronAPI?.toggleAlwaysOnTop();
  });

  settingsBtn.addEventListener('click', () => {
    openSettings();
  });

  minimizeBtn.addEventListener('click', () => {
    window.electronAPI?.minimizeWindow();
  });

  closeBtn.addEventListener('click', () => {
    window.electronAPI?.closeWindow();
  });

  // Always on top change from main process
  window.electronAPI?.onAlwaysOnTopChanged((isTop) => {
    pinBtn.classList.toggle('active', isTop);
  });

  // Settings modal
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', applySettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
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
    if (name) {
      addTask(name, estPomoInput);
      addTaskForm.style.display = 'none';
      addTaskBtn.style.display = 'flex';
    }
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveTaskBtn.click();
    } else if (e.key === 'Escape') {
      cancelTaskBtn.click();
    }
  });

  // Est pomodoros
  estMinus.addEventListener('click', () => {
    if (estPomoInput > 1) {
      estPomoInput--;
      estValue.textContent = estPomoInput;
    }
  });

  estPlus.addEventListener('click', () => {
    if (estPomoInput < 20) {
      estPomoInput++;
      estValue.textContent = estPomoInput;
    }
  });

  // Task list clicks
  taskList.addEventListener('click', (e) => {
    const target = e.target;

    // Checkbox
    if (target.classList.contains('task-checkbox')) {
      toggleTaskComplete(target.dataset.id);
      return;
    }

    // Delete
    if (target.classList.contains('task-delete')) {
      deleteTask(target.dataset.id);
      return;
    }

    // Click on task info to set active
    const taskInfo = target.closest('.task-info');
    if (taskInfo) {
      setActiveTask(taskInfo.dataset.id);
    }
  });

  // Tasks menu
  tasksMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tasksDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    tasksDropdown.classList.remove('show');
  });

  clearFinishedBtn.addEventListener('click', () => {
    tasks = tasks.filter((t) => !t.completed);
    if (activeTaskId && !tasks.find((t) => t.id === activeTaskId)) {
      activeTaskId = tasks.length > 0 ? tasks[0].id : null;
    }
    saveTasks();
    renderTasks();
    tasksDropdown.classList.remove('show');
  });

  clearAllBtn.addEventListener('click', () => {
    tasks = [];
    activeTaskId = null;
    saveTasks();
    renderTasks();
    tasksDropdown.classList.remove('show');
  });

  // Keyboard shortcut: Space to start/stop
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (isRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    }
  });
}

// ===== Start =====
init();
