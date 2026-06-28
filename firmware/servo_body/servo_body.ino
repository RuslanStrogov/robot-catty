/*
 * Robot Catty — Body Controller (Arduino Mega 2560)
 * 4 servos (expandable to 8)
 * 
 * Protocol:
 *   SERVO:<name>:<angle>  — set servo angle (0-180)
 *   STATUS                — return current state
 *   CENTER                — center all servos
 */

#include <Servo.h>

// Servo pins — current 4
#define PIN_SHOULDER_L  2
#define PIN_SHOULDER_R  3
#define PIN_ELBOW_L     4
#define PIN_ELBOW_R     5

// Future expansion pins
#define PIN_SHOULDER_L2  6
#define PIN_SHOULDER_R2  7
#define PIN_ELBOW_L2     8
#define PIN_ELBOW_R2     9

Servo servoShoulderL, servoShoulderR, servoElbowL, servoElbowR;
Servo servoShoulderL2, servoShoulderR2, servoElbowL2, servoElbowR2;

struct ServoMap {
    const char* name;
    Servo& servo;
    int current;
    int target;
    bool attached;
};

ServoMap servos[] = {
    {"shoulderL",  servoShoulderL,  90, 90, true},
    {"shoulderR",  servoShoulderR,  90, 90, true},
    {"elbowL",     servoElbowL,     90, 90, true},
    {"elbowR",     servoElbowR,     90, 90, true},
    {"shoulderL2", servoShoulderL2, 90, 90, false},
    {"shoulderR2", servoShoulderR2, 90, 90, false},
    {"elbowL2",    servoElbowL2,    90, 90, false},
    {"elbowR2",    servoElbowR2,    90, 90, false}
};
const int NUM_SERVOS = 8;

void setup() {
    Serial.begin(9600);
    
    servoShoulderL.attach(PIN_SHOULDER_L);
    servoShoulderR.attach(PIN_SHOULDER_R);
    servoElbowL.attach(PIN_ELBOW_L);
    servoElbowR.attach(PIN_ELBOW_R);

    for (int i = 0; i < NUM_SERVOS; i++) {
        servos[i].servo.write(90);
    }

    Serial.println("READY:BODY:v2");
    
    Serial.println("READY:BODY");
}

void loop() {
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        processCommand(cmd);
    }
    
    // Smooth movement
    for (int i = 0; i < NUM_SERVOS; i++) {
        if (!servos[i].attached) continue;
        if (servos[i].current != servos[i].target) {
            int diff = servos[i].target - servos[i].current;
            if (abs(diff) <= 1) {
                servos[i].current = servos[i].target;
            } else {
                servos[i].current += diff / 2;
            }
            servos[i].servo.write(servos[i].current);
        }
    }
    
    delay(15);
}

void processCommand(String cmd) {
    if (cmd.startsWith("SERVO:")) {
        int sep1 = cmd.indexOf(':', 6);
        if (sep1 > 0) {
            String name = cmd.substring(6, sep1);
            int angle = constrain(cmd.substring(sep1 + 1).toInt(), 0, 180);
            for (int i = 0; i < NUM_SERVOS; i++) {
                if (name.equals(servos[i].name)) {
                    servos[i].target = angle;
                    Serial.print("OK:SERVO:");
                    Serial.print(name);
                    Serial.print(":");
                    Serial.println(angle);
                    return;
                }
            }
        }
    }
    else if (cmd.equals("CENTER")) {
        for (int i = 0; i < NUM_SERVOS; i++) {
            servos[i].target = 90;
        }
        Serial.println("OK:CENTER");
    }
    else if (cmd.equals("STATUS")) {
        Serial.print("STATUS:servos=");
        bool first = true;
        for (int i = 0; i < NUM_SERVOS; i++) {
            if (!servos[i].attached) continue;
            if (!first) Serial.print(",");
            Serial.print(servos[i].name);
            Serial.print(":");
            Serial.print(servos[i].current);
            first = false;
        }
        Serial.println();
    }
}
