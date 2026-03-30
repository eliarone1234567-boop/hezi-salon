const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
app.use(express.urlencoded({ extended: true }));

// ====== Google OAuth ======
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ====== שמירת טוקן ======
const TOKEN_PATH = "token.json";
if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(tokens);
}

// ====== קובץ לקוחות ======
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

// ====== דף ראשי ======
app.get("/", (req, res) => {
  res.send(`
    <h2>💎 מערכת חזי</h2>
    <a href="/events">📅 יומן</a><br>
    <a href="/clients">👥 לקוחות</a><br>
    <a href="/auth">🔐 התחברות לגוגל</a>
  `);
});

// ====== התחברות ======
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  res.send(`<a href="${url}">🔐 התחבר ליומן</a>`);
});

// ====== callback ======
app.get("/oauth2callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send("✅ מחובר! כנס ל /events");
  } catch (err) {
    console.log(err);
    res.send("❌ שגיאה");
  }
});

// ====== יומן ======
app.get("/events", async (req, res) => {
  try {
    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    let html = `
    <html dir="rtl">
    <head>
    <meta charset="UTF-8">
    <style>
    body { margin:0;font-family:Arial;background:#f1f3f4 }
    .top { background:white;padding:15px;text-align:center;font-size:22px }
    .wrap { display:grid;grid-template-columns:80px 1fr;height:100vh }
    .hours { background:#fafafa;border-left:1px solid #ddd }
    .hour { height:60px;border-bottom:1px solid #eee;font-size:12px;padding:5px }
    .day { position:relative;background:white }
    .event { position:absolute;left:10px;right:10px;background:#1a73e8;color:white;border-radius:10px;padding:5px }
    </style>
    </head>
    <body>

    <div class="top">📅 יומן</div>
    <div class="wrap">
    <div class="hours">
    `;

    for (let i = 8; i <= 20; i++) {
      html += `<div class="hour">${i}:00</div>`;
    }

    html += `</div><div class="day">`;

    events.forEach(event => {
      if (!event.start.dateTime) return;

      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);

      const startHour = start.getHours() + start.getMinutes()/60;
      const endHour = end.getHours() + end.getMinutes()/60;

      const top = (startHour - 8) * 60;
      const height = (endHour - startHour) * 60;

      html += `
        <div class="event" style="top:${top}px;height:${height}px;">
          ${event.summary}
        </div>
      `;
    });

    html += `</div></div></body></html>`;

    res.send(html);

  } catch (err) {
    console.log(err);
    res.send("❌ שגיאה ביומן");
  }
});

// ====== רשימת לקוחות ======
app.get("/clients", (req, res) => {
  const clients = getClients();

  let html = `
  <html dir="rtl"><body style="font-family:Arial;background:#f5f5f5;padding:20px">
  <h2>👥 לקוחות</h2>
  <a href="/add-client">➕ לקוח חדש</a><br><br>
  `;

  clients.forEach((c, i) => {
    html += `
      <div style="background:white;padding:10px;margin-bottom:10px;border-radius:8px">
        <b>${c.name}</b><br>
        📞 ${c.phone}<br>
        <a href="/client/${i}">כרטסת צבע</a>
      </div>
    `;
  });

  html += "</body></html>";
  res.send(html);
});

// ====== הוספת לקוח ======
app.get("/add-client", (req, res) => {
  res.send(`
    <form method="POST" action="/add-client">
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
    phone: req.body.phone,
    colors: []
  });

  saveClients(clients);
  res.redirect("/clients");
});

// ====== כרטסת צבע ======
app.get("/client/:id", (req, res) => {
  const clients = getClients();
  const client = clients[req.params.id];

  let html = `
  <html dir="rtl"><body style="font-family:Arial;padding:20px">
  <h2>🎨 כרטסת צבע - ${client.name}</h2>

  <form method="POST" action="/client/${req.params.id}">
    מספר צבע: <input name="color"/><br>
    כמות: <input name="amount"/><br>
    חברה: <input name="brand"/><br>
    <button>הוסף</button>
  </form>

  <h3>היסטוריה:</h3>
  `;

  client.colors.forEach(c => {
    html += `
      <div style="border:1px solid #ddd;margin:5px;padding:5px">
        🎨 ${c.color} | ${c.amount} | ${c.brand}<br>
        📅 ${c.date}
      </div>
    `;
  });

  html += "</body></html>";
  res.send(html);
});

// ====== הוספת צבע ======
app.post("/client/:id", (req, res) => {
  const clients = getClients();
  const client = clients[req.params.id];

  client.colors.push({
    color: req.body.color,
    amount: req.body.amount,
    brand: req.body.brand,
    date: new Date().toLocaleDateString()
  });

  saveClients(clients);

  res.redirect("/client/" + req.params.id);
});

// ====== הפעלת שרת ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running 🚀");
});
