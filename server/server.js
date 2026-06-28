const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ========== CONFIG ==========
const UNO_PORT = process.env.UNO_PORT || '/dev/ttyUSB0';
const MEGA_PORT = process.env.MEGA_PORT || '/dev/ttyACM0';
const BAUD_RATE = 9600;
const WEB_PORT = process.env.WEB_PORT || 3000;

// ========== STATE ==========
const state = {
    servos: {
        eyeL: 90, eyeR: 90, jaw: 90,
        shoulderL: 90, shoulderR: 90, elbowL: 90, elbowR: 90
    },
    rgb: { r: 0, g: 0, b: 0 },
    animation: null,
    connections: { uno: false, mega: false }
};

// ========== SERIAL PORTS ==========
let unoPort = null;
let megaPort = null;

function initSerial() {
    // Arduino Uno (Head)
    try {
        unoPort = new SerialPort({ path: UNO_PORT, baudRate: BAUD_RATE, autoOpen: false });
        const unoParser = unoPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        unoPort.open((err) => {
            if (err) {
                console.log('[UNO] Open error:', err.message);
                state.connections.uno = false;
            } else {
                console.log('[UNO] Connected on', UNO_PORT);
                state.connections.uno = true;
                broadcastState();
            }
        });

        unaParser.on('data', (line) => {
            line = line.trim();
            if (!line) return;
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
        megaPort = new SerialPort({ path: MEGA_PORT, baudRate: BAUD_RATE, autoOpen: false });
        const megaParser = megaPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        megaPort.open((err) => {
            if (err) {
                console.log('[MEGA] Open error:', err.message);
                state.connections.mega = false;
            } else {
                console.log('[MEGA] Connected on', MEGA_PORT);
                state.connections.mega = true;
                broadcastState();
            }
        });

        megaParser.on('data', (line) => {
            line = line.trim();
            if (!line) return;
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
    // Parse STATUS responses
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
    
    // Send current state
    ws.send(JSON.stringify({ type: 'state', data: state, connections: state.connections }));

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
        case 'servo':
            const board = ['eyeL','eyeR','jaw'].includes(req.servo) ? 'uno' : 'mega';
            sendToBoard(board, `SERVO:${req.servo}:${req.angle}`);
            state.servos[req.servo] = req.angle;
            break;
        
        case 'rgb':
            sendToBoard('uno', `RGB:${req.r},${req.g},${req.b}`);
            state.rgb = { r: req.r, g: req.g, b: req.b };
            broadcastState();
            break;
        
        case 'cmd':
            if (req.data === 'HOME' || req.data === 'STATUS') {
                sendToBoard('uno', req.data);
            } else if (req.data === 'CENTER' || req.data === 'STATUS') {
                sendToBoard('mega', req.data);
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
    // Simple animation sequences
    switch (name) {
        case 'wave': // shake shoulder
            const waveInterval = setInterval(() => {
                if (state.animation !== 'wave') { clearInterval(waveInterval); return; }
                state.servo.shoulderR = state.servo.shoulderR === 90 ? 45 : 90;
                sendToBoard('mega', `SERVO:shoulderR:${state.servo.shoulderR}`);
                broadcastState();
            }, 800);
            break;
        case 'nod': // jaw open/close
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
}

// ========== REST API ==========
app.use(express.json());
app.use(express.static('public'));

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

// ========== START ==========
server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`\n🤖 Robot Catty Server running on http://0.0.0.0:${WEB_PORT}`);
    console.log(`   WebSocket: ws://0.0.0.0:${WEB_PORT}/ws`);
    console.log(`   Uno: ${UNO_PORT} | Mega: ${MEGA_PORT}\n`);
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
