# robot-katty — Arduino Configuration

## Boards

| Board | USB ID | Port | Driver | Role |
|-------|--------|------|--------|------|
| Arduino Mega 2560 R3 | 2341:0042 | /dev/ttyACM0 | CDC ACM | Main controller |
| Arduino Uno (CH340) | 1a86:7523 | /dev/ttyUSB0 | CH341 | RGB LED + sensors |

## Raspberry Pi

- OS: Ubuntu 24.04 LTS, aarch64
- User in dialout: YES (serial access without sudo)
- pyserial: installed
- Node.js: v18+

## RGB LED Wiring (Arduino Uno)

```
Arduino Uno Pin 9  ---[220Ω]--- RED   LED
Arduino Uno Pin 10 ---[220Ω]--- GREEN LED
Arduino Uno Pin 11 ---[220Ω]--- BLUE  LED
Arduino Uno GND  -----------  CATHODE (GND)
```

## Serial Protocol (9600 baud)

| Command | Description | Example |
|---------|-------------|---------|
| `R,G,B\n` | Set color (0-255) | `255,100,0\n` |
| `OFF\n` | Turn off | `OFF\n` |
| `STATUS\n` | Query state | `STATUS\n` |

## arduino-cli Upload

```bash
# Install arduino-cli on Pi
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
export PATH=$PATH:$HOME/bin

# Compile & upload RGB LED sketch
arduino-cli compile --fqbn arduino:avr:uno firmware/rgb_led/
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno firmware/rgb_led/
```
