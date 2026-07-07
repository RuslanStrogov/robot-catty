/**
 * State Persistence Module
 * Сохраняет runtime-состояние робота (серво, RGB, LED плат, мигание, анимации)
 * в state.json, чтобы после перезагрузки сервера всё восстанавливалось.
 */
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'config', 'state.json');

const DEFAULTS = {
  servos: {
    eyeL: 90, eyeR: 90, jaw: 90,
    shoulderL: 90, shoulderR: 90, elbowL: 90, elbowR: 90
  },
  rgb: { r: 0, g: 0, b: 0 },
  board_leds: { uno: false, mega: false },
  animation: null,
  blink: { on: 500, off: 500 },
  transition: null,
  connections: { uno: false, mega: false }
};

/**
 * Загрузить состояние из файла (или вернуть дефолты)
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const saved = JSON.parse(raw);
      // Мерж с дефолтами — если в файле нет каких-то полей, берём дефолт
      const merged = deepMerge({}, DEFAULTS);
      applyMerge(merged, saved);
      console.log('[STATE] Loaded from', STATE_FILE);
      return merged;
    }
  } catch (e) {
    console.error('[STATE] Load error:', e.message);
  }
  console.log('[STATE] Using defaults');
  return JSON.parse(JSON.stringify(DEFAULTS));
}

/**
 * Сохранить состояние в файл
 */
function saveState(state) {
  try {
    // Сохраняем только сохраняемые поля (без connections — они runtime)
    const persistable = {
      servos: state.servos,
      rgb: state.rgb,
      board_leds: state.board_leds,
      animation: state.animation,
      blink: state.blink,
      transition: state.transition
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(persistable, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[STATE] Save error:', e.message);
    return false;
  }
}

/**
 * Глубокий мерж: target получает все поля source
 */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = JSON.parse(JSON.stringify(source[key]));
    }
  }
  return target;
}

function applyMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        applyMerge(target[key], source[key]);
      } else {
        target[key] = JSON.parse(JSON.stringify(source[key]));
      }
    } else {
      target[key] = source[key];
    }
  }
}

module.exports = { loadState, saveState, DEFAULTS };