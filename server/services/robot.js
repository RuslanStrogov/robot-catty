const EventEmitter = require('events');

class RobotService extends EventEmitter {
    constructor(arduino) {
        super();
        this.arduino = arduino;
        this.state = {
            servos: {
                head: { eyeL: 90, eyeR: 90, jaw: 90, headRot: 90, neckUD: 90, neckLR: 90 },
                body: { shoulderL: 90, shoulderR: 90, elbowL: 90, elbowR: 90 }
            },
            rgb: { r: 0, g: 0, b: 0 },
            animation: null
        };
        this.animationInterval = null;
        this.presets = {
            red:     { r: 255, g: 0,   b: 0 },
            green:   { r: 0,   g: 255, b: 0 },
            blue:    { r: 0,   g: 0,   b: 255 },
            white:   { r: 255, g: 255, b: 255 },
            yellow:  { r: 255, g: 255, b: 0 },
            cyan:    { r: 0,   g: 255, b: 255 },
            magenta: { r: 255, g: 0,   b: 255 },
            orange:  { r: 255, g: 165, b: 0 },
            pink:    { r: 255, g: 192, b: 203 },
            purple:  { r: 128, g: 0,   b: 128 }
        };
    }

    getState() { return this.state; }

    setServo(board, servo, angle) {
        angle = Math.max(0, Math.min(180, parseInt(angle)));
        if (board === 'head') {
            this.state.servos.head[servo] = angle;
            this.arduino.sendUno(`SERVO:${servo}:${angle}`);
        } else if (board === 'body') {
            this.state.servos.body[servo] = angle;
            this.arduino.sendMega(`SERVO:${servo}:${angle}`);
        }
        this.emit('state', this.state);
    }

    setRGB(r, g, b) {
        this.state.rgb = { r, g, b };
        this.arduino.sendUno(`RGB:${r},${g},${b}`);
        this.emit('state', this.state);
    }

    runPreset(name) {
        const preset = this.presets[name];
        if (preset) {
            this.setRGB(preset.r, preset.g, preset.b);
        }
    }

    runAnimation(name, params = {}) {
        this.stopAnimation();
        this.state.animation = name;

        switch (name) {
            case 'wave': this._wave(params); break;
            case 'nod': this._nod(params); break;
            case 'shake': this._shake(params); break;
            case 'dance': this._dance(params); break;
            case 'lookAround': this._lookAround(params); break;
            case 'blink': this._blink(params); break;
        }
        this.emit('state', this.state);
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        this.state.animation = null;
        this.emit('state', this.state);
    }

    // Animations
    _wave(params) {
        const { side = 'right', speed = 500 } = params;
        const servo = side === 'right' ? 'shoulderR' : 'shoulderL';
        let angle = 90;
        let dir = 1;
        this.animationInterval = setInterval(() => {
            angle += dir * 15;
            if (angle >= 150) dir = -1;
            if (angle <= 30) dir = 1;
            this.setServo('body', servo, angle);
        }, speed);
    }

    _nod(params) {
        const { speed = 300 } = params;
        let angle = 90;
        let dir = 1;
        this.animationInterval = setInterval(() => {
            angle += dir * 10;
            if (angle >= 120) dir = -1;
            if (angle <= 60) dir = 1;
            this.setServo('head', 'neckUD', angle);
        }, speed);
    }

    _shake(params) {
        const { speed = 200 } = params;
        let angle = 90;
        let dir = 1;
        this.animationInterval = setInterval(() => {
            angle += dir * 20;
            if (angle >= 130) dir = -1;
            if (angle <= 50) dir = 1;
            this.setServo('head', 'headRot', angle);
        }, speed);
    }

    _dance(params) {
        const { speed = 400 } = params;
        let t = 0;
        this.animationInterval = setInterval(() => {
            t += 0.5;
            this.setServo('head', 'headRot', 90 + Math.sin(t) * 30);
            this.setServo('head', 'neckUD', 90 + Math.cos(t) * 20);
            this.setServo('body', 'shoulderL', 90 + Math.sin(t + 1) * 40);
            this.setServo('body', 'shoulderR', 90 + Math.cos(t + 1) * 40);
        }, speed);
    }

    _lookAround(params) {
        const { speed = 600 } = params;
        let t = 0;
        this.animationInterval = setInterval(() => {
            t += 0.3;
            this.setServo('head', 'headRot', 90 + Math.sin(t) * 40);
            this.setServo('head', 'neckLR', 90 + Math.cos(t * 0.7) * 20);
        }, speed);
    }

    _blink(params) {
        const { speed = 1000, color = 'red' } = params;
        const preset = this.presets[color] || this.presets.red;
        let on = false;
        this.animationInterval = setInterval(() => {
            on = !on;
            if (on) {
                this.setRGB(preset.r, preset.g, preset.b);
            } else {
                this.setRGB(0, 0, 0);
            }
        }, speed);
    }
}

module.exports = RobotService;
