#!/usr/bin/env python3
"""RGB LED Demo - runs on system startup"""
import serial
import time
import sys

SERIAL_PORT = '/dev/ttyUSB0'
BAUD_RATE = 9600

def send(ser, cmd):
    ser.write((cmd + "\n").encode())
    time.sleep(0.3)
    return ser.read(100).decode().strip()

def wait_with_countdown(seconds, label):
    """Wait with progress output"""
    for remaining in range(seconds, 0, -1):
        mins, secs = divmod(remaining, 60)
        sys.stdout.write(f"\r  {label}: {mins:02d}:{secs:02d} remaining")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write("\n")

def main():
    print("=" * 50)
    print("  RGB LED Demo - Starting")
    print("=" * 50)
    
    # Wait for Arduino to be ready
    print("\n[1/4] Waiting for Arduino...")
    for attempt in range(30):
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
            time.sleep(2)
            # Test connection
            resp = send(ser, "STATUS")
            if "RGB=" in resp:
                print(f"  Arduino ready: {resp}")
                break
        except:
            pass
        time.sleep(1)
    else:
        print("  ERROR: Arduino not found!")
        return
    
    # 2. BLINK RED for 1 minute
    print("\n[2/4] BLINK RED - 1 minute")
    resp = send(ser, "BLINK:60")
    print(f"  {resp}")
    wait_with_countdown(65, "Blinking")
    
    # 3. Color cycle with 3-minute pauses
    colors = [
        ("RED", "PRESET:RED"),
        ("GREEN", "PRESET:GREEN"),
        ("BLUE", "PRESET:BLUE"),
        ("YELLOW", "PRESET:YELLOW"),
        ("CYAN", "PRESET:CYAN"),
        ("MAGENTA", "PRESET:MAGENTA"),
        ("WHITE", "PRESET:WHITE"),
        ("ORANGE", "PRESET:ORANGE"),
        ("PINK", "PRESET:PINK"),
        ("PURPLE", "PRESET:PURPLE"),
    ]
    
    print(f"\n[3/4] Color cycle - {len(colors)} colors, 3 min each")
    for i, (name, cmd) in enumerate(colors, 1):
        print(f"\n  [{i}/{len(colors)}] {name}")
        resp = send(ser, cmd)
        print(f"  {resp}")
        wait_with_countdown(180, name)
    
    # 4. Fade to off
    print("\n[4/4] Fade to OFF")
    resp = send(ser, "FADE:0,0,0,100")
    print(f"  {resp}")
    time.sleep(3)
    
    # Final status
    resp = send(ser, "STATUS")
    print(f"\n  Final: {resp}")
    
    ser.close()
    print("\n" + "=" * 50)
    print("  RGB LED Demo - DONE")
    print("=" * 50)

if __name__ == "__main__":
    main()
