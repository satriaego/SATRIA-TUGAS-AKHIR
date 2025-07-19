#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

#define SENSOR_1 18
#define SENSOR_2 19
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

bool lastMQTTConnected = false;  
bool lastState_1 = HIGH;
bool lastState_2 = HIGH;
float tempC = 0.0;
float voltage = 0.0;
float current = 0.0;
float fuzzy = 0.00;
int count = 0;
int displayChange = 1;
String relay;
int displayMode = 0; // 0 = Status, 1 = Voltage & Current
String relayStatus = "OFF";



String dataWemos;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

HardwareSerial SerialNano(1);
HardwareSerial SerialWemos(2);

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool wifiConnecting = false;
unsigned long wifiStartTime = 0;
unsigned long lastMsgTime = 0;
unsigned long lastCounterUpdate = 0;
unsigned long lastReconnectAttempt = 0;

void connectToWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.println("Connecting to WiFi...");
    wifiConnecting = true;
    wifiStartTime = millis();
}

void reconnectWiFi() {
    if (WiFi.status() != WL_CONNECTED && millis() - lastReconnectAttempt > 5000) {
        lastReconnectAttempt = millis();
        Serial.println("WiFi lost. Trying to reconnect...");
        WiFi.reconnect();
    }
}

void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    if (String(topic) == MQTT_TOPIC_DIS) {
        fuzzy = message.toFloat();
    }
    else if (String(topic) == MQTT_TOPIC_SUB) {
        relay = message;
        SerialNano.println(relay);
        JsonDocument doc1;
        deserializeJson(doc1, relay);
        if (doc1["relay1"] == "1") {
            relayStatus = "LOW";
        } else if (doc1["relay2"] == "1") {
            relayStatus = "MID";
        } else if (doc1["relay3"] == "1") {
            relayStatus = "HIGH";
        } else {
            relayStatus = "OFF";
        }
    }
    else if (String(topic) == MQTT_TOPIC_DIZ) {
        displayChange = message.toInt();
    }
}

void connectToMQTT() {
    Serial.println("Connecting to MQTT...");
    while (!mqttClient.connected()) {
        if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
            Serial.println("Connected to MQTT broker.");
            mqttClient.subscribe(MQTT_TOPIC_SUB);
            mqttClient.subscribe(MQTT_TOPIC_DIS);
            mqttClient.subscribe(MQTT_TOPIC_DIZ);
        } else {
            Serial.print("MQTT connection failed, state: ");
            Serial.println(mqttClient.state());
            delay(2000);
        }
    }
}

void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case SYSTEM_EVENT_STA_DISCONNECTED:
            Serial.println("WiFi lost. Reconnecting...");
            wifiConnecting = true;
            wifiStartTime = millis();
            WiFi.reconnect();
            break;
        case SYSTEM_EVENT_STA_GOT_IP:
            Serial.print("Connected! IP: ");
            Serial.println(WiFi.localIP());
            wifiConnecting = false;
            connectToMQTT();
            break;
        default:
            break;
    }
}

void checkMQTTConnection() {
    if (!mqttClient.connected()) {
        Serial.println("MQTT lost. Reconnecting...");
        connectToMQTT();
    }
    mqttClient.loop();
}

void updateCount() {
    bool objek_1 = digitalRead(SENSOR_1);
    bool objek_2 = digitalRead(SENSOR_2);

    if (objek_1 == LOW && lastState_1 == HIGH && lastState_2 == LOW) {
        count++;
        Serial.print("Object Entered | Count: ");
        Serial.println(count);
        delay(300);
    }

    if (objek_2 == LOW && lastState_2 == HIGH && lastState_1 == LOW) {
        count--;
        if (count < 0) count = 0;
        Serial.print("Object Exited | Count: ");
        Serial.println(count);
        delay(300);
    }

    lastState_1 = objek_1;
    lastState_2 = objek_2;
}

JsonDocument parseAndUpdateJson(const String& jsonStr) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, jsonStr);

    if (error) {
        Serial.print("JSON parse failed: ");
        Serial.println(error.c_str());
    }

    if (doc["tempC"]) {
        tempC = doc["tempC"].as<float>();
    }

    if (doc["voltage"]) {
        voltage = doc["voltage"].as<float>();
    }

    if (doc["current"]) {
        current = doc["current"].as<float>();
    }


    doc["count"] = count;
    return doc;
}

void publishToMQTT(const JsonDocument& doc) {
    String jsonString;
    serializeJson(doc, jsonString);
    mqttClient.publish(MQTT_TOPIC_PUB, jsonString.c_str());
    Serial.println("Published: " + jsonString);
}

void displayStatus() {
    display.clearDisplay();

    // Draw smiley face
    // display.drawBitmap(20, 10, stickman_bitmap, 16, 16, WHITE);
    display.setTextSize(2);
    display.setTextColor(WHITE);
    display.setCursor(20, 10);
    display.print("P: ");
    display.print(count);

    // Draw snowflake
    // display.drawBitmap(20, 40, thermostat_bitmap, 16, 16, WHITE);
    display.setCursor(20, 40);
    display.print("C: ");
    display.print(tempC, 1);
    

    display.display();
}

void displayVoltageAndCurrent() {
    display.clearDisplay();

    display.setTextSize(2);
    display.setTextColor(WHITE);

    display.setCursor(20, 10);
    display.print("V: ");
    display.print(voltage, 1);
    // display.print(" V");

    display.setCursor(20, 40);
    display.print("I: ");
    display.print(current, 1);
    // display.print(" A");

    display.display();
}

void displaykontrol() {
    display.clearDisplay();

    display.setTextSize(2);
    display.setTextColor(WHITE);

    display.setCursor(20, 10);
    display.print("F: ");
    display.print(fuzzy, 2);
    // display.print(" V");

    display.setCursor(20, 40);
    display.print("R: ");
    display.print(relayStatus);
    // display.print(" A");

    display.display();
}

void updateDisplay() {
    switch (displayChange) {
        case 1:
            displayStatus(); // Tampilkan count & suhu
            break;
        case 2:
            displayVoltageAndCurrent(); // Tampilkan voltage & arus
            break;
        case 3:
            displaykontrol(); // Tampilkan fuzzy & relay
            break;
        default:
            // Optional: jika displayChange di luar 1-3, tampilkan default
            displayStatus();
            break;
    }
}


void signalMQTTStatus() {
    if (mqttClient.connected()) {
        // Short double beep: "--"
        for (int i = 0; i < 2; i++) {
            digitalWrite(23, HIGH);
            delay(100);
            digitalWrite(23, LOW);
            delay(100);
        }
    } else {
        // Long quadruple beep: "----"
        for (int i = 0; i < 4; i++) {
            digitalWrite(23, HIGH);
            delay(150);
            digitalWrite(23, LOW);
            delay(150);
        }
    }
}


void setup() {
    Serial.begin(115200);
    SerialNano.begin(9600, SERIAL_8N1, 4, 5);
    SerialWemos.begin(9600, SERIAL_8N1, 16, 17);
    Wire.begin(21, 22);

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println(F("SSD1306 allocation failed"));
        while (true);
    }

    display.clearDisplay();

    WiFi.onEvent(WiFiEvent);
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(onMQTTMessage);
    connectToWiFi();
    pinMode(SENSOR_1, INPUT);
    pinMode(SENSOR_2, INPUT);
    pinMode(23, OUTPUT);


}

void loop() {
    // Always update count and display, no matter the WiFi/MQTT state
    updateCount();
    // Reconnect WiFi if disconnected
    if (WiFi.status() != WL_CONNECTED) {
        reconnectWiFi();
        return; // Optionally skip the rest of the loop this cycle
    }
    
    // If WiFi is connected, manage MQTT and data processing
    checkMQTTConnection();
    bool nowConnected = mqttClient.connected();
    if (nowConnected != lastMQTTConnected) {
        signalMQTTStatus();
        lastMQTTConnected = nowConnected;
    }
    
    
    if (millis() - lastMsgTime >= 1000) {
        lastMsgTime = millis();
        updateDisplay();
        if (SerialWemos.available()) {
            dataWemos = SerialWemos.readStringUntil('\n');
            JsonDocument doc = parseAndUpdateJson(dataWemos);
            publishToMQTT(doc);
        }
    }
}
