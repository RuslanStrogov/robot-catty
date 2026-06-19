#!/usr/bin/env python3
"""
Remote RGB LED Controller via Raspberry Pi SSH
"""

import sys
import paramiko

PI_HOST = "192.168.10.152"
PI_USER = "ruslan"
PI_PASS = "159357"
PI_SCRIPT = "/home/ruslan/robot-katty/scripts/rgb_led.py"


def run_on_pi(command):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(PI_HOST, username=PI_USER, password=PI_PASS,
                       timeout=15, look_for_keys=False, allow_agent=False)
        stdin, stdout, stderr = client.exec_command(
            f"python3 {PI_SCRIPT} {command}", timeout=15)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        client.close()
        return out, err
    except Exception as e:
        return "", str(e)


def main():
    if len(sys.argv) < 2:
        print("Usage: python rgb_led_remote.py <command> [args]")
        print()
        print("Commands:")
        print("  color R G B    Set RGB color (0-255 each)")
        print("  preset NAME    Set preset color")
        print("  off            Turn off LED")
        print("  status         Query current state")
        print("  rainbow        Rainbow cycle")
        print()
        print("Presets: red, green, blue, white, yellow, cyan, magenta, orange, warm, pink, purple, off")
        sys.exit(1)

    cmd = " ".join(sys.argv[1:])
    out, err = run_on_pi(cmd)

    if err:
        print(f"Error: {err}")
    if out:
        print(out)
    if not out and not err:
        print("No response from Arduino (check connection)")


if __name__ == "__main__":
    main()
