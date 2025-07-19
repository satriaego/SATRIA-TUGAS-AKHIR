#include <Arduino.h>
#include <PZEM004Tv30.h>
#include <SoftwareSerial.h>
#include <DHT.h>
#include <ArduinoJson.h>

// Define Software Serial pins for PZEM
#define PZEM_RX_PIN D3  // TX from PZEM
#define PZEM_TX_PIN D4  // RX from PZEM

// Define Software Serial for ESP32 communication
#define ESP_RX_PIN D6
#define ESP_TX_PIN D5

// Define DHT11 sensor pin (New Pin)
#define DHTPIN D7  // GPIO13 (Safe pin)
#define DHTTYPE DHT22


// Global sensor data
float voltage, current, power, energy, frequency, pf, temperatureC, temperatureF, humidity;

// SoftwareSerial for PZEM and ESP32
SoftwareSerial pzemSerial(PZEM_RX_PIN, PZEM_TX_PIN);
SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);
PZEM004Tv30 pzem(pzemSerial);
DHT dht(DHTPIN, DHTTYPE);

void setup() {
    Serial.begin(9600);   // Debugging serial
    espSerial.begin(9600); // Communication with ESP32
    dht.begin();  // Initialize DHT sensor
}


float safeRead(float value) {
  return isnan(value) ? 0 : value;
}

// Function to read PZEM sensor data
void readSensorsPzem() {
  voltage   = safeRead(pzem.voltage());
  current   = safeRead(pzem.current());
  power     = safeRead(pzem.power());
  energy    = safeRead(pzem.energy());
  frequency = safeRead(pzem.frequency());
  pf        = safeRead(pzem.pf());
}

// Function to read DHT11 sensor data
void readDHT11() {
    temperatureC = dht.readTemperature();
    temperatureF = dht.readTemperature(true);
    humidity = dht.readHumidity();

    if (isnan(temperatureC) || isnan(temperatureF) || isnan(humidity)) {
        return;
    }
}

// Function to send JSON data to ESP32
void sendJsonToESP() {
    JsonDocument jsonDoc;
    jsonDoc["voltage"] = voltage;
    jsonDoc["current"] = current;
    jsonDoc["power"] = power;
    jsonDoc["energy"] = energy;
    jsonDoc["frequency"] = frequency;
    jsonDoc["pf"] = pf;
    jsonDoc["tempC"] = temperatureC;
    jsonDoc["tempF"] = temperatureF;
    jsonDoc["humidity"] = humidity;

    String jsonString;
    serializeJson(jsonDoc, jsonString);
    Serial.println(jsonString);
    espSerial.println(jsonString);  // Send JSON to ESP32
}

void loop() {
    readSensorsPzem();
    readDHT11();
    sendJsonToESP(); // Send combined sensor data to ESP32
    delay(1000);
}
