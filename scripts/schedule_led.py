#!/usr/bin/env python3
"""
robot-katty RGB LED Day Schedule
Runs continuously, changes color based on time of day.

Schedule:
  06:00-09:00  -> Warm white (morning)
  09:00-12:00  -> Cool white (work)
  12:00-14:00  -> Green (lunch)
  14:00-18:00  -> Blue (afternoon focus)
  18:00-21:00  -> Warm orange (evening)
  21:00-23:00  -> Purple (relax)
  23:00-06:00  -> OFF (night)
"""
import serial
import time
import sys
from datetime import datetime

PORT = '/dev/ttyUSB0'
BAUD = 9600
CHECK_INTERVAL = 300  # check every 5 minutes

SCHEDULE = [
    (0, 6,   0,   0,   0,   'Night OFF'),
    (6, 9,   255, 200, 150, 'Morning warm'),
    (9, 12,  200, 200, 255, 'Work cool'),
    (12, 14, 0,   255, 0,   'Lunch green'),
    (14, 18, 0,   100, 255, 'Afternoon blue'),
    (18, 21, 255, 147, 41,  'Evening orange'),
    (21, 23, 128, 0,   128, 'Relax purple'),
    (23, 24, 0,   0,   0,   'Night OFF'),
]

def get_target_color(hour):
    for start, end, r, g, b, label in SCHEDULE:
        if start <= hour < end:
            return r, g, b, label
    return 0, 0, 0, 'Default OFF'

def send_color(ser, r, g, b):
    try:
        cmd = f'{r},{g},{b}\n'
        ser.write(cmd.encode())
        time.sleep(0.3)
        resp = ''
        while ser.in_waiting:
            resp += ser.readline().decode().strip()
        return resp
    except:
        return None

def main():
    print('=== robot-katty LED Schedule ===', flush=True)
    ser = None
    last_label = None

    while True:
        now = datetime.now()
        hour = now.hour + now.minute / 60
        r, g, b, label = get_target_color(hour)

        # Reconnect if needed
        if ser is None:
            try:
                ser = serial.Serial(PORT, BAUD, timeout=2)
                time.sleep(2)
                print(f'Connected to {PORT}', flush=True)
            except Exception as e:
                print(f'Connection failed: {e}, retry in 30s', flush=True)
                time.sleep(30)
                continue

        if label != last_label:
            resp = send_color(ser, r, g, b)
            if resp is None:
                print('Connection lost, reconnecting...', flush=True)
                try:
                    ser.close()
                except:
                    pass
                ser = None
                continue
            print(f'[{now.strftime("%H:%M")}] {label} -> R={r} G={g} B={b} | {resp}', flush=True)
            last_label = label
        else:
            print(f'[{now.strftime("%H:%M")}] {label} (unchanged)', flush=True)

        time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    main()
