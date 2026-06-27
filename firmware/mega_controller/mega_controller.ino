// Mega 2560 Controller - Servo + Scanner
// Protocol: PING, STATUS, SERVO:pin:angle, SCAN:pos, CENTER, RGB:r:g:b, OFF

#include <Servo.h>

#define NUM_SERVOS 8
#define SERVO_MIN 2
#define SERVO_MAX 9

Servo servos[NUM_SERVOS];
int servoPins[NUM_SERVOS] = {2, 3, 4, 5, 6, 7, 8, 9};
int servoAngles[NUM_SERVOS] = {90, 90, 90, 90, 90, 90, 90, 90};
bool servoAttached[NUM_SERVOS] = {false};

String inputBuffer = "";
bool inputComplete = false;

void setup() {
  Serial.begin(115200);
  inputBuffer.reserve(64);
  
  // Attach all servos to default position
  for (int i = 0; i < NUM_SERVOS; i++) {
    servos[i].attach(servoPins[i]);
    servos[i].write(servoAngles[i]);
    servoAttached[i] = true;
  }
  
  Serial.println("MEGA_CTRL:READY");
}

void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        inputComplete = true;
      }
    } else {
      inputBuffer += c;
    }
  }
  
  if (inputComplete) {
    processCommand(inputBuffer);
    inputBuffer = "";
    inputComplete = false;
  }
}

void processCommand(String cmd) {
  cmd.trim();
  
  if (cmd == "PING") {
    Serial.println("PONG:MEGA");
  }
  else if (cmd == "STATUS") {
    Serial.print("MEGA:ONLINE:SERVOS=");
    for (int i = 0; i < NUM_SERVOS; i++) {
      if (servoAttached[i]) {
        Serial.print(servoPins[i]);
        Serial.print(":");
        Serial.print(servoAngles[i]);
        if (i < NUM_SERVOS - 1) Serial.print(",");
      }
    }
    Serial.println();
  }
  else if (cmd.startsWith("SERVO:")) {
    // Format: SERVO:pin:angle
    int firstColon = cmd.indexOf(':', 6);
    if (firstColon > 0) {
      int pin = cmd.substring(6, firstColon).toInt();
      int angle = cmd.substring(firstColon + 1).toInt();
      
      if (angle < 0) angle = 0;
      if (angle > 180) angle = 180;
      
      for (int i = 0; i < NUM_SERVOS; i++) {
        if (servoPins[i] == pin) {
          servoAngles[i] = angle;
          servos[i].write(angle);
          Serial.print("OK:SERVO:");
          Serial.print(pin);
          Serial.print(":");
          Serial.println(angle);
          return;
        }
      }
    }
    Serial.println("ERR:SERVO_NOT_FOUND");
  }
  else if (cmd.startsWith("SCAN:")) {
    // Format: SCAN:angle - move all servos to angle
    int angle = cmd.substring(5).toInt();
    if (angle < 0) angle = 0;
    if (angle > 180) angle = 180;
    
    for (int i = 0; i < NUM_SERVOS; i++) {
      servoAngles[i] = angle;
      servos[i].write(angle);
    }
    Serial.print("OK:SCAN:");
    Serial.println(angle);
  }
  else if (cmd == "CENTER") {
    for (int i = 0; i < NUM_SERVOS; i++) {
      servoAngles[i] = 90;
      servos[i].write(90);
    }
    Serial.println("OK:CENTER");
  }
  else {
    Serial.println("ERR:UNKNOWN_CMD");
  }
}
