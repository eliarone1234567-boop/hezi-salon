const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");
const twilio = require("twilio");

const app = express();
app.use(express.urlencoded({ extended: true }));

// ===== TWILIO =====
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

const WHATSAPP_NUMBER = "whatsapp:+14155238886"; // sandbox

// ===== GOOGLE =====
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://hezi-salon.onrender.com/oauth2callback"
);

// ===== STORAGE =====
const CLIENTS_PATH = "clients.json";
if (!fs.existsSync(CLIENTS_PATH)) {
  fs.writeFileSync(CLIENTS_PATH, JSON.stringify([]));
}

function getClients() {
  return JSON.parse(fs.readFileSync(CLIENTS_PATH));
}

function saveClients(data) {
  fs.writeFileSync(CLIENTS_PATH, JSON.stringify(data, null, 2));
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send(`<h2>💎 מערכת חזי</h2>
  <a href="/clients">לקוחות</a><br>
  <a href="/events">יומן</a>`);
});

// ===== CLIENTS =====
app.get("/clients", (req, res) => {
  const clients = getClients();

  let html = `<html dir="rtl"><body style="font-family:Arial;background:#111;color:white;padding:20px">
  <h2>לקוחות</h2>
  <a href="/add-client">➕ לקוח</a>
  `;

  clients.forEach((c, i) => {
    html += `
      <div style="background:#222;padding:10px;margin:10px;border-radius:10px">
        <b>${c.name}</b><br>
        ${c.phone}<br><br>

        <a href="/send/${i}">📲 שלח וואטסאפ</a>
      </div>
    `;
  });

  html += "</body></html>";
  res.send(html);
});

// ===== ADD CLIENT =====
app.get("/add-client", (req, res) => {
  res.send(`
    <form method="POST">
      שם: <input name="name"/><br>
      טלפון: <input name="phone"/><br>
      <button>שמור</button>
    </form>
  `);
});

app.post("/add-client", (req, res) => {
  const clients = getClients();

  clients.push({
    name: req.body.name,
    phone: req.body.phone
  });

  saveClients(clients);
  res.redirect("/clients");
});

// ===== SEND WHATSAPP =====
app.get("/send/:id", async (req, res) => {
  const clients = getClients();
  const clientData = clients[req.params.id];

  try {
    await client.messages.create({
      from: WHATSAPP_NUMBER,
      to: "whatsapp:+972" + clientData.phone.substring(1),
      body: `היי ${clientData.name} 👋
תזכורת מהמספרה 💇‍♂️
מחכים לך לתור!`
    });

    res.send("✅ נשלח בהצלחה");
  } catch (err) {
    console.log(err);
    res.send("❌ שגיאה בשליחה");
  }
});

// ===== AUTO REMINDER =====
setInterval(async () => {
  console.log("🔔 בדיקת תזכורות");

  // כאן אפשר לחבר ליומן בהמשך
}, 60000);

// ===== SERVER =====
app.listen(3000, () => {
  console.log("🚀 running");
});
