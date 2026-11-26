const { execSync } = require('child_process');
const os = require('os');

class SystemMonitor {
    constructor() {
        this.prevTotal = 0;
        this.prevIdle = 0;
    }

    _exec(cmd) {
        try {
            return execSync(cmd, { timeout: 3000, encoding: 'utf8' }).trim();
        } catch {
            return null;
        }
    }

    _getUptime() {
        const raw = this._exec('cat /proc/uptime');
        if (!raw) return os.uptime();
        return parseFloat(raw.split(' ')[0]);
    }

    _getCpuUsage() {
        // Read /proc/stat for delta-based CPU%
        const stat1 = this._exec('cat /proc/stat');
        if (!stat1) return '—';
        const parts1 = stat1.split('\n')[0].split(/\s+/);
        const total1 = parts1.slice(1).reduce((a, v) => a + parseInt(v), 0);
        const idle1 = parseInt(parts1[4]);

        // Short sleep
        const stat2 = this._exec('cat /proc/stat');
        if (!stat2) return '—';
        const parts2 = stat2.split('\n')[0].split(/\s+/);
        const total2 = parts2.slice(1).reduce((a, v) => a + parseInt(v), 0);
        const idle2 = parseInt(parts2[4]);

        const deltaTotal = total2 - total1;
        const deltaIdle = idle2 - idle1;
        const usage = ((deltaTotal - deltaIdle) / deltaTotal) * 100;
        return `${Math.round(usage)}%`;
    }

    _getCpuTemp() {
        const raw = this._exec('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null');
        if (!raw) return '—';
        const temp = parseInt(raw) / 1000;
        return `${temp}°C`;
    }

    _getMemory() {
        const raw = this._exec('free -m');
        if (!raw) {
            const total = Math.round(os.totalmem() / 1024 / 1024);
            const free = Math.round(os.freemem() / 1024 / 1024);
            return `${total - free}/${total} MB`;
        }
        const match = raw.match(/^Mem:\s+(\d+)\s+(\d+)\s+(\d+)/m);
        if (match) {
            return `${match[2]}/${match[1]} MB`;
        }
        return '—';
    }

    _getDisk() {
        // Find root partition (usually /dev/root or mmcblk0p2)
        const raw = this._exec("df -h / | tail -1");
        if (!raw) return '—';
        const parts = raw.split(/\s+/);
        if (parts.length >= 5) {
            return `${parts[2]} / ${parts[1]} (${parts[4]} used)`;
        }
        return '—';
    }

    _getNetwork() {
        const interfaces = os.networkInterfaces();
        const lines = [];
        for (const [name, addrs] of Object.entries(interfaces)) {
            if (!addrs) continue;
            // Skip loopback
            const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal);
            const ipv6 = addrs.find(a => a.family === 'IPv6' && !a.internal);
            if (ipv4 || ipv6) {
                const ips = [ipv4?.address, ipv6?.address].filter(Boolean).join(', ');
                const state = this._exec(`cat /sys/class/net/${name}/operstate 2>/dev/null`);
                const status = state === 'up' ? '🟢' : state === 'down' ? '🔴' : '⚪';
                lines.push(`${status} ${name}: ${ips}`);
            }
        }
        return lines.join(' · ') || '—';
    }

    _getVoltage() {
        // Try to get voltage from various Pi sources
        const raw = this._exec("vcgencmd measure_volts core 2>/dev/null");
        if (raw) return raw;
        // Alternative
        const raw2 = this._exec("cat /sys/devices/platform/soc/soc:firmware/get_throttled 2>/dev/null || echo ''");
        if (raw2) return 'checking...';
        return '—';
    }

    getStatus() {
        const uptime = this._getUptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        return {
            uptime: `${days}д ${hours}ч ${minutes}м`,
            uptimeSeconds: uptime,
            cpu: this._getCpuUsage(),
            cpuTemp: this._getCpuTemp(),
            memory: this._getMemory(),
            disk: this._getDisk(),
            network: this._getNetwork(),
            voltage: this._getVoltage(),
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            loadAvg: os.loadavg().map(v => v.toFixed(2)).join(', '),
            processes: os.cpus().length > 0 ? os.cpus().length : '—'
        };
    }
}

module.exports = SystemMonitor;