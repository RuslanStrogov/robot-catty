const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const ArduinoService = require('./services/arduino');
const RobotService = require('./services/robot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const arduino = new ArduinoService();
const robot = new RobotService(arduino);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API routes
app.get('/api/status', (req, res) => {
    res.json({
        connected: arduino.isConnected(),
        ports: arduino.getPorts(),
        state: robot.getState()
    });
});

app.post('/api/servo', (req, res) => {
    const { board, servo, angle } = req.body;
    robot.setServo(board, servo, angle);
    res.json({ ok: true });
});

app.post('/api/rgb', (req, res) => {
    const { r, g, b } = req.body;
    robot.setRGB(r, g, b);
    res.json({ ok: true });
});

app.post('/api/rgb/off', (req, res) => {
    robot.setRGB(0, 0, 0);
    res.json({ ok: true });
});

app.post('/api/rgb/preset', (req, res) => {
    const { name } = req.body;
    robot.runPreset(name);
    res.json({ ok: true });
});

app.post('/api/animation', (req, res) => {
    const { name, params } = req.body;
    robot.runAnimation(name, params);
    res.json({ ok: true });
});

app.post('/api/animation/stop', (req, res) => {
    robot.stopAnimation();
    res.json({ ok: true });
});

// WebSocket
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', state: robot.getState() }));

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleWS(ws, msg);
        } catch (e) {}
    });

    // Broadcast state changes
    robot.on('state', (state) => {
        const payload = JSON.stringify({ type: 'state', data: state });
        wss.clients.forEach(client => {
            if (client.readyState === 1) client.send(payload);
        });
    });
});

function handleWS(ws, msg) {
    switch (msg.type) {
        case 'servo':
            robot.setServo(msg.board, msg.servo, msg.angle);
            break;
        case 'rgb':
            robot.setRGB(msg.r, msg.g, msg.b);
            break;
        case 'preset':
            robot.runPreset(msg.name);
            break;
        case 'animation':
            robot.runAnimation(msg.name, msg.params);
            break;
        case 'stop':
            robot.stopAnimation();
            break;
        case 'status':
            ws.send(JSON.stringify({ type: 'state', state: robot.getState() }));
            break;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Robot Catty server running on port ${PORT}`);
    arduino.autoConnect();
});
