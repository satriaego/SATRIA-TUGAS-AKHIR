#include <Arduino.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>  // Include ArduinoJson library

#define RELAY_1 7  // Define relay pins
#define RELAY_2 6
#define RELAY_3 5
#define RELAY_4 4

SoftwareSerial espSerial(2, 3); // RX = D2, TX = D3 (Software Serial for ESP32)

void setup() {
    Serial.begin(115200);     // Hardware Serial (USB Debugging)
    espSerial.begin(9600);    // Software Serial (For ESP32 Communication)

    // Set relay pins as OUTPUT and initialize them to OFF
    pinMode(RELAY_1, OUTPUT); digitalWrite(RELAY_1, HIGH);
    pinMode(RELAY_2, OUTPUT); digitalWrite(RELAY_2, HIGH);
    pinMode(RELAY_3, OUTPUT); digitalWrite(RELAY_3, HIGH);
    pinMode(RELAY_4, OUTPUT); digitalWrite(RELAY_4, HIGH);
}

void loop() {
    if (espSerial.available()) {
        String data = espSerial.readStringUntil('\n');
        Serial.println("From ESP32: " + data);

        JsonDocument doc;
        deserializeJson(doc, data);

        digitalWrite(RELAY_1, doc["relay1"] == "1" ? LOW : HIGH);
        digitalWrite(RELAY_2, doc["relay2"] == "1" ? LOW : HIGH);
        digitalWrite(RELAY_3, doc["relay3"] == "1" ? LOW : HIGH);
        digitalWrite(RELAY_4, doc["relay4"] == "1" ? LOW : HIGH);
    }
}
