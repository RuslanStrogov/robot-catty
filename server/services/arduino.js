const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

class ArduinoService extends EventEmitter {
    constructor() {
        super();
        this.ports = {
            uno: null,   // Head board
            mega: null   // Body board
        };
        this.parsers = {};
    }

    async listPorts() {
        const ports = await SerialPort.list();
        return ports.filter(p =>
            p.vendorId === '1a86' ||  // CH340 (Uno)
            p.vendorId === '2341'     // Arduino (Mega)
        );
    }

    async autoConnect() {
        const ports = await this.listPorts();
        for (const port of ports) {
            if (port.vendorId === '1a86') {
                await this.connectUno(port.path);
            } else if (port.vendorId === '2341') {
                await this.connectMega(port.path);
            }
        }
    }

    async connectUno(path) {
        return this.connect('uno', path, 9600);
    }

    async connectMega(path) {
        return this.connect('mega', path, 9600);
    }

    async connect(name, path, baudRate) {
        return new Promise((resolve, reject) => {
            const port = new SerialPort({ path, baudRate }, (err) => {
                if (err) {
                    console.error(`Failed to connect ${name}:`, err.message);
                    reject(err);
                    return;
                }
                this.ports[name] = port;
                const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
                this.parsers[name] = parser;
                parser.on('data', (line) => {
                    this.emit('data', { board: name, line: line.trim() });
                });
                console.log(`${name} connected on ${path}`);
                this.emit('connected', name);
                resolve();
            });
        });
    }

    send(board, command) {
        const port = this.ports[board];
        if (port && port.writable) {
            port.write(command + '\n');
        }
    }

    sendUno(command) { this.send('uno', command); }
    sendMega(command) { this.send('mega', command); }

    isConnected() {
        return {
            uno: this.ports.uno?.writable || false,
            mega: this.ports.mega?.writable || false
        };
    }

    getPorts() {
        return Object.entries(this.ports).map(([name, port]) => ({
            name,
            path: port?.path,
            connected: port?.writable || false
        }));
    }

    disconnect() {
        Object.values(this.ports).forEach(port => {
            if (port) port.close();
        });
    }
}

module.exports = ArduinoService;
