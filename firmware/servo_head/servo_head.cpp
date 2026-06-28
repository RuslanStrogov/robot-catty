/*
 * Robot Catty — Head Controller (Arduino Uno)
 * 3 servos (2 eyes + jaw) + RGB LED
 * 
 * Protocol:
 *   SERVO:<name>:<angle>  — set servo angle (0-180)
 *   RGB:<r>,<g>,<b>       — set RGB color
 *   OFF                   — turn off RGB
 *   STATUS                — return current state
 *   PRESET:<name>         — run color preset
 *   FADE:<r>,<g>,<b>      — smooth fade to color
 *   BLINK                 — blink mode
 *   HOME                  — all servos to center (90°)
 */

#include <Servo.h>

// RGB LED pins
#define PIN_R 3
#define PIN_G 5
#define PIN_B 6

// Servo pins
#define PIN_EYE_L    4
#define PIN_EYE_R    7
#define PIN_JAW      8

// Servo objects
Servo servoEyeL, servoEyeR, servoJaw;

struct ServoMap {
    const char* name;
    Servo& servo;
    int current;
    int target;
};

ServoMap servos[] = {
    {"eyeL",  servoEyeL,  90, 90},
    {"eyeR",  servoEyeR,  90, 90},
    {"jaw",   servoJaw,   90, 90}
};
const int NUM_SERVOS = 3;

// RGB state
int rgbR = 0, rgbG = 0, rgbB = 0;
int fadeTargetR = 0, fadeTargetG = 0, fadeTargetB = 0;
bool fading = false;
bool blinking = false;
unsigned long lastBlink = 0;
bool blinkState = false;

// Presets
struct Preset { const char* name; int r, g, b; };
Preset presets[] = {
    {"red",     255, 0,   0},
    {"green",   0,   255, 0},
    {"blue",    0,   0,   255},
    {"white",   255, 255, 255},
    {"yellow",  255, 255, 0},
    {"cyan",    0,   255, 255},
    {"magenta", 255, 0,   255},
    {"orange",  255, 165, 0},
    {"pink",    255, 192, 203},
    {"purple",  128, 0,   128}
};
const int NUM_PRESETS = 10;

void setup() {
    Serial.begin(9600);
    
    // Attach servos
    servoEyeL.attach(PIN_EYE_L);
    servoEyeR.attach(PIN_EYE_R);
    servoJaw.attach(PIN_JAW);
    
    // Center all servos
    for (int i = 0; i < NUM_SERVOS; i++) {
        servos[i].servo.write(90);
    }
    
    // RGB pins
    pinMode(PIN_R, OUTPUT);
    pinMode(PIN_G, OUTPUT);
    pinMode(PIN_B, OUTPUT);
    analogWrite(PIN_R, 0);
    analogWrite(PIN_G, 0);
    analogWrite(PIN_B, 0);
}

void loop() {
    // Process serial commands
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        processCommand(cmd);
    }
    
    // Smooth servo movement
    for (int i = 0; i < NUM_SERVOS; i++) {
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
    
    // Fade processing
    if (fading) {
        rgbR += (fadeTargetR - rgbR) / 4;
        rgbG += (fadeTargetG - rgbG) / 4;
        rgbB += (fadeTargetB - rgbB) / 4;
        if (abs(rgbR - fadeTargetR) < 3 && abs(rgbG - fadeTargetG) < 3 && abs(rgbB - fadeTargetB) < 3) {
            rgbR = fadeTargetR; rgbG = fadeTargetG; rgbB = fadeTargetB;
            fading = false;
        }
        updateRGB();
    }
    
    // Blink processing
    if (blinking && millis() - lastBlink > 500) {
        lastBlink = millis();
        blinkState = !blinkState;
        if (blinkState) {
            analogWrite(PIN_R, rgbR); analogWrite(PIN_G, rgbG); analogWrite(PIN_B, rgbB);
        } else {
            analogWrite(PIN_R, 0); analogWrite(PIN_G, 0); analogWrite(PIN_B, 0);
        }
    }
    
    delay(15);
}

void processCommand(String cmd) {
    if (cmd.startsWith("SERVO:")) {
        // SERVO:name:angle
        int sep1 = cmd.indexOf(':', 6);
        if (sep1 > 0) {
            String name = cmd.substring(6, sep1);
            int angle = cmd.substring(sep1 + 1).toInt();
            angle = constrain(angle, 0, 180);
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
            Serial.print("ERR:UNKNOWN_SERVO:");
            Serial.println(name);
        }
    }
    else if (cmd.startsWith("RGB:")) {
        int r, g, b;
        if (parseRGB(cmd.substring(4), r, g, b)) {
            fading = false;
            blinking = false;
            rgbR = r; rgbG = g; rgbB = b;
            updateRGB();
            Serial.print("OK:RGB:");
            Serial.print(r); Serial.print(",");
            Serial.print(g); Serial.print(",");
            Serial.println(b);
        }
    }
    else if (cmd.equals("OFF")) {
        fading = false;
        blinking = false;
        rgbR = 0; rgbG = 0; rgbB = 0;
        updateRGB();
        Serial.println("OK:OFF");
    }
    else if (cmd.startsWith("FADE:")) {
        int r, g, b;
        if (parseRGB(cmd.substring(5), r, g, b)) {
            fading = true;
            blinking = false;
            fadeTargetR = r; fadeTargetG = g; fadeTargetB = b;
            Serial.print("OK:FADE:");
            Serial.print(r); Serial.print(",");
            Serial.print(g); Serial.print(",");
            Serial.println(b);
        }
    }
    else if (cmd.equals("BLINK")) {
        blinking = true;
        fading = false;
        lastBlink = millis();
        blinkState = false;
        Serial.println("OK:BLINK");
    }
    else if (cmd.startsWith("PRESET:")) {
        String name = cmd.substring(7);
        for (int i = 0; i < NUM_PRESETS; i++) {
            if (name.equals(presets[i].name)) {
                fading = false;
                blinking = false;
                rgbR = presets[i].r; rgbG = presets[i].g; rgbB = presets[i].b;
                updateRGB();
                Serial.print("OK:PRESET:");
                Serial.println(name);
                return;
            }
        }
        Serial.print("ERR:UNKNOWN_PRESET:");
        Serial.println(name);
    }
    else if (cmd.equals("HOME")) {
        for (int i = 0; i < NUM_SERVOS; i++) {
            servos[i].target = 90;
        }
        Serial.println("OK:HOME");
    }
    else if (cmd.equals("STATUS")) {
        Serial.print("STATUS:servos=");
        for (int i = 0; i < NUM_SERVOS; i++) {
            if (i > 0) Serial.print(",");
            Serial.print(servos[i].name);
            Serial.print(":");
            Serial.print(servos[i].current);
        }
        Serial.print(";rgb=");
        Serial.print(rgbR); Serial.print(",");
        Serial.print(rgbG); Serial.print(",");
        Serial.println(rgbB);
    }
    else {
        Serial.print("ERR:UNKNOWN_CMD:");
        Serial.println(cmd);
    }
}

bool parseRGB(String s, int &r, int &g, int &b) {
    int c1 = s.indexOf(',');
    int c2 = s.indexOf(',', c1 + 1);
    if (c1 < 0 || c2 < 0) return false;
    r = constrain(s.substring(0, c1).toInt(), 0, 255);
    g = constrain(s.substring(c1 + 1, c2).toInt(), 0, 255);
    b = constrain(s.substring(c2 + 1).toInt(), 0, 255);
    return true;
}

void updateRGB() {
    analogWrite(PIN_R, rgbR);
    analogWrite(PIN_G, rgbG);
    analogWrite(PIN_B, rgbB);
}
