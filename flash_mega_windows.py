#!/usr/bin/env python3
"""
Flash Mega 2560 from Windows PC directly.
Run this script on the Windows machine where Mega is connected via USB.
"""
import subprocess
import sys
import os
import time

# Find avrdude
arduino_path = r"C:\Users\Ruslan\AppData\Local\Arduino15\packages\arduino\tools\avr-gcc\7.3.0-atmel3.6.1-arduino7\bin"
avrdude = os.path.join(arduino_path, "avrdude.exe")

# Find the hex file
hex_file = os.path.join(os.path.dirname(__file__), "firmware", "mega_controller", ".pio", "build", "megaatmega2560", "firmware.hex")

# Find avrdude config
avrdude_conf = os.path.join(arduino_path, "avrdude.conf")

if not os.path.exists(avrdude):
    print(f"ERROR: avrdude not found at {avrdude}")
    sys.exit(1)

if not os.path.exists(hex_file):
    print(f"ERROR: hex file not found at {hex_file}")
    sys.exit(1)

# Find Mega COM port
import serial.tools.list_ports
ports = serial.tools.list_ports.comports()
mega_port = None
for p in ports:
    if "2341" in p.hwid or "0042" in p.hwid or "Mega" in p.description or "Arduino" in p.description:
        mega_port = p.device
        print(f"Found Mega at: {p.device} - {p.description}")
        break

if not mega_port:
    print("Mega not found. Available ports:")
    for p in ports:
        print(f"  {p.device}: {p.description} [{p.hwid}]")
    mega_port = input("Enter COM port (e.g. COM3): ").strip()

print(f"Using port: {mega_port}")
print(f"Flashing: {hex_file}")

# Flash
cmd = [
    avrdude,
    "-C", avrdude_conf,
    "-c", "arduino",
    "-p", "m2560",
    "-P", mega_port,
    "-b", "115200",
    "-U", f"flash:w:{hex_file}"
]

result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
print(result.stdout)
if result.stderr:
    print(result.stderr)

if result.returncode == 0:
    print("\n✅ Flash successful!")
    print("Open Serial Monitor at 115200 baud and send PING to test.")
else:
    print(f"\n❌ Flash failed (code {result.returncode})")
