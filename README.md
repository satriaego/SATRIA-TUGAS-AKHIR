# 🌀 Smart Fan Control System using WhatsApp API and Sugeno Fuzzy Logic

## 📌 Description

This project is a final thesis implementation titled:  
**"Rancang Bangun Sistem Pengendalian dan Pemantauan Kecepatan Motor AC Berbasis WhatsApp API dan Logika Fuzzy Sugeno"**  
or in English:  
**"Design and Development of an AC Motor Speed Control and Monitoring System Based on WhatsApp API and Sugeno Fuzzy Logic"**.

This system offers an innovative approach to automation by integrating a widely used communication platform—**WhatsApp**—with an intelligent decision-making algorithm, **Sugeno Fuzzy Logic**. It allows real-time control and monitoring of fan motor speed based on two parameters:

- 🌡️ Room temperature  
- 👥 Estimated number of people

All interactions happen via WhatsApp messages, making the system intuitive, accessible, and user-friendly.

---

## 🎯 Key Features

- ✅ Control motor speed remotely through WhatsApp commands  
- 🔍 Real-time monitoring with anomaly detection and notifications  
- 🧠 Adaptive logic system using Sugeno Fuzzy Inference  
- 📈 Experimental performance evaluation  
- ⚡ Aims to improve energy efficiency and user comfort  

---

## 🛠️ Tech Stack

| Component         | Description                                                |
|------------------|------------------------------------------------------------|
| 🧠 Fuzzy Logic    | Sugeno-type for adaptive speed decision                    |
| 🌐 WhatsApp API   | Used as communication interface (Baileys / WWeb.js / etc.) |
| 🔌 Microcontroller| ESP32 or Arduino (based on your setup)                    |
| 🔧 Backend        | Node.js + MQTT (or Python depending on your implementation)|
| 📊 Monitoring     | Serial output, JSON logs, or WhatsApp notifications        |

---

## 🚀 How It Works

1. User sends a command via WhatsApp (e.g., **“Fan speed: High”**).  
2. The system receives the message and parses the command.  
3. Fuzzy logic evaluates environment variables (temperature + people count).  
4. The system sends commands to control the fan speed accordingly.  
5. If an anomaly is detected (e.g., speed mismatch or failure), a WhatsApp alert is sent.  

---

## 📷 Demo Screenshots / Videos

> *(Embed demo images or link to videos here to showcase the project)*  
Example:  
[📼 Demo Video](https://drive.google.com/your-demo-video-link)

---

## 🌱 Growth Mindset in Action

This project started as a personal challenge—to solve a real-world problem using common tools in everyday life.  
Throughout the development process, I:

- Learned and implemented fuzzy logic systems from scratch.  
- Integrated WhatsApp API into an automation system using open-source libraries.  
- Experimented with environmental sensing and real-time decision-making.  
- Iteratively tested and improved the system based on real user scenarios.

> I believe great solutions start with curiosity and the courage to try something new—even if it’s not perfect at first. This project is a reflection of that mindset.

---

## ✨ Why This Project Matters

This project shows that automation doesn’t have to rely on complex apps or expensive UIs.  
By using WhatsApp—a tool millions already use every day—we make smart home systems more **inclusive**, **efficient**, and **adaptable**.

---

## 💡 Future Ideas

- 🎙️ Add voice command support (e.g., using WhatsApp voice-to-text)  
- 🎥 Integrate AI-based person detection via camera  
- 🔌 Extend to other appliances (AC, lights, smart plugs)

---

## 📁 Repository Structure

```bash
📦 fuzzy-whatsapp-control
 ┣ 📂 src
 ┃ ┣ 📜 fuzzy_logic.js
 ┃ ┣ 📜 whatsapp_bot.js
 ┣ 📂 microcontroller
 ┃ ┣ 📜 esp32_code.ino
 ┣ 📂 docs
 ┃ ┣ 📜 abstract.pdf
 ┣ 📜 README.md
 ┣ 📜 LICENSE
