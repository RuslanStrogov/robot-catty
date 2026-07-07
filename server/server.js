const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const SystemMonitor = require('./services/system-monitor');
const configManager = require('./config/config');
const statePersistence = require('./utils/state-persistence');

// Load swagger spec
const swaggerSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));

// System monitor
const systemMonitor = new SystemMonitor();

// ========== CONFIG ==========
configManager.loadConfig();
const config = configManager.getConfig();
const envOverrides = configManager.getEnvOverrides();

// Apply environment overrides
if (Object.keys(envOverrides).length > 0) {
    console.log('[CONFIG] Applying env overrides:', JSON.stringify(envOverrides));
    // Rewrite config with env overrides (without saving to file)
    const merged = JSON.parse(JSON.stringify(config));
    deepMerge(merged, envOverrides);
    // Update in-memory only — env overrides don't persist to file
    Object.assign(config, merged);
}

const WEB_PORT = config.server.port || 3000;
const UNO_PORT = config.serial.uno.port;
const UNO_BAUD = config.serial.uno.baud || 9600;
const MEGA_PORT = config.serial.mega.port;
const MEGA_BAUD = config.serial.mega.baud || 115200;

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = JSON.parse(JSON.stringify(source[key]));
            } else {
                deepMerge(target[key], source[key]);
            }
        } else {
            target[key] = source[key];
        }
    }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ========== STATE ==========
const state = statePersistence.loadState();

// ========== SERIAL PORTS ==========
let unoPort = null;
let megaPort = null;

function initSerial() {
    // Arduino Uno (Head)
    try {
        unoPort = new SerialPort({ path: UNO_PORT, baudRate: UNO_BAUD, autoOpen: false });
        const unoParser = unoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        unoPort.open((err) => {
            if (err) {
                console.log('[UNO] Open error:', err.message);
                state.connections.uno = false;
            } else {
                console.log('[UNO] Connected on', UNO_PORT, `@${UNO_BAUD}baud`);
                state.connections.uno = true;
                broadcastState();
            }
        });

        unoParser.on('data', (line) => {
            line = line.trim();
            if (!line) return;
            addLog('serial', `[UNO] ${line}`);
            console.log('[UNO] ←', line);
            parseResponse('uno', line);
        });

        unoPort.on('close', () => {
            console.log('[UNO] Disconnected');
            state.connections.uno = false;
            broadcastState();
        });
    } catch(e) {
        console.log('[UNO] Init error:', e.message);
    }

    // Arduino Mega (Body)
    try {
        megaPort = new SerialPort({ path: MEGA_PORT, baudRate: MEGA_BAUD, autoOpen: false });
        const megaParser = megaPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        megaPort.open((err) => {
            if (err) {
                console.log('[MEGA] Open error:', err.message);
                state.connections.mega = false;
            } else {
                console.log('[MEGA] Connected on', MEGA_PORT, `@${MEGA_BAUD}baud`);
                state.connections.mega = true;
                broadcastState();
            }
        });

        megaParser.on('data', (line) => {
            line = line.trim();
            if (!line) return;
            addLog('serial', `[MEGA] ${line}`);
            console.log('[MEGA] ←', line);
            parseResponse('mega', line);
        });

        megaPort.on('close', () => {
            console.log('[MEGA] Disconnected');
            state.connections.mega = false;
            broadcastState();
        });
    } catch(e) {
        console.log('[MEGA] Init error:', e.message);
    }
}

function parseResponse(board, line) {
    if (line.startsWith('STATUS:')) {
        const parts = line.substring(7).split(';');
        parts.forEach(part => {
            if (part.startsWith('servos=')) {
                const servoStr = part.substring(7);
                servoStr.split(',').forEach(s => {
                    const [name, angle] = s.split(':');
                    if (name && angle) {
                        state.servos[name] = parseInt(angle);
                    }
                });
            } else if (part.startsWith('rgb=')) {
                const rgbStr = part.substring(4);
                const [r, g, b] = rgbStr.split(',').map(Number);
                state.rgb = { r: r||0, g: g||0, b: b||0 };
            }
        });
        broadcastState();
    }
}

function sendToBoard(board, cmd) {
    const port = board === 'head' || board === 'uno' ? unoPort : megaPort;
    const name = board === 'head' || board === 'uno' ? 'UNO' : 'MEGA';
    if (port && port.isOpen) {
        port.write(cmd + '\n', (err) => {
            if (err) console.log(`[${name}] Write error:`, err.message);
            else console.log(`[${name}] →`, cmd);
        });
    } else {
        console.log(`[${name}] Port not open`);
    }
}

// ========== WEBSOCKET ==========
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[WS] Client connected. Total:', clients.size);

    // Send current state + config
    ws.send(JSON.stringify({ type: 'state', data: state, connections: state.connections }));
    ws.send(JSON.stringify({ type: 'config', data: configManager.getConfig() }));

    ws.on('message', (msg) => {
        try {
            const req = JSON.parse(msg.toString());
            handleWSMessage(ws, req);
        } catch(e) {
            console.log('[WS] Parse error:', e.message);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('[WS] Client disconnected. Total:', clients.size);
    });
});

function handleWSMessage(ws, req) {
    switch (req.type) {
        case 'board_led':
            if (req.board && req.state !== undefined) {
                state.board_leds[req.board] = !!req.state;
                sendToBoard(req.board, req.state ? 'LEDON' : 'LEDOFF');
                broadcastState();
            }
            break;

        case 'servo':
            const board = ['eyeL','eyeR','jaw'].includes(req.servo) ? 'uno' : 'mega';
            sendToBoard(board, `SERVO:${req.servo}:${req.angle}`);
            state.servos[req.servo] = req.angle;
            break;

        case 'rgb':
            sendToBoard('uno', `RGB:${req.b},${req.g},${req.r}`);
            state.rgb = { r: req.r, g: req.g, b: req.b };
            broadcastState();
            break;

        case 'blink':
            sendToBoard('uno', `BLINK:${req.on},${req.off}`);
            state.blink = { on: req.on, off: req.off };
            break;

        case 'transition':
            sendToBoard('uno', `TRANS:${req.from},${req.to},${req.step}`);
            state.transition = { from: req.from, to: req.to, step: req.step };
            break;

        case 'config':
            if (req.action === 'get') {
                ws.send(JSON.stringify({ type: 'config', data: configManager.getConfig() }));
            } else if (req.action === 'set' && req.data) {
                const ok = configManager.updateConfig(req.data);
                ws.send(JSON.stringify({ type: 'config', data: configManager.getConfig() }));
                addLog('server', `[CONFIG] Updated from WS: ${ok ? 'OK' : 'FAIL'}`);
            } else if (req.action === 'reset') {
                configManager.resetConfig();
                ws.send(JSON.stringify({ type: 'config', data: configManager.getConfig() }));
                addLog('server', '[CONFIG] Reset to defaults');
            }
            break;

        case 'cmd':
            if (req.data === 'HOME' || req.data === 'STATUS') {
                sendToBoard('uno', req.data);
            } else if (req.data === 'CENTER') {
                sendToBoard('mega', req.data);
            } else if (req.data === 'SERVER_STATUS') {
                ws.send(JSON.stringify({ type: 'server_status', data: systemMonitor.getStatus() }));
            } else {
                sendToBoard('uno', req.data);
            }
            break;

        case 'preset':
            sendToBoard('uno', `PRESET:${req.name}`);
            break;

        case 'animation':
            handleAnimation(req.name, req.params);
            break;

        case 'stop':
            state.animation = null;
            sendToBoard('uno', 'STOP');
            sendToBoard('mega', 'STOP');
            break;
    }
}

function handleAnimation(name, params) {
    state.animation = name;
    switch (name) {
        case 'wave':
            const waveInterval = setInterval(() => {
                if (state.animation !== 'wave') { clearInterval(waveInterval); return; }
                state.servos.shoulderR = state.servos.shoulderR === 90 ? 45 : 90;
                sendToBoard('mega', `SERVO:shoulderR:${state.servos.shoulderR}`);
                broadcastState();
            }, 800);
            break;
        case 'nod':
            const nodInterval = setInterval(() => {
                if (state.animation !== 'nod') { clearInterval(nodInterval); return; }
                state.servos.jaw = state.servos.jaw === 90 ? 45 : 90;
                sendToBoard('uno', `SERVO:jaw:${state.servos.jaw}`);
                broadcastState();
            }, 600);
            break;
        case 'blink':
            sendToBoard('uno', 'BLINK');
            break;
    }
}

function broadcastState() {
    const msg = JSON.stringify({ type: 'state', data: state, connections: state.connections });
    clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(msg);
    });
    statePersistence.saveState(state);
}

function broadcastConfig() {
    const msg = JSON.stringify({ type: 'config', data: configManager.getConfig() });
    clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(msg);
    });
}

// ========== REST API ==========
app.use(express.json());
app.use(express.static('public'));

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Robot Catty API Docs'
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ——— Public Env API (no private data) ———
app.get('/api/env', (req, res) => {
    const cfg = configManager.getConfig();
    res.json({
        serverDomain: cfg.host?.domain || 'localhost',
        wsProtocol: cfg.host?.wsProtocol || 'ws',
        localIp: cfg.host?.localIp || '127.0.0.1',
        wsPort: cfg.server?.port || 3000,
        serverName: cfg.server?.name || 'Robot Catty'
    });
});

// ——— Config API ———
app.get('/api/config', (req, res) => {
    res.json(configManager.getConfig());
});

app.put('/api/config', (req, res) => {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
        return res.status(400).json({ error: 'Invalid config object' });
    }
    const ok = configManager.updateConfig(newConfig);
    if (ok) {
        broadcastConfig();
        res.json({ ok: true, config: configManager.getConfig() });
    } else {
        res.status(500).json({ error: 'Failed to save config' });
    }
});

app.post('/api/config/reset', (req, res) => {
    const def = configManager.resetConfig();
    if (def) {
        broadcastConfig();
        res.json({ ok: true, config: def });
    } else {
        res.status(500).json({ error: 'Failed to reset config' });
    }
});

app.get('/api/config/port/:board', (req, res) => {
    const board = req.params.board;
    if (!['uno', 'mega'].includes(board)) {
        return res.status(400).json({ error: 'Board must be uno or mega' });
    }
    res.json({ board, port: config.serial[board].port, baud: config.serial[board].baud });
});

app.put('/api/config/port/:board', (req, res) => {
    const board = req.params.board;
    if (!['uno', 'mega'].includes(board)) {
        return res.status(400).json({ error: 'Board must be uno or mega' });
    }
    const { port, baud } = req.body;
    if (port) configManager.setConfig(['serial', board, 'port'], port);
    if (baud) configManager.setConfig(['serial', board, 'baud'], parseInt(baud));
    broadcastConfig();
    res.json({ ok: true, config: configManager.getConfig() });
});

app.get('/api/config/pin/:module/:name', (req, res) => {
    const { module, name } = req.params;
    const cfg = configManager.getConfig();
    let pins = null;
    if (module === 'head') pins = cfg.servo_pins?.head;
    else if (module === 'body') pins = cfg.servo_pins?.body;
    else if (module === 'rgb') pins = cfg.rgb_pins;
    if (!pins || !(name in pins)) {
        return res.status(404).json({ error: 'Pin not found' });
    }
    res.json({ module, name, pin: pins[name] });
});

app.put('/api/config/pin/:module/:name', (req, res) => {
    const { module, name } = req.params;
    const { pin } = req.body;
    if (pin === undefined || typeof pin !== 'number') {
        return res.status(400).json({ error: 'pin must be a number' });
    }
    let path = null;
    if (module === 'head') path = ['servo_pins', 'head', name];
    else if (module === 'body') path = ['servo_pins', 'body', name];
    else if (module === 'rgb') path = ['rgb_pins', name];
    if (!path) {
        return res.status(404).json({ error: 'Module not found' });
    }
    configManager.setConfig(path, pin);
    broadcastConfig();
    res.json({ ok: true, config: configManager.getConfig() });
});

// ——— Regular API ———
app.get('/api/status', (req, res) => {
    res.json({ connections: state.connections, data: state });
});

app.post('/api/servo', (req, res) => {
    const { board, servo, angle } = req.body;
    const target = ['eyeL','eyeR','jaw'].includes(servo) ? 'uno' : 'mega';
    sendToBoard(target, `SERVO:${servo}:${angle}`);
    state.servos[servo] = angle;
    broadcastState();
    res.json({ ok: true });
});

app.post('/api/rgb', (req, res) => {
    const { r, g, b } = req.body;
    sendToBoard('uno', `RGB:${r},${g},${b}`);
    state.rgb = { r, g, b };
    broadcastState();
    res.json({ ok: true });
});

app.post('/api/rgb/off', (req, res) => {
    sendToBoard('uno', 'OFF');
    state.rgb = { r: 0, g: 0, b: 0 };
    broadcastState();
    res.json({ ok: true });
});

app.post('/api/rgb/preset', (req, res) => {
    sendToBoard('uno', `PRESET:${req.body.name}`);
    res.json({ ok: true });
});

app.post('/api/animation', (req, res) => {
    handleAnimation(req.body.name, req.body.params);
    res.json({ ok: true });
});

app.post('/api/animation/stop', (req, res) => {
    state.animation = null;
    sendToBoard('uno', 'STOP');
    sendToBoard('mega', 'STOP');
    res.json({ ok: true });
});

// ——— Board LED API ———
app.get('/api/board-leds', (req, res) => {
    res.json(state.board_leds);
});

app.put('/api/board-leds', (req, res) => {
    const { board, state: ledState } = req.body;
    if (!['uno', 'mega'].includes(board)) {
        return res.status(400).json({ error: 'Board must be uno or mega' });
    }
    if (ledState === undefined) {
        return res.status(400).json({ error: 'state (boolean) is required' });
    }
    state.board_leds[board] = !!ledState;
    sendToBoard(board, ledState ? 'LEDON' : 'LEDOFF');
    broadcastState();
    res.json({ ok: true, board_leds: state.board_leds });
});

app.post('/api/board-leds/all-off', (req, res) => {
    state.board_leds.uno = false;
    state.board_leds.mega = false;
    sendToBoard('uno', 'LEDOFF');
    sendToBoard('mega', 'LEDOFF');
    broadcastState();
    res.json({ ok: true, msg: 'Все бортовые диоды выключены' });
});

// ========== LOG BUFFER ==========
const logBuffer = { serial: [], server: [] };
const MAX_LOG_ENTRIES = 200;

function addLog(category, line) {
    const entry = { time: new Date().toISOString(), line: line };
    if (!logBuffer[category]) logBuffer[category] = [];
    logBuffer[category].push(entry);
    if (logBuffer[category].length > MAX_LOG_ENTRIES) {
        logBuffer[category] = logBuffer[category].slice(-MAX_LOG_ENTRIES);
    }
}

const origLog = console.log;
console.log = function(...args) {
    origLog.apply(console, args);
    addLog('server', args.join(' '));
};

app.get('/api/logs', (req, res) => {
    res.json({
        serial: logBuffer.serial.slice(-50).map(e => `${new Date(e.time).toLocaleTimeString()} ${e.line}`),
        server: logBuffer.server.slice(-50).map(e => `${new Date(e.time).toLocaleTimeString()} ${e.line}`)
    });
});

app.get('/api/server/status', (req, res) => {
    res.json(systemMonitor.getStatus());
});

// ========== START ==========
server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`\n🤖 Robot Catty Server running on http://0.0.0.0:${WEB_PORT}`);
    console.log(`   WebSocket: ws://0.0.0.0:${WEB_PORT}/ws`);
    console.log(`   Uno: ${UNO_PORT} @${UNO_BAUD}baud | Mega: ${MEGA_PORT} @${MEGA_BAUD}baud`);
    console.log(`   Config: http://0.0.0.0:${WEB_PORT}/api/config`);
    console.log(`   Swagger UI: http://0.0.0.0:${WEB_PORT}/api/docs`);
    initSerial();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (unoPort) unoPort.close();
    if (megaPort) megaPort.close();
    server.close();
    process.exit(0);
});