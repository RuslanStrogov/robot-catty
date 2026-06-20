#!/usr/bin/env python3
"""
RGB LED Controller - Arduino Uno
Protocol: "R,G,B\n" (0-255), "OFF\n", "STATUS\n"
Wiring: Pin 9=Red, Pin 10=Green, Pin 11=Blue (via 220Ω resistors)
"""

import serial
import time
import sys

PORT = "/dev/ttyUSB0"
BAUD = 9600
TIMEOUT = 2

PRESETS = {
    "red":     (255, 0, 0),
    "green":   (0, 255, 0),
    "blue":    (0, 0, 255),
    "white":   (255, 255, 255),
    "yellow":  (255, 255, 0),
    "cyan":    (0, 255, 255),
    "magenta": (255, 0, 255),
    "orange":  (255, 165, 0),
    "warm":    (255, 147, 41),
    "pink":    (255, 192, 203),
    "purple":  (128, 0, 128),
    "off":     (0, 0, 0),
}


def get_serial():
    ser = serial.Serial(PORT, BAUD, timeout=TIMEOUT)
    time.sleep(2)  # Wait for Arduino reset
    ser.reset_input_buffer()
    return ser


def set_color(ser, r, g, b):
    cmd = f"{r},{g},{b}\n"
    ser.write(cmd.encode())
    time.sleep(0.1)
    return ser.readline().decode().strip()


def set_off(ser):
    ser.write(b"OFF\n")
    time.sleep(0.1)
    return ser.readline().decode().strip()


def get_status(ser):
    ser.write(b"STATUS\n")
    time.sleep(0.1)
    lines = []
    while ser.in_waiting:
        lines.append(ser.readline().decode().strip())
    return "\n".join(lines) if lines else "(no response)"


def preset(ser, name):
    name = name.lower()
    if name not in PRESETS:
        print(f"Unknown preset: {name}")
        print(f"Available: {', '.join(PRESETS.keys())}")
        return None
    r, g, b = PRESETS[name]
    if name == "off":
        return set_off(ser)
    return set_color(ser, r, g, b)


def rainbow(ser):
    colors = [
        (255, 0, 0), (255, 127, 0), (255, 255, 0),
        (0, 255, 0), (0, 0, 255), (75, 0, 130), (148, 0, 211),
    ]
    print("Rainbow cycle (Ctrl+C to stop)...")
    try:
        while True:
            for r, g, b in colors:
                set_color(ser, r, g, b)
                time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped.")
        set_off(ser)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 rgb_led.py <command> [args]")
        print()
        print("Commands:")
        print("  color R G B    Set RGB color (0-255 each)")
        print("  preset NAME    Set preset color")
        print("  off            Turn off LED")
        print("  status         Query current state")
        print("  rainbow        Cycle through rainbow colors")
        print()
        print(f"Presets: {', '.join(PRESETS.keys())}")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    ser = get_serial()

    try:
        if cmd == "color" and len(sys.argv) == 5:
            r, g, b = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
            resp = set_color(ser, r, g, b)
            print(f"R={r} G={g} B={b} -> {resp}")
        elif cmd == "preset" and len(sys.argv) == 3:
            resp = preset(ser, sys.argv[2])
            if resp:
                print(resp)
        elif cmd == "off":
            print(set_off(ser))
        elif cmd == "status":
            print(get_status(ser))
        elif cmd == "rainbow":
            rainbow(ser)
        else:
            print("Unknown command. Run without args for help.")
            sys.exit(1)
    finally:
        ser.close()


if __name__ == "__main__":
    main()
