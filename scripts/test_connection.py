#!/usr/bin/env python3
"""Test Arduino connection on Raspberry Pi"""

import serial
import sys

PORTS = ["/dev/ttyACM0", "/dev/ttyUSB0"]
BAUD = 9600

for port in PORTS:
    try:
        ser = serial.Serial(port, BAUD, timeout=2)
        ser.dtr = False
        import time
        time.sleep(0.1)
        ser.dtr = True
        time.sleep(2.5)
        ser.reset_input_buffer()
        ser.write(b"STATUS\n")
        time.sleep(0.5)
        resp = ser.readline().decode().strip()
        if resp:
            print(f"✅ {port}: {resp}")
        else:
            print(f"⚠️  {port}: connected but no response (sketch not loaded?)")
        ser.close()
    except Exception as e:
        print(f"❌ {port}: {e}")
