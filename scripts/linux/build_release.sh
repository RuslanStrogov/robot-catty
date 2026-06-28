#!/bin/bash
# ============================================================
# Robot Catty — Build Release Package (Linux / macOS / WSL)
# Usage: bash scripts/build_release.sh
# Creates: release/ directory with all artifacts
# ============================================================

set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  Robot Catty — Building Release"
echo "=========================================="

# Clean
rm -rf release
mkdir -p release/firmware/servo_head
mkdir -p release/firmware/servo_body
mkdir -p release/app
mkdir -p release/scripts/linux
mkdir -p release/scripts/windows
mkdir -p release/docs

# ---- Compile firmware ----
echo ""
echo "[1/4] Compiling firmware..."

# Find AVR core
find_avr_core() {
    for path in \
        "$HOME/.arduino15/packages/arduino/hardware/avr/1.8.6/cores/arduino" \
        "/opt/arduino-avr-core/cores/arduino"; do
        if [ -d "$path" ]; then echo "$path"; return; fi
    done
    return 1
}

CORE=$(find_avr_core)
if [ -z "$CORE" ]; then
    echo "  AVR core not found, downloading..."
    mkdir -p /opt/avr-tmp && cd /opt/avr-tmp
    curl -sL https://github.com/arduino/ArduinoCore-avr/archive/refs/tags/1.8.6.tar.gz | tar xz
    CORE="/opt/avr-tmp/ArduinoCore-avr-1.8.6/cores/arduino"
    VAR="/opt/avr-tmp/ArduinoCore-avr-1.8.6/variants/standard"
else
    VAR="$(dirname "$CORE")/../variants/standard"
fi

echo "  Core: $CORE"

# Compile Uno (Head)
echo "  Compiling servo_head..."
CPPS="$CORE/CDC.cpp $CORE/HardwareSerial.cpp $CORE/HardwareSerial0.cpp $CORE/HardwareSerial1.cpp $CORE/HardwareSerial2.cpp $CORE/HardwareSerial3.cpp $CORE/IPAddress.cpp $CORE/PluggableUSB.cpp $CORE/Print.cpp $CORE/Stream.cpp $CORE/Tone.cpp $CORE/USBCore.cpp $CORE/WMath.cpp $CORE/WString.cpp $CORE/abi.cpp $CORE/new.cpp $CORE/wiring.c $CORE/wiring_analog.c $CORE/wiring_digital.c $CORE/wiring_pulse.c $CORE/wiring_shift.c $CORE/hooks.c $CORE/WInterrupts.c $CORE/main.cpp"

# Strip #include <Arduino.h> from source
CPP="firmware/servo_head/servo_head.cpp"
sed 's/^#include <Arduino.h>//' "$CPP" > /tmp/sketch_uno.cpp

avr-gcc -mmcu=atmega328p -DF_CPU=16000000L \
  -DARDUINO=10607 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR \
  -I"$CORE" -I"$VAR" \
  -Os -w -std=gnu++11 -fpermissive -fno-exceptions \
  -ffunction-sections -fdata-sections -fno-threadsafe-statics -flto \
  $CPPS /tmp/sketch_uno.cpp -o /tmp/servo_head.elf -lm

avr-objcopy -O ihex -R .eeprom /tmp/servo_head.elf release/firmware/servo_head/servo_head.hex
echo "  ✓ servo_head.hex ($(wc -c < release/firmware/servo_head/servo_head.hex) bytes)"

# Compile Mega (Body)
echo "  Compiling servo_body..."
if command -v arduino-cli &> /dev/null; then
    arduino-cli compile -b arduino:avr:mega firmware/servo_body/ --output-dir /tmp/mega_out 2>/dev/null
    cp /tmp/mega_out/servo_body.ino.hex release/firmware/servo_body/servo_body.hex
else
    echo "  arduino-cli not found, using fallback..."
    # Manual compilation for Mega
    CPPS_MEGA="$CPPS"
    sed 's/^#include <Arduino.h>//' firmware/servo_body/servo_body.ino > /tmp/sketch_mega.cpp
    avr-gcc -mmcu=atmega2560 -DF_CPU=16000000L \
      -DARDUINO=10607 -DARDUINO_AVR_MEGA2560 -DARDUINO_ARCH_AVR \
      -I"$CORE" -I"$VAR" \
      -Os -w -std=gnu++11 -fpermissive -fno-exceptions \
      -ffunction-sections -fdata-sections -fno-threadsafe-statics -flto \
      $CPPS_MEGA /tmp/sketch_mega.cpp -o /tmp/servo_body.elf -lm
    avr-objcopy -O ihex -R .eeprom /tmp/servo_body.elf release/firmware/servo_body/servo_body.hex
fi
echo "  ✓ servo_body.hex ($(wc -c < release/firmware/servo_body/servo_body.hex) bytes)"

# ---- Copy web app ----
echo ""
echo "[2/4] Copying web app..."
cp server/public/index.html release/app/index.html
cp server/server.js release/app/server.js
cp server/package.json release/app/package.json
echo "  ✓ Web app copied"

# ---- Copy scripts ----
echo ""
echo "[3/4] Copying scripts..."
cp scripts/linux/flash_all.sh release/scripts/linux/flash_all.sh
chmod +x release/scripts/linux/flash_all.sh
echo "  ✓ Scripts copied"

# ---- Copy docs ----
echo ""
echo "[4/4] Copying docs..."
cp README.md release/docs/
cp docs/wiring.md release/docs/ 2>/dev/null || true
cp docs/wiring-3servo.md release/docs/ 2>/dev/null || true
echo "  ✓ Docs copied"

# ---- Create version info ----
echo ""
echo "Creating version info..."
cat > release/VERSION.txt << EOF
Robot Catty Release
Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Git: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

Contents:
- firmware/servo_head/servo_head.hex  (Uno: 3 servos + RGB)
- firmware/servo_body/servo_body.hex  (Mega: 4 servos)
- app/index.html                      (Web UI)
- app/server.js                      (Node.js backend)
- app/package.json
- scripts/linux/flash_all.sh          (Linux flasher)
- docs/README.md
- docs/wiring.md
EOF

echo "  ✓ VERSION.txt created"

# ---- Package ----
echo ""
echo "Packaging..."
tar czf "release/robot-catty-$(date +%Y%m%d).tar.gz" -C release/ .
echo "  ✓ release/robot-catty-$(date +%Y%m%d).tar.gz"

echo ""
echo "=========================================="
echo "  Release built successfully!"
echo "  Files in: release/"
echo "=========================================="
ls -la release/
