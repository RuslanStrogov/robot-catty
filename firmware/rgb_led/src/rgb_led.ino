/*
 * robot-katty — RGB LED Controller
 * Arduino Uno (CH340)
 *
 * Wiring (common cathode RGB LED):
 *   Pin 3  (PWM) ---[220Ω]--- RED
 *   Pin 5  (PWM) ---[220Ω]--- GREEN
 *   Pin 6  (PWM) ---[220Ω]--- BLUE
 *   GND --- CATHODE
 *
 * Serial protocol (9600 baud, newline-terminated):
 *   "R,G,B\n"   Set color (0-255 each)
 *   "OFF\n"     Turn off
 *   "STATUS\n"  Query current state
 */

#define PIN_RED   3
#define PIN_GREEN 5
#define PIN_BLUE  6

int currentR = 0, currentG = 0, currentB = 0;

void setup() {
  Serial.begin(9600);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  analogWrite(PIN_RED, 0);
  analogWrite(PIN_GREEN, 0);
  analogWrite(PIN_BLUE, 0);
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "OFF") {
      setColor(0, 0, 0);
      Serial.println("OK OFF");
    }
    else if (cmd == "STATUS") {
      Serial.print("RGB=");
      Serial.print(currentR);
      Serial.print(",");
      Serial.print(currentG);
      Serial.print(",");
      Serial.println(currentB);
    }
    else {
      int r, g, b;
      int parsed = sscanf(cmd.c_str(), "%d,%d,%d", &r, &g, &b);
      if (parsed == 3) {
        r = constrain(r, 0, 255);
        g = constrain(g, 0, 255);
        b = constrain(b, 0, 255);
        setColor(r, g, b);
        Serial.print("OK ");
        Serial.print(r);
        Serial.print(" ");
        Serial.print(g);
        Serial.print(" ");
        Serial.println(b);
      } else {
        Serial.println("ERR: use R,G,B or OFF or STATUS");
      }
    }
  }
}

void setColor(int r, int g, int b) {
  analogWrite(PIN_RED, r);
  analogWrite(PIN_GREEN, g);
  analogWrite(PIN_BLUE, b);
  currentR = r;
  currentG = g;
  currentB = b;
}
