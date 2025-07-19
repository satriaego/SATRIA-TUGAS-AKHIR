const {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const {
  MQTT_BROKER,
  MQTT_TOPIC,
  MQTT_TOPIC_TES,
  MQTT_RELAY_TOPIC,
  MQTT_TOPIC_DIZ,
  MQTT_TOPIC_DIS,
  MQTT_USERNAME,
  ADMIN,
} = require("./config");
const fs = require("fs");
const path = "./users.json";
const mqtt = require("mqtt");
const { spawn } = require("child_process");
let currentRelayLevel = null;
let isManualMode = false; // true jika user ubah manual
let latestResult = 0; // variabel global

// Relay status
const relayStatus = {
  relay1: "0",
  relay2: "0",
  relay3: "0",
  relay4: "0",
};

// Default values for MQTT data
let mqttData = {
  voltage: { value: 0, suffix: "V" },
  current: { value: 0, suffix: "A" },
  power: { value: 0, suffix: "W" },
  energy: { value: 0, suffix: "kWh" },
  frequency: { value: 0, suffix: "Hz" },
  pf: { value: 0, suffix: "" },
  tempC: { value: 0, suffix: "°C" },
  tempF: { value: 0, suffix: "°F" },
  humidity: { value: 0, suffix: "%" },
  people: { value: 0, suffix: "" },
};

let mqttConnected = false;
let reconnectTimeout = null;
let dangerTriggered = false; // To ensure the danger logic runs only once

// Check if the JSON file exists, create it if not
function checkFile() {
  if (!fs.existsSync(path)) {
    const initialData = {
      authorized_users: [],
      unauthorized_users: [],
    };
    fs.writeFileSync(path, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

// Load users from the JSON file
function loadUsers() {
  const data = fs.readFileSync(path, "utf-8");
  return JSON.parse(data);
}

// Save updated users to the JSON file
function saveUsers(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// Add unauthorized user
function addUnauthorized(jid) {
  const data = loadUsers();
  if (
    !data.unauthorized_users.includes(jid) &&
    !data.authorized_users.includes(jid)
  ) {
    data.unauthorized_users.push(jid);
    saveUsers(data);
  }
}

// Grant access to an unauthorized user
function grantAccess(jid) {
  const data = loadUsers();
  if (data.unauthorized_users.includes(jid)) {
    data.unauthorized_users = data.unauthorized_users.filter(
      (user) => user !== jid
    );
    data.authorized_users.push(jid);
    saveUsers(data);
  }
}

// Revoke access from an authorized user
function revokeAccess(jid) {
  const data = loadUsers();
  if (data.authorized_users.includes(jid)) {
    data.authorized_users = data.authorized_users.filter(
      (user) => user !== jid
    );
    data.unauthorized_users.push(jid); // Optionally move back to unauthorized
    saveUsers(data);
  }
}

// List unauthorized users
function listUnauthorized() {
  const data = loadUsers();
  return data.unauthorized_users;
}

// List authorized users
function listAuthorized() {
  const data = loadUsers();
  return data.authorized_users;
}

function isAuthorized(jid) {
  const data = loadUsers();
  return data.authorized_users.includes(jid);
}

checkFile();

// Function to connect to MQTT broker
function connectMQTT() {
  console.log("[MQTT] Connecting to broker...");

  const client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USERNAME,
    keepalive: 30,
    reconnectPeriod: 0,
  });

  // Event: Connected
  client.on("connect", () => {
    mqttConnected = true;
    console.log("[MQTT] Connected successfully ✅");
    //ganti jika perlu uji data simulasi
    client.subscribe(MQTT_TOPIC, (err) => {
      if (!err) console.log(`[MQTT] Subscribed to topic: ${MQTT_TOPIC}`);
      else console.error("[MQTT] Subscription failed:", err);
    });

    // Clear any pending reconnect attempts
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  // Event: Message received
  client.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      // Update only the `value`, keeping the `suffix`
      Object.keys(mqttData).forEach((key) => {
        if (data[key] !== undefined) {
          mqttData[key].value = data[key];
        }
      });
      // Manually map "count" to "people"
      if (data.count !== undefined) {
        mqttData.people.value = data.count;
      }
    } catch (error) {
      console.error("[MQTT] Error parsing message:", error);
    }
  });

  // Event: Disconnected
  client.on("close", () => {
    console.warn("[MQTT] Disconnected ❌");
    mqttConnected = false;
    attemptReconnect();
  });

  // Event: Error
  client.on("error", (error) => {
    console.error("[MQTT] Connection error:", error);
    client.end();
    mqttConnected = false;
    attemptReconnect();
  });

  return client;
}

// Function to attempt reconnection
function attemptReconnect() {
  if (!mqttConnected && !reconnectTimeout) {
    console.log("[MQTT] Reconnecting in 5 seconds...");
    reconnectTimeout = setTimeout(() => {
      console.log("[MQTT] Attempting to reconnect...");
      mqttClient = connectMQTT();
    }, 5000);
  }
}

let mqttClient = connectMQTT();
function getFormattedDateTime() {
  const currentDate = new Date();

  const dateString = currentDate.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeString = currentDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateString, timeString };
}

function updateRelayStatusmanual(relayNumber, newStatus) {
  const relayKey = `relay${relayNumber}`;

  // Relay 1–3: hanya satu boleh aktif
  if (["1", "2", "3"].includes(relayNumber) && newStatus === "1") {
    ["relay1", "relay2", "relay3"].forEach((key) => {
      relayStatus[key] = "0";
    });
  }

  if (relayStatus.hasOwnProperty(relayKey)) {
    relayStatus[relayKey] = newStatus;

    // 🌀 Khusus Relay 4 → tampilkan Swing Aktif / Nonaktif
    if (relayNumber === "4") {
      return newStatus === "1" ? "🌀 Swing Aktif" : "❌ Swing Nonaktif";
    }

    // 🔁 Untuk relay 1–3: tetap seperti biasa
    return `Speed ${relayNumber} ${
      newStatus === "1" ? "Dinyalakan" : "Dimatikan"
    }`;
  } else {
    return "Relay tidak ditemukan";
  }
}

// Function to determine speed level based on relay status
function getSpeedLevel(status) {
  if (status.relay1 === "1") return "Low";
  if (status.relay2 === "1") return "Mid";
  if (status.relay3 === "1") return "High";
  return "Fan Off";
}

// Function to generate relay status message
function generateStatusMessage(status) {
  const { dateString, timeString } = getFormattedDateTime();
  const speedLevel = getSpeedLevel(status);

  return `> *${timeString}*\n> *---*\n> \`Speed: ${speedLevel}\``;
}

function checkDangerCondition() {
  const voltage = mqttData.voltage.value;
  const isCurrentBad =
    voltage === 0 || voltage === null || voltage === undefined;

  const isAnyRelayOn = Object.values(relayStatus).some(
    (status) => status === "1"
  );

  if (isAnyRelayOn && isCurrentBad) {
    if (!dangerTriggered) {
      const pythonPath =
        "C:\\Users\\USER\\Documents\\KULIAH\\2. MATERI PENTING\\Semester 7\\PROJECT\\OLIVIA\\whatsAppsLogic\\add-on\\callFc\\callFunction\\Scripts\\python.exe";

      const scriptPath =
        "C:\\Users\\USER\\Documents\\KULIAH\\2. MATERI PENTING\\Semester 7\\PROJECT\\OLIVIA\\whatsAppsLogic\\add-on\\callFc\\main.py";

      const pythonProcess = spawn(pythonPath, [scriptPath]);
      dangerTriggered = true;
    }
  } else {
    dangerTriggered = false; // Reset flag when danger is gone
  }
}

// Check every 2 seconds
//matikan saat mencoba uji data
setInterval(checkDangerCondition, 2000);

function runFuzzyLogic(tempC, people) {
  if (isManualMode) {
    console.log("⚠️ Manual mode active: skipping fuzzy logic.");
    return;
  }
  const python = spawn(
    "C:\\Users\\USER\\Documents\\KULIAH\\2. MATERI PENTING\\Semester 7\\PROJECT\\OLIVIA\\whatsAppsLogic\\add-on\\FuzzyLogic\\fuzzy\\Scripts\\python.exe",
    [
      "C:\\Users\\USER\\Documents\\KULIAH\\2. MATERI PENTING\\Semester 7\\PROJECT\\OLIVIA\\whatsAppsLogic\\add-on\\FuzzyLogic\\main.py",
      tempC.toString(),
      people.toString(),
    ]
  );

  python.stdout.on("data", (data) => {
    const output = data.toString().trim(); // Hilangkan newline
    const parts = output.split(" "); // pisahkan berdasarkan spasi

    const relayLevel = parseInt(parts[0]);
    const result = parseFloat(parseFloat(parts[1]).toFixed(2));
    latestResult = result;
    console.log("Relay Level:", relayLevel);
    console.log("Result:", result);
    mqttClient.publish(MQTT_TOPIC_DIS, result.toString());

    if (!isNaN(relayLevel)) {
      if (relayLevel !== currentRelayLevel) {
        currentRelayLevel = relayLevel;
        updateRelayStatus(relayLevel);
      }
    } else {
      console.warn("⚠️ Output dari Python bukan angka valid:", output);
    }
  });
}

setInterval(() => {
  runFuzzyLogic(mqttData.tempC.value, mqttData.people.value);
}, 2000);

function updateRelayStatus(level) {
  // Reset semua relay ke '0'
  Object.keys(relayStatus).forEach((key) => {
    relayStatus[key] = "0";
  });

  // Set hanya satu relay aktif berdasarkan level (1, 2, atau 3)
  if (level >= 1 && level <= 3) {
    relayStatus[`relay${level}`] = "1";
  }

  // Kirim via MQTT
  mqttClient.publish(MQTT_RELAY_TOPIC, JSON.stringify(relayStatus));
  console.log("🔁 Updated relay status:", relayStatus);
}

function enterManualMode() {
  isManualMode = true;
  console.log("⚠️ Manual mode activated.");
}

function exitManualMode() {
  isManualMode = false;
  currentRelayLevel = null; // force fuzzy logic to re-trigger
  console.log("🔁 Switched back to AUTOMATIC mode.");
}

// Connect to WhatsApp
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("satriaAuth");
  const sock = makeWASocket({ printQRInTerminal: true, auth: state });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const errorCode = lastDisconnect?.error?.output?.statusCode;
      console.log("Connection closed. Reason:", errorCode);

      if (errorCode === DisconnectReason.loggedOut) {
        console.log("Session expired. Delete 'satriaAuth' and restart.");
        return;
      }

      // Check if already connected before trying to reconnect
      if (sock?.user) {
        console.log("Already connected, no need to reconnect.");
      } else {
        console.log("Reconnecting in 5 seconds...");
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === "open") {
      console.log("Connected to WhatsApp ✅");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Handle unexpected errors
  process.on("uncaughtException", (error) => {
    console.error("Unexpected error:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled promise rejection:", reason);
  });

  // Utility function to send a message with context
  async function sendMessageWithContext(jid, message, context) {
    await sock.sendMessage(jid, {
      text: message,
      contextInfo: context,
    });
  }

  // Utility function for adding reactions
  async function addReact(jid, key, emoji) {
    await sock.sendMessage(jid, {
      react: { text: emoji, key },
    });
  }

  // Helper function for context
  function address(m, key) {
    return {
      quotedMessage: m.messages[0].message,
      participant: key.participant || key.remoteJid,
      stanzaId: key.id,
      remoteJid: key.remoteJid,
    };
  }

  sock.ev.on("messages.upsert", async (m) => {
    if (m.messages[0].key.fromMe) return;
    const msgText = m.messages[0].message?.conversation || "";
    const input = msgText.toLocaleLowerCase();
    const key = m.messages[0].key;
    const context = address(m, key);
    const jid = key.remoteJid;
    const senderJid = key.participant || jid;
    const isGroup = jid.endsWith("@g.us");

    if (
      senderJid !== ADMIN &&
      !isAuthorized(senderJid) &&
      (["yun", "rep", "sp", ".adm", ".grt", ".ugrt", "auto", "rotate"].includes(
        input
      ) ||
        /s[1-3]/.test(input) ||
        /d[1-3]/.test(input))
    ) {
      await sendMessageWithContext(
        jid,
        `❌ Oops! Kamu belum punya akses nih. \n\n🫡 Coba kontak pemilik ya!`,
        context
      );

      // Send Admin Contact Card
      await sock.sendMessage(jid, {
        contacts: {
          displayName: "Satria Ego Vania",
          contacts: [
            {
              displayName: "Satria Ego Vania",
              vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Admin\nTEL;type=CELL;type=VOICE;waid=${ADMIN.replace(
                "@s.whatsapp.net",
                ""
              )}:${ADMIN.replace("@s.whatsapp.net", "")}\nEND:VCARD`,
            },
          ],
        },
      });

      await addUnauthorized(senderJid);
      return;
    }
    if (msgText === ".adm" && senderJid === ADMIN) {
      const unauthorizedList = listUnauthorized();
      const authorizedList = listAuthorized();

      // Format authorized users
      const authorizedText =
        authorizedList.length > 0
          ? authorizedList.map((user, i) => `${i + 1}. ${user}`).join("\n")
          : " ";

      // Format unauthorized users
      const unauthorizedText =
        unauthorizedList.length > 0
          ? unauthorizedList.map((user, i) => `${i + 1}. ${user}`).join("\n")
          : " ";

      // Send the full message
      const fullMessage = `✅ *User yang diizinkan:*\n${authorizedText}\n\n❌ *User yang tidak diizinkan:*\n${unauthorizedText}`;
      await sendMessageWithContext(jid, fullMessage, context);
      return;
    }
    // Command to grant access to an unauthorized user by list number
    if (msgText.startsWith(".grt ") && senderJid === ADMIN) {
      const number = parseInt(msgText.split(" ")[1]); // Ambil nomor setelah /grant
      const unauthorizedList = listUnauthorized();

      if (isNaN(number) || number < 1 || number > unauthorizedList.length) {
        await sendMessageWithContext(jid, "⚠️ Cek list user!", context);
        return;
      }

      const toGrant = unauthorizedList[number - 1]; // Ambil JID berdasarkan nomor
      await grantAccess(toGrant);
      await sendMessageWithContext(
        jid,
        `✅ Akses diberikan ke:\n${toGrant}`,
        context
      );
      return;
    }

    // Command to revoke access from an authorized user by list number
    if (msgText.startsWith(".ugrt ") && senderJid === ADMIN) {
      const number = parseInt(msgText.split(" ")[1]); // Ambil nomor setelah /ungrant
      const authorizedList = listAuthorized();

      if (isNaN(number) || number < 1 || number > authorizedList.length) {
        await sendMessageWithContext(jid, "⚠️ Cek list user!", context);
        return;
      }

      const toUnGrant = authorizedList[number - 1]; // Ambil JID berdasarkan nomor
      await revokeAccess(toUnGrant);
      await sendMessageWithContext(
        jid,
        `🚫 Akses dicabut dari:\n${toUnGrant}`,
        context
      );
      return;
    }

    if (input === "yun" && senderJid === ADMIN) {
      let helpMessage = [
        `> ✨ *Daftar Perintah* ✨`,
        `> 🛡️ *.adm* — Lihat daftar akun yang diberi akses.`,
        `> ➕ *.grt <nomor>* — Beri akses ke nomor.`,
        `> ➖ *.ugrt <nomor>* — Cabut akses dari nomor.`,
        `> 📋 *rep* — Laporan data terkini.`,
        `> ⚡ *s1, s2, s3* — Kontrol kecepatan 1, 2, atau 3.`,
        `> 🔎 *sp* — Cek status kecepatan saat ini.`,
        `> 🤖 *auto* — Mode cerdas.`,
        `> 📟 *d[1-3]* - Ganti display.`,
        `> 🛰️ *p27-2* - Simulasi Nilai.`,
        `> 🤖 *fz* - Tampilkan Nilai.`,
      ].join("\n");

      await addReact(jid, key, "👑");
      await sendMessageWithContext(jid, helpMessage, context);
    } else if (msgText.toLowerCase() === "rep") {
      let { dateString, timeString } = getFormattedDateTime();
      let reportSections = {
        People: ["people"],
        Environmental: ["tempC", "tempF", "humidity"],
        Electrical: [
          "voltage",
          "current",
          "power",
          "energy",
          "frequency",
          "pf",
        ],
      };

      let reportLines = [
        `> *Laporan Data*`,
        `> *${dateString}*`,
        `> *${timeString}*`,
        `> *-------------------------------*`,
      ];

      let sectionCount = 0;

      Object.entries(reportSections).forEach(([section, keys]) => {
        let sectionLines = [];

        keys.forEach((key) => {
          if (mqttData[key]) {
            sectionLines.push(
              `> ${key.charAt(0).toUpperCase() + key.slice(1)}: ${
                mqttData[key].value
              } ${mqttData[key].suffix}`
            );
          }
        });

        if (sectionLines.length > 0) {
          if (sectionCount > 0)
            reportLines.push(`> ---------------------------------`); // Only add separator if it's NOT the first section
          reportLines.push(...sectionLines);
          sectionCount++;
        }
      });

      let report = reportLines.join("\n");
      await addReact(jid, key, "📋"); // Add reaction
      await sendMessageWithContext(jid, report, context);
    } else if (/s[1-3]/.test(input)) {
      let relayNumber = msgText.match(/\d/)[0];
      let newStatus = relayStatus[`relay${relayNumber}`] === "0" ? "1" : "0";
      let responseMessage = updateRelayStatusmanual(relayNumber, newStatus);
      mqttClient.publish(MQTT_RELAY_TOPIC, JSON.stringify(relayStatus));
      await addReact(jid, key, "⚡"); // Add reaction
      await sendMessageWithContext(jid, responseMessage, context);
      enterManualMode();
    } else if (input.includes("rotate")) {
      let relayNumber = "4";
      let currentStatus = relayStatus[`relay${relayNumber}`];
      let newStatus = currentStatus === "0" ? "1" : "0";
      let responseMessage = updateRelayStatusmanual(relayNumber, newStatus);
      mqttClient.publish(MQTT_RELAY_TOPIC, JSON.stringify(relayStatus));
      await addReact(jid, key, "⚡");
      await sendMessageWithContext(jid, responseMessage, context);
    } else if (input.includes("fz")) {
      await addReact(jid, key, "⚡");
      await sendMessageWithContext(jid, `${latestResult}`, context);
    } else if (input.includes("sp")) {
      let statusMessage = generateStatusMessage(relayStatus);
      await addReact(jid, key, "⚡"); // Add reaction
      await sendMessageWithContext(jid, statusMessage, context);
    } else if (/^p\d+(\.\d+)?-\d+$/.test(input)) {
      // Ambil suhu dan count dari input, misal p23.5-4
      let match = input.match(/^p(\d+(\.\d+)?)-(\d+)$/);
      if (match) {
        let tempC = parseFloat(match[1]);
        let count = parseInt(match[3]);

        // Buat JSON hanya untuk tempC dan count
        let data = {
          tempC: tempC,
          count: count,
        };

        // Publish ke MQTT
        mqttClient.publish(MQTT_TOPIC_TES, JSON.stringify(data));

        await addReact(jid, key, "📡");
        await sendMessageWithContext(
          jid,
          `Simulasi dikirim:\n🌡️ Temp: ${tempC}°C\n👥 Count: ${count}`,
          context
        );
      } else {
        await sendMessageWithContext(
          jid,
          "Format salah. Contoh: p27-2",
          context
        );
      }
    } else if (input.includes("auto")) {
      exitManualMode(); // Fungsi ini mengubah isManualMode = false
      await addReact(jid, key, "✅");
      await sendMessageWithContext(jid, "mode auto (fuzzy).", context);
    } else if (/d[1-3]/.test(input)) {
      let disNum = msgText.match(/\d/)[0];
      mqttClient.publish(MQTT_TOPIC_DIZ, disNum.toString());
      await addReact(jid, key, "📟"); // Add reaction
    } else {
      if ((!isGroup && isAuthorized(senderJid)) || senderJid === ADMIN) {
        // In personal chat ➔ always offer command list
        let helpMessage = [
          `✨ *Daftar Perintah* ✨`,
          `> 📋 *rep* — Laporan data terkini.`,
          `> 🔎 *sp* — Cek status kecepatan saat ini.`,
          `> ⚡ *s1, s2, s3* — Kontrol kecepatan 1, 2, atau 3.`,
          `> 🤖 *auto* — Mode cerdas. `,
          `> _Contoh: kirim "s1" untuk mengubah Speed 1._`,
        ].join("\n");

        await addReact(jid, key, "❓");
        await sendMessageWithContext(jid, helpMessage, context);
      }
    }
  });
}

connectToWhatsApp();
