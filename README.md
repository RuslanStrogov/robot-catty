# robot-katty

Raspberry Pi 3B + Arduino Mega 2560 + Arduino Uno (CH340) robot platform.

## Hardware

| Component | Connection | Port |
|-----------|-----------|------|
| Raspberry Pi 3B | Ethernet/WiFi | 192.168.10.152 |
| Arduino Mega 2560 R3 | USB | /dev/ttyACM0 |
| Arduino Uno (CH340) | USB | /dev/ttyUSB0 |
| RGB LED | Uno pins 9/10/11 | — |

## Quick Start

```bash
# Clone on Pi
git clone <repo-url> ~/robot-katty
cd ~/robot-katty

# Control RGB LED
python3 scripts/rgb_led.py preset red
python3 scripts/rgb_led.py color 100 200 50
python3 scripts/rgb_led.py off
```

## See Also

- [Config](config/arduino_config.md) — board details, wiring
- [Firmware](firmware/) — Arduino sketches
- [Scripts](scripts/) — Python control scripts
