#!/usr/bin/env python3
"""
robot-katty RGB LED startup sequence:
1. Rainbow cycle for 30 seconds (startup animation)
2. Set GREEN (ready state)
"""
import serial
import time
import sys

PORT = '/dev/ttyUSB0'
BAUD = 9600

def send(ser, cmd):
    ser.write((cmd + '\n').encode())
    time.sleep(0.3)
    resp = ''
    while ser.in_waiting:
        resp += ser.readline().decode().strip() + ' '
    return resp.strip()

def main():
    # Wait for Arduino
    for _ in range(30):
        try:
            ser = serial.Serial(PORT, BAUD, timeout=2)
            time.sleep(2)
            resp = send(ser, 'STATUS')
            if 'RGB=' in resp:
                print(f'Arduino ready: {resp}')
                break
        except:
            time.sleep(1)
    else:
        print('Arduino not found!')
        sys.exit(1)

    # 1. Rainbow startup animation (~30 sec)
    rainbow = [
        (255, 0, 0), (255, 127, 0), (255, 255, 0),
        (0, 255, 0), (0, 0, 255), (75, 0, 130), (148, 0, 211),
    ]
    print('Startup rainbow animation...')
    for r, g, b in rainbow:
        send(ser, f'{r},{g},{b}')
        time.sleep(0.5)
    # Repeat to fill ~30 sec
    for r, g, b in rainbow:
        send(ser, f'{r},{g},{b}')
        time.sleep(0.5)
    for r, g, b in rainbow:
        send(ser, f'{r},{g},{b}')
        time.sleep(0.5)
    for r, g, b in rainbow[:4]:
        send(ser, f'{r},{g},{b}')
        time.sleep(0.5)

    # 2. Set GREEN — ready
    resp = send(ser, '0,255,0')
    print(f'Ready: {resp}')

    ser.close()

if __name__ == '__main__':
    main()
