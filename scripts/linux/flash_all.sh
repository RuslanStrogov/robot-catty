#!/bin/bash
# ============================================================
# Robot Catty — Flash All Firmware (Linux / macOS / WSL)
# Usage: bash scripts/flash_all.sh [port_uno] [port_mega]
# ============================================================

set -e

PORT_UNO="${1:-/dev/ttyUSB0}"
PORT_MEGA="${2:-/dev/ttyACM0}"
BAUD="115200"

echo "=========================================="
echo "  Robot Catty — Firmware Flasher"
echo "=========================================="
echo "  Uno:  $PORT_UNO"
echo "  Mega: $PORT_MEGA"
echo "=========================================="
echo ""

# Check avrdude
if ! command -v avrdude &> /dev/null; then
    echo "ERROR: avrdude not found. Install: sudo apt install avrdude"
    exit 1
fi

# Kill anything holding the ports
echo "[1/4] Killing processes on serial ports..."
sudo fuser -k "$PORT_UNO" 2>/dev/null || true
sudo fuser -k "$PORT_MEGA" 2>/dev/null || true
sleep 2

# ---- Arduino Uno (Head: 3 servos + RGB) ----
echo ""
echo "[2/4] Flashing Arduino Uno (Head) on $PORT_UNO ...""
if [ -f "release/firmware/servo_head/servo_head.hex" ]; then
    HEX="release/firmware/servo_head/servo_head.hex"
else
    echo "  HEX not found, compiling from source..."
    CORE="$HOME/.arduino15/packages/arduino/hardware/avr/1.8.6/cores/arduino"
    VAR="$HOME/.arduino15/packages/arduino/hardware/avr/1.8.6/variants/standard"
    if [ ! -d "$CORE" ]; then
        CORE="/opt/arduino-avr-core/cores/arduino"
        VAR="/opt/arduino-avr-core/variants/standard"
    fi
    CPP="firmware/servo_head/servo_head.cpp"
    # Remove #include <Arduino.h> if present (avr-gcc adds it)
    sed -i 's/^#include <Arduino.h>//' "$CPP"
    avr-gcc -mmcu=atmega328p -DF_CPU=16000000L \
      -DARDUINO=10607 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR \
      -I"$CORE" -I"$VAR" \
      -Os -w -std=gnu++11 -fpermissive -fno-exceptions \
      -ffunction-sections -fdata-sections -fno-threadsafe-statics -flto \
      "$CORE"/*.cpp "$CORE"/*.c \
      "$CPP" -o /tmp/servo_head.elf -lm
    avr-objcopy -O ihex -R .eeprom /tmp/servo_head.elf /tmp/servo_head.hex
    HEX="/tmp/servo_head.hex"
fi

avrdude -patmega328p -carduino -P"$PORT_UNO" -b"$BAUD" -D -Uflash:w:"$HEX":i
echo "  ✓ Uno flashed successfully!"

# ---- Arduino Mega (Body: 4 servos) ----
echo ""
echo "[3/4] Flashing Arduino Mega (Body) on $PORT_MEGA ..."
if [ -f "release/firmware/servo_body/servo_body.hex" ]; then
    HEX="release/firmware/servo_body/servo_body.hex"
else
    echo "  HEX not found, compiling from source..."
    # Try arduino-cli first
    if command -v arduino-cli &> /dev/null; then
        arduino-cli compile -b arduino:avr:mega firmware/servo_body/ --output-dir /tmp/
        HEX="/tmp/servo_body.ino.hex"
    else
        echo "ERROR: arduino-cli not found and no prebuilt HEX."
        echo "Install arduino-cli or run 'bash scripts/build_release.sh' first."
        exit 1
    fi
fi

avrdude -patmega2560 -cwiring -P"$PORT_MEGA" -b"$BAUD" -D -Uflash:w:"$HEX":i
echo "  ✓ Mega flashed successfully!"

# ---- Verify ----
echo ""
echo "[4/4] Verifying ..."
sleep 2
echo "  Uno (9600 baud):"
echo "STATUS" > "$PORT_UNO" 2>/dev/null && sleep 1 && head -1 "$PORT_UNO" 2>/dev/null || echo "  (could not read response)"
echo "  Mega (9600 baud):"
echo "STATUS" > "$PORT_MEGA" 2>/dev/null && sleep 1 && head -1 "$PORT_MEGA" 2>/dev/null || echo "  (could not read response)"

echo ""
echo "=========================================="
echo "  ✓ All firmware flashed!"
echo "=========================================="
