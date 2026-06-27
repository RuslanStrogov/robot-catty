#include <Arduino.h>

// Mega 2560 Controller for robot-catty
// Protocol: 9600 baud, newline-terminated
// Commands: PING, STATUS, SCAN, SERVO:pin:angle, CENTER

struct Module {
  int pin;
  bool active;
  int value;
};

Module modules[10];
int numMods = 0;

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Default body servos (standard robot-catty config)
  const int servoPins[] = {2, 3, 4, 5, 6, 7, 8, 9};
  numMods = 8;
  for (int i = 0; i < numMods; i++) {
    modules[i].pin = servoPins[i];
    modules[i].active = true;
    modules[i].value = 90;
  }
  
  delay(500);
  Serial.println("MEGA_READY");
}

void loop() {
  if (Serial.available()) {
    char buf[32];
    int len = Serial.readBytesUntil('\n', buf, 31);
    buf[len] = '\0';
    
    if (buf[0] == 'P' && buf[1] == 'I') {
      Serial.println("PONG");
    }
    else if (buf[0] == 'S' && buf[1] == 'T') {
      Serial.print("MODULES=");
      Serial.println(numMods);
      for (int i = 0; i < numMods; i++) {
        Serial.print(modules[i].pin);
        Serial.print(":");
        Serial.println(modules[i].value);
      }
    }
    else if (buf[3] == 'V') {
      // SERVO:pin:angle
      int pin = 0, angle = 0;
      int c1 = -1;
      for (int i = 0; i < (int)strlen(buf); i++) {
        if (buf[i] == ':') { if (c1 < 0) c1 = i; else break; }
      }
      if (c1 > 0) {
        for (int i = 5; i < c1; i++) pin = pin * 10 + (buf[i] - '0');
        for (int i = c1 + 1; i < (int)strlen(buf); i++) angle = angle * 10 + (buf[i] - '0');
        if (angle < 0) angle = 0;
        if (angle > 180) angle = 180;
        for (int i = 0; i < numMods; i++) {
          if (modules[i].pin == pin) { modules[i].value = angle; break; }
        }
        Serial.print("OK:");
        Serial.print(pin);
        Serial.print(":");
        Serial.println(angle);
      }
    }
    else if (buf[0] == 'C' && buf[1] == 'E') {
      for (int i = 0; i < numMods; i++) modules[i].value = 90;
      Serial.println("OK:CENTER");
    }
  }
}
