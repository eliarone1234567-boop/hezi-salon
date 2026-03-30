const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
app.use(express.urlencoded({ extended: true }));

// ====== CONFIG ======
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const TOKEN_PATH = "token.json";
const CLIENTS_PATH = "clients.json";

// ====== LOAD ======
if (fs.existsSync(TOKEN_PATH)) {
  oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
}

if (!fs.existsSync(CLIENTS_PATH)) {
  fs.writeFileSync(CLIENTS_PATH, JSON.stringify([]));
}

function getClients() {
  return JSON.parse(fs.readFileSync(CLIENTS_PATH));
}

function saveClients(data) {
  fs.writeFileSync(CLIENTS_PATH, JSON.stringify(data, null, 2));
}

// ====== HOME ======
app.get("/", (req, res) => {
  res.send(`
    <h2>💎 מערכת חזי</h2>
    <a href="/events">📅 יומן</a><br>
    <a href="/clients">👥 לקוחות</a><br>
    <a href="/auth">🔐 התחברות</a>
  `);
});

// ====== AUTH ======
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  res.send(`<a href="${url}">🔐 התחבר לגוגל</a>`);
});

app.get("/oauth2callback", async (req, res) => {
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  res.send("✅ מחובר!");
});

// ====== EVENTS (יומן) ======
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
    body { margin:0;font-family:Arial;background:#0f172a;color:white }
    .top { padding:20px;font-size:24px }
    .card { background:#1e293b;margin:10px;padding:15px;border-radius:12px }
    </style>
    </head>
    <body>
    <div class="top">📅 יומן</div>
    `;

    events.forEach(e => {
      html += `<div class="card">${e.summary}</div>`;
    });

    html += `</body></html>`;
    res.send(html);

  } catch {
    res.send("❌ שגיאה");
  }
});

// ====== CLIENTS ======
app.get("/clients", (req, res) => {
  const q = req.query.q || "";
  let clients = getClients();

  if (q) {
    clients = clients.filter(c =>
      c.name.includes(q) || c.phone.includes(q)
    );
  }

  let html = `
  <html dir="rtl">
  <head>
  <style>
  body { font-family:Arial;background:#0f172a;color:white;padding:20px }
  .card { background:#1e293b;padding:15px;margin:10px;border-radius:12px }
  input { padding:10px;width:100%;margin-bottom:10px;border-radius:8px }
  a { color:#38bdf8 }
  </style>
  </head>
  <body>

  <h2>👥 לקוחות</h2>

  <form>
    <input name="q" placeholder="🔍 חיפוש לקוח..." />
  </form>

  <a href="/add-client">➕ לקוח חדש</a>
  `;

  clients.forEach((c, i) => {
    html += `
      <div class="card">
        <b>${c.name}</b><br>
        📞 ${c.phone}<br><br>

        <a href="/client/${i}">🎨 כרטסת</a><br>

        <a href="https://wa.me/972${c.phone.substring(1)}">
        📲 שלח וואטסאפ
        </a>
      </div>
    `;
  });

  html += "</body></html>";
  res.send(html);
});

// ====== ADD CLIENT ======
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

// ====== CLIENT CARD ======
app.get("/client/:id", (req, res) => {
  const clients = getClients();
  const client = clients[req.params.id];

  let html = `
  <html dir="rtl">
  <body style="font-family:Arial;background:#0f172a;color:white;padding:20px">

  <h2>🎨 ${client.name}</h2>

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
      <div style="background:#1e293b;padding:10px;margin:10px;border-radius:10px">
        🎨 ${c.color}<br>
        📦 ${c.amount}<br>
        🏢 ${c.brand}<br>
        📅 ${c.date}
      </div>
    `;
  });

  html += "</body></html>";
  res.send(html);
});

// ====== ADD COLOR ======
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

// ====== SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 running");
});
