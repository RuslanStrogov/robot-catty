#!/usr/bin/env python3
"""
Robot Catty - Web LED Controller + Module Status
Runs on Raspberry Pi, serves a web UI for controlling RGB LED and monitoring modules.
"""

import serial
import time
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8080
SERIAL_PORT = "/dev/ttyUSB0"
BAUD = 9600
SERIAL_TIMEOUT = 2

# Module registry - all connected devices
MODULES = {
    "boards": [
        {
            "id": "uno",
            "name": "Arduino Uno",
            "port": "/dev/ttyUSB0",
            "chip": "ATmega328p (CH340)",
            "status": "online",
            "modules": [
                {"name": "RGB LED", "type": "led", "pin": "D9=R, D10=G, D11=B (PWM)", "value": "0,0,0"}
            ]
        },
        {
            "id": "mega",
            "name": "Arduino Mega 2560",
            "port": "/dev/ttyACM0",
            "chip": "ATmega2560 (CDC ACM)",
            "status": "pending",
            "modules": [
                {"name": "Servo Scanner", "type": "servo", "pin": "D2-D9", "value": "90° each"},
                {"name": "HC-SR04", "type": "sensor", "pin": "Trig:D12, Echo:D13", "value": "N/A"}
            ]
        }
    ]
}

PRESETS = {
    "red": (255, 0, 0),
    "green": (0, 255, 0),
    "blue": (0, 0, 255),
    "white": (255, 255, 255),
    "yellow": (255, 255, 0),
    "cyan": (0, 255, 255),
    "magenta": (255, 0, 255),
    "orange": (255, 165, 0),
    "warm": (255, 147, 41),
    "pink": (255, 20, 147),
    "purple": (128, 0, 128),
}

# Global state
current_color = [0, 0, 0]
blink_thread = None
blink_running = False
ser_lock = threading.Lock()
ser = None

def get_serial():
    global ser
    if ser and ser.is_open:
        return ser
    ser = serial.Serial(SERIAL_PORT, BAUD, timeout=SERIAL_TIMEOUT)
    time.sleep(2)
    ser.reset_input_buffer()
    return ser

def send_color(r, g, b):
    global current_color
    with ser_lock:
        s = get_serial()
        cmd = f"{r},{g},{b}\n"
        s.write(cmd.encode())
        time.sleep(0.1)
        current_color = [r, g, b]
        try:
            return s.readline().decode().strip()
        except:
            return ""

def send_off():
    global current_color
    with ser_lock:
        s = get_serial()
        s.write(b"OFF\n")
        time.sleep(0.1)
        current_color = [0, 0, 0]
        try:
            return s.readline().decode().strip()
        except:
            return ""

def blink_loop(color, on_ms, off_ms):
    global blink_running
    while blink_running:
        send_color(*color)
        time.sleep(on_ms / 1000.0)
        send_off()
        time.sleep(off_ms / 1000.0)
    send_off()

def start_blink(color, on_ms=500, off_ms=500):
    global blink_thread, blink_running
    stop_blink()
    blink_running = True
    blink_thread = threading.Thread(target=blink_loop, args=(color, on_ms, off_ms), daemon=True)
    blink_thread.start()

def stop_blink():
    global blink_running, blink_thread
    blink_running = False
    if blink_thread:
        blink_thread.join(timeout=2)
        blink_thread = None

HTML_PAGE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Robot Catty - LED Control</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       background: #1a1a2e; color: #eee; min-height: 100vh; display:flex;
       flex-direction:column; align-items:center; padding: 20px; }
h1 { font-size: 1.8em; margin-bottom: 5px; }
.subtitle { color: #888; margin-bottom: 20px; }
.links { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; justify-content:center; }
.links a { color:#7ec8e3; text-decoration:none; padding:6px 14px; border:1px solid #7ec8e3;
           border-radius:8px; font-size:0.85em; transition:background 0.2s; }
.links a:hover { background:#7ec8e3; color:#1a1a2e; }
.card { background: #16213e; border-radius: 16px; padding: 24px; margin: 10px;
        width: 100%; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.card h2 { font-size: 1.1em; margin-bottom: 16px; color: #7ec8e3; }
.current { display:flex; align-items:center; gap:16px; margin-bottom:12px; }
.color-preview { width:60px; height:60px; border-radius:50%; border:3px solid #333;
                 transition: background 0.3s; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
.color-values { font-family: monospace; font-size:1.1em; }
.presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.preset-btn { padding: 12px 8px; border: none; border-radius: 10px; color: #fff;
              font-size: 0.85em; font-weight: 600; cursor: pointer;
              transition: transform 0.15s, box-shadow 0.15s; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.preset-btn:hover { transform: scale(1.05); box-shadow: 0 2px 12px rgba(0,0,0,0.4); }
.preset-btn:active { transform: scale(0.95); }
.slider-group { margin: 8px 0; }
.slider-group label { display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9em; }
input[type=range] { width:100%; height:8px; -webkit-appearance:none; border-radius:4px; outline:none; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px;
                                           border-radius:50%; cursor:pointer; border:2px solid #fff; }
#slider-r { background: linear-gradient(to right, #000, #f00); }
#slider-r::-webkit-slider-thumb { background: #f44; }
#slider-g { background: linear-gradient(to right, #000, #0f0); }
#slider-g::-webkit-slider-thumb { background: #4f4; }
#slider-b { background: linear-gradient(to right, #000, #00f); }
#slider-b::-webkit-slider-thumb { background: #44f; }
.btn-row { display:flex; gap:10px; margin-top:12px; }
.btn { flex:1; padding:12px; border:none; border-radius:10px; font-size:1em; font-weight:600;
       cursor:pointer; transition: transform 0.15s; }
.btn:hover { transform: scale(1.02); }
.btn:active { transform: scale(0.98); }
.btn-off { background:#e74c3c; color:#fff; }
.btn-apply { background:#27ae60; color:#fff; }
.blink-controls { display:flex; gap:8px; align-items:center; margin-top:12px; flex-wrap:wrap; }
.blink-controls label { font-size:0.85em; }
.blink-controls input { width:70px; padding:6px; border-radius:6px; border:1px solid #444;
                        background:#2a2a4a; color:#eee; }
.blink-btn { padding:8px 16px; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
.blink-start { background:#e67e22; color:#fff; }
.blink-stop { background:#95a5a6; color:#fff; }
.status { text-align:center; margin-top:8px; font-size:0.9em; color:#aaa; }
.cat-face { font-size: 3em; text-align: center; margin-bottom: 10px; }
.cat-eyes { display:flex; justify-content:center; gap:20px; margin:5px 0; }
.cat-eye { width:20px; height:20px; border-radius:50%; transition: background 0.3s, opacity 0.3s; }
.scheme-box { display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 0; }
.scheme-node { background:#0f3460; border:2px solid #444; border-radius:10px; padding:10px 18px;
              font-size:0.9em; text-align:center; min-width:180px; }
.scheme-node.highlight { border-color:#7ec8e3; box-shadow:0 0 10px rgba(126,200,227,0.2); }
.scheme-node.online { border-color:#27ae60; }
.scheme-node.offline { border-color:#e74c3c; }
.scheme-arrow { color:#555; font-size:1.4em; }
.scheme-label { color:#666; font-size:0.7em; }
.scheme-ports { display:flex; gap:20px; font-size:0.75em; color:#888; margin-top:4px; }
.copy-link { background:#16213e; border:1px solid #444; border-radius:8px; padding:10px 14px;
             color:#7ec8e3; font-family:monospace; font-size:0.9em; cursor:pointer;
             display:flex; align-items:center; gap:8px; width:100%; max-width:420px;
             margin:0 auto; word-break:break-all; }
.copy-link:hover { border-color:#7ec8e3; }
.copy-btn { background:#27ae60; color:#fff; border:none; border-radius:6px; padding:4px 10px;
            cursor:pointer; font-size:0.8em; white-space:nowrap; }
/* Modules panel */
.modules-panel { margin-bottom: 16px; }
.board-item { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #2a2a4a; }
.board-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.board-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.board-status { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.board-status.online { background:#27ae60; box-shadow:0 0 6px rgba(39,174,96,0.5); }
.board-status.offline { background:#e74c3c; box-shadow:0 0 6px rgba(231,76,60,0.5); }
.board-status.pending { background:#f39c12; box-shadow:0 0 6px rgba(243,156,18,0.5); }
.board-name { font-weight:600; font-size:1em; }
.board-chip { font-size:0.75em; color:#888; }
.board-port { font-size:0.7em; color:#555; font-family:monospace; }
.module-list { padding-left:20px; border-left:2px solid #333; margin-left:5px; }
.module-item { display:flex; justify-content:space-between; align-items:center;
               padding:6px 0; font-size:0.88em; }
.module-name { color:#ddd; }
.module-type { font-size:0.7em; color:#888; text-transform:uppercase;
               background:#0f3460; padding:2px 6px; border-radius:4px; margin:0 6px; }
.module-pin { font-family:monospace; font-size:0.8em; color:#7ec8e3; }
.module-value { font-family:monospace; font-size:0.85em; color:#f39c12; }
</style>
</head>
<body>
<div class="cat-face">🐱</div>
<h1>Robot Catty</h1>
<div class="subtitle">RGB LED Controller + Module Monitor</div>

<div class="links">
  <a href="/" onclick="copyLink(event)">📋 Copy link</a>
</div>

<div class="card">
  <h2>📖 О проекте</h2>
  <p style="font-size:0.88em;color:#bbb;line-height:1.6;margin-bottom:12px">
    Кот-робот с RGB глазами, управляемый через веб.
    Raspberry Pi отправляет serial-команды на Arduino Uno,
    которая управляет RGB LED через PWM. Arduino Mega — основной контроллер для сервоприводов и сенсоров.
  </p>
  <div class="scheme-box">
    <div class="scheme-node highlight">
      🌐 Управление<br>
      <span style="font-size:0.75em;color:#888">Web UI / SSH</span>
    </div>
    <div class="scheme-arrow">↕</div>
    <div class="scheme-label">HTTP / SSH</div>
    <div class="scheme-node highlight">
      🍓 Raspberry Pi<br>
      <span style="font-size:0.75em;color:#888">Hermes · Web UI :8080</span>
    </div>
    <div class="scheme-arrow">↕</div>
    <div class="scheme-label">Serial USB · 9600 baud</div>
    <div class="scheme-node online">
      🔵 Arduino Uno (CH340)<br>
      <span style="font-size:0.75em;color:#888">RGB LED · D9=R D10=G D11=B</span>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin-top:8px;width:100%;justify-content:center">
      <div class="scheme-node pending" style="min-width:140px;font-size:0.8em">
        🔴 Arduino Mega 2560<br>
        <span style="font-size:0.7em;color:#888">/dev/ttyACM0 · Серво + Сенсоры</span>
      </div>
    </div>
  </div>
</div>

<div class="card">
  <h2>🔌 Подключённые модули</h2>
  <div id="modules" class="modules-panel">
    <div class="status">Загрузка...</div>
  </div>
</div>

<div class="card">
  <h2>👀 Текущий цвет (Arduino Uno → RGB LED)</h2>
  <div class="current">
    <div class="color-preview" id="preview"></div>
    <div class="color-values" id="values">R:0 G:0 B:0</div>
  </div>
  <div class="cat-eyes">
    <div class="cat-eye" id="eye-l"></div>
    <div class="cat-eye" id="eye-r"></div>
  </div>
</div>

<div class="card">
  <h2>🎨 Пресеты</h2>
  <div class="presets" id="presets"></div>
</div>

<div class="card">
  <h2>🌈 Кастомный цвет</h2>
  <div class="slider-group">
    <label><span>Red</span><span id="rv">0</span></label>
    <input type="range" id="slider-r" min="0" max="255" value="0">
  </div>
  <div class="slider-group">
    <label><span>Green</span><span id="gv">0</span></label>
    <input type="range" id="slider-g" min="0" max="255" value="0">
  </div>
  <div class="slider-group">
    <label><span>Blue</span><span id="bv">0</span></label>
    <input type="range" id="slider-b" min="0" max="255" value="0">
  </div>
  <div class="btn-row">
    <button class="btn btn-off" onclick="sendOff()">&#9723; Выкл</button>
    <button class="btn btn-apply" onclick="sendCustom()">&#10003; Применить</button>
  </div>
</div>

<div class="card">
  <h2>💡 Моргание</h2>
  <div class="blink-controls">
    <label>Вкл (мс)</label>
    <input type="number" id="blink-on" value="1500">
    <label>Выкл (мс)</label>
    <input type="number" id="blink-off" value="1500">
  </div>
  <div class="btn-row" style="margin-top:10px">
    <button class="btn blink-start" onclick="startBlink()">&#9889; Моргать</button>
    <button class="btn blink-stop" onclick="stopBlink()">&#9724; Стоп</button>
  </div>
</div>

<div class="status" id="status"></div>

<script>
const presets = {
  'Red': [255,0,0], 'Green': [0,255,0], 'Blue': [0,0,255], 'White': [255,255,255],
  'Yellow': [255,255,0], 'Cyan': [0,255,255], 'Magenta': [255,0,255], 'Orange': [255,165,0],
  'Pink': [255,20,147], 'Purple': [128,0,128], 'Warm': [255,147,41]
};

const presetsEl = document.getElementById('presets');
for (const [name, rgb] of Object.entries(presets)) {
  const btn = document.createElement('button');
  btn.className = 'preset-btn';
  btn.style.background = `rgb(${rgb.join(',')})`;
  btn.textContent = name;
  btn.onclick = () => sendColor(...rgb);
  presetsEl.appendChild(btn);
}

const sliderR = document.getElementById('slider-r');
const sliderG = document.getElementById('slider-g');
const sliderB = document.getElementById('slider-b');

function updateSliders(r, g, b) {
  sliderR.value = r; sliderG.value = g; sliderB.value = b;
  document.getElementById('rv').textContent = r;
  document.getElementById('gv').textContent = g;
  document.getElementById('bv').textContent = b;
  const c = `rgb(${r},${g},${b})`;
  document.getElementById('preview').style.background = c;
  document.getElementById('eye-l').style.background = c;
  document.getElementById('eye-r').style.background = c;
}

[sliderR, sliderG, sliderB].forEach(s => {
  s.addEventListener('input', () => {
    updateSliders(+sliderR.value, +sliderG.value, +sliderB.value);
  });
});

async function api(path) {
  const r = await fetch(path);
  return r.json();
}

async function sendColor(r, g, b) {
  updateSliders(r, g, b);
  const res = await api(`/set?r=${r}&g=${g}&b=${b}`);
  document.getElementById('status').textContent = res.msg || 'OK';
}

async function sendOff() {
  await api('/off');
  updateSliders(0, 0, 0);
  document.getElementById('status').textContent = 'LED off';
}

async function sendCustom() {
  sendColor(+sliderR.value, +sliderG.value, +sliderB.value);
}

async function startBlink() {
  const onMs = document.getElementById('blink-on').value;
  const offMs = document.getElementById('blink-off').value;
  const r = +sliderR.value, g = +sliderG.value, b = +sliderB.value;
  if (r===0 && g===0 && b===0) { alert('Choose a color first!'); return; }
  const res = await api(`/blink?r=${r}&g=${g}&b=${b}&on=${onMs}&off=${offMs}`);
  document.getElementById('status').textContent = res.msg || 'Blinking';
}

async function stopBlink() {
  await api('/blink/stop');
  document.getElementById('status').textContent = 'Blink stopped';
}

async function refresh() {
  try {
    const res = await api('/status');
    if (res.color) updateSliders(...res.color);
  } catch(e) {}
}

async function loadModules() {
  try {
    const data = await api('/api/modules');
    const container = document.getElementById('modules');
    let html = '';
    for (const board of data.boards) {
      const statusClass = board.status || 'offline';
      const statusText = statusClass === 'online' ? 'Online' : statusClass === 'pending' ? 'Pending' : 'Offline';
      html += `<div class="board-item">
        <div class="board-header">
          <div class="board-status ${statusClass}"></div>
          <div>
            <div class="board-name">${board.name}</div>
            <div class="board-chip">${board.chip}</div>
            <div class="board-port">${board.port} · ${statusText}</div>
          </div>
        </div>
        <div class="module-list">`;
      for (const mod of board.modules) {
        html += `<div class="module-item">
          <span>
            <span class="module-name">${mod.name}</span>
            <span class="module-type">${mod.type}</span>
          </span>
          <span>
            <span class="module-pin">${mod.pin}</span>
            <span class="module-value">${mod.value}</span>
          </span>
        </div>`;
      }
      html += `</div></div>`;
    }
    container.innerHTML = html;
  } catch(e) {
    document.getElementById('modules').innerHTML = '<div class="status">Не удалось загрузить</div>';
  }
}

refresh();
loadModules();
setInterval(refresh, 3000);
setInterval(loadModules, 10000);
</script>
</body>
</html>"""

class LEDHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode('utf-8'))

        elif self.path.startswith('/set?'):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            r = int(qs.get('r', [0])[0])
            g = int(qs.get('g', [0])[0])
            b = int(qs.get('b', [0])[0])
            send_color(r, g, b)
            self.send_json({"ok": True, "msg": f"Color set to {r},{g},{b}", "color": [r,g,b]})

        elif self.path == '/off':
            stop_blink()
            send_off()
            self.send_json({"ok": True, "msg": "LED off"})

        elif self.path.startswith('/blink?'):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            r = int(qs.get('r', [255])[0])
            g = int(qs.get('g', [0])[0])
            b = int(qs.get('b', [0])[0])
            on_ms = int(qs.get('on', [1500])[0])
            off_ms = int(qs.get('off', [1500])[0])
            start_blink([r, g, b], on_ms, off_ms)
            self.send_json({"ok": True, "msg": f"Blinking {r},{g},{b} on={on_ms}ms off={off_ms}ms"})

        elif self.path == '/blink/stop':
            stop_blink()
            self.send_json({"ok": True, "msg": "Blink stopped"})

        elif self.path == '/status':
            self.send_json({"color": current_color, "blinking": blink_running})

        elif self.path == '/api/modules':
            self.send_json(MODULES)

        else:
            self.send_response(404)
            self.end_headers()

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress logs

if __name__ == '__main__':
    print(f"Robot Catty Web UI on http://0.0.0.0:{PORT}")
    server = HTTPServer(('0.0.0.0', PORT), LEDHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        stop_blink()
        send_off()
        server.server_close()
