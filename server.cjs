const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// PATHS
// =========================
const DATA_DIR = __dirname;
const TOKEN_PATH = path.join(DATA_DIR, "token.json");
const CLIENTS_PATH = path.join(DATA_DIR, "clients.json");

// =========================
// FILE HELPERS
// =========================
function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

ensureFile(CLIENTS_PATH, []);

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getClients() {
  return readJson(CLIENTS_PATH, []);
}

function saveClients(clients) {
  writeJson(CLIENTS_PATH, clients);
}

function getClientById(id) {
  const clients = getClients();
  return clients.find((c) => c.id === id);
}

function generateId() {
  return Date.now().toString();
}

// =========================
// GOOGLE OAUTH
// =========================
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

if (fs.existsSync(TOKEN_PATH)) {
  const tokens = readJson(TOKEN_PATH, null);
  if (tokens) {
    oauth2Client.setCredentials(tokens);
  }
}

function isGoogleConnected() {
  return fs.existsSync(TOKEN_PATH);
}

function saveTokens(tokens) {
  writeJson(TOKEN_PATH, tokens);
  oauth2Client.setCredentials(tokens);
}

function getCalendarClient() {
  return google.calendar({
    version: "v3",
    auth: oauth2Client,
  });
}

// =========================
// UI HELPERS
// =========================
function layout(title, content) {
  return `
  <html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f6f7fb;
        color: #1f2937;
      }
      .topbar {
        background: linear-gradient(90deg, #111827, #1f2937);
        color: white;
        padding: 18px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .brand {
        font-size: 24px;
        font-weight: bold;
      }
      .nav a {
        color: white;
        text-decoration: none;
        margin-left: 16px;
        font-size: 15px;
      }
      .nav a:hover { text-decoration: underline; }

      .container {
        max-width: 1200px;
        margin: 24px auto;
        padding: 0 16px;
      }

      .grid {
        display: grid;
        gap: 16px;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .card {
        background: white;
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.06);
        border: 1px solid #eceef3;
      }

      .card h2, .card h3 {
        margin-top: 0;
      }

      .stat {
        font-size: 30px;
        font-weight: bold;
        color: #111827;
      }

      .muted {
        color: #6b7280;
        font-size: 14px;
      }

      .btn {
        display: inline-block;
        background: #111827;
        color: white;
        text-decoration: none;
        border: none;
        border-radius: 12px;
        padding: 11px 16px;
        cursor: pointer;
        font-size: 14px;
      }

      .btn-light {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-danger {
        background: #b91c1c;
      }

      .btn-green {
        background: #047857;
      }

      .row-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 12px;
        border-bottom: 1px solid #edf0f5;
        text-align: right;
        vertical-align: top;
      }

      th {
        background: #f8fafc;
        font-weight: bold;
      }

      input, select, textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        font-size: 14px;
        background: white;
      }

      textarea {
        min-height: 90px;
        resize: vertical;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .form-group {
        margin-bottom: 14px;
      }

      .section-title {
        margin-bottom: 14px;
        font-size: 24px;
        font-weight: bold;
      }

      .pill {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        background: #e5e7eb;
      }

      .pill.green {
        background: #d1fae5;
        color: #065f46;
      }

      .pill.red {
        background: #fee2e2;
        color: #991b1b;
      }

      .search-box {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }

      .color-note {
        border-right: 4px solid #111827;
        padding-right: 10px;
        margin-bottom: 10px;
      }

      .empty {
        padding: 24px;
        text-align: center;
        color: #6b7280;
      }

      @media (max-width: 900px) {
        .grid-2, .grid-3 {
          grid-template-columns: 1fr;
        }
        .topbar {
          display: block;
        }
        .nav {
          margin-top: 10px;
        }
      }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="brand">חזי עיצוב שיער</div>
      <div class="nav">
        <a href="/">ראשי</a>
        <a href="/events">יומן</a>
        <a href="/events/new">תור חדש</a>
        <a href="/clients">לקוחות</a>
        <a href="/clients/new">לקוח חדש</a>
        <a href="/auth">חיבור לגוגל</a>
      </div>
    </div>
    <div class="container">
      ${content}
    </div>
  </body>
  </html>
  `;
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("he-IL");
}

function formatDateOnly(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("he-IL");
}

function formatTimeOnly(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// =========================
// HOME
// =========================
app.get("/", async (req, res) => {
  const clients = getClients();
  let upcomingCount = 0;

  if (isGoogleConnected()) {
    try {
      const calendar = getCalendarClient();
      const response = await calendar.events.list({
        calendarId: "primary",
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
        timeMin: new Date().toISOString(),
      });
      upcomingCount = (response.data.items || []).length;
    } catch (e) {
      upcomingCount = 0;
    }
  }

  const html = `
    <div class="section-title">דשבורד</div>

    <div class="grid-3">
      <div class="card">
        <div class="muted">לקוחות</div>
        <div class="stat">${clients.length}</div>
      </div>
      <div class="card">
        <div class="muted">תורים קרובים</div>
        <div class="stat">${upcomingCount}</div>
      </div>
      <div class="card">
        <div class="muted">חיבור לגוגל</div>
        <div class="stat">
          ${
            isGoogleConnected()
              ? `<span class="pill green">מחובר</span>`
              : `<span class="pill red">לא מחובר</span>`
          }
        </div>
      </div>
    </div>

    <div style="height:16px"></div>

    <div class="grid-2">
      <div class="card">
        <h3>פעולות מהירות</h3>
        <div class="row-actions">
          <a class="btn" href="/clients/new">לקוח חדש</a>
          <a class="btn" href="/events/new">תור חדש</a>
          <a class="btn btn-light" href="/clients">רשימת לקוחות</a>
          <a class="btn btn-light" href="/events">יומן תורים</a>
        </div>
      </div>

      <div class="card">
        <h3>סטטוס מערכת</h3>
        <p class="muted">
          האפליקציה מוכנה לעבודה. כרגע יש בה יומן, לקוחות, כרטסת צבע, הוספת תורים, עריכת לקוחות וחיפוש.
        </p>
      </div>
    </div>
  `;

  res.send(layout("דשבורד", html));
});

// =========================
// GOOGLE AUTH
// =========================
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  });

  const html = `
    <div class="card">
      <h2>חיבור ליומן גוגל</h2>
      <p class="muted">
        לחץ על הכפתור כדי לחבר את המערכת ליומן גוגל שלך.
      </p>
      <a class="btn" href="${url}">חבר עכשיו</a>
    </div>
  `;

  res.send(layout("חיבור לגוגל", html));
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    saveTokens(tokens);
    res.send(
      layout(
        "חיבור הצליח",
        `<div class="card"><h2>החיבור הצליח ✅</h2><a class="btn" href="/events">עבור ליומן</a></div>`
      )
    );
  } catch (err) {
    console.log(err);
    res.send(layout("שגיאה", `<div class="card">❌ שגיאה בהתחברות</div>`));
  }
});

// =========================
// EVENTS LIST
// =========================
app.get("/events", async (req, res) => {
  if (!isGoogleConnected()) {
    return res.send(
      layout(
        "יומן",
        `
        <div class="card">
          <h2>היומן עדיין לא מחובר</h2>
          <p class="muted">לפני שמציגים תורים צריך לחבר את גוגל.</p>
          <a class="btn" href="/auth">חבר לגוגל</a>
        </div>
      `
      )
    );
  }

  try {
    const calendar = getCalendarClient();
    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
    });

    const events = response.data.items || [];

    let rows = "";
    for (const event of events) {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      rows += `
        <tr>
          <td>${escapeHtml(event.summary || "ללא כותרת")}</td>
          <td>${formatDateOnly(start)}</td>
          <td>${event.start.dateTime ? formatTimeOnly(start) : "אירוע יומי"}</td>
          <td>${event.end.dateTime ? formatTimeOnly(end) : "-"}</td>
          <td>${escapeHtml(event.description || "-")}</td>
        </tr>
      `;
    }

    const html = `
      <div class="section-title">יומן תורים</div>

      <div class="card" style="margin-bottom:16px">
        <div class="row-actions">
          <a class="btn" href="/events/new">תור חדש</a>
          <a class="btn btn-light" href="/auth">חיבור מחדש לגוגל</a>
        </div>
      </div>

      <div class="card">
        ${
          events.length
            ? `
          <table>
            <thead>
              <tr>
                <th>כותרת</th>
                <th>תאריך</th>
                <th>התחלה</th>
                <th>סיום</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `
            : `<div class="empty">אין תורים כרגע</div>`
        }
      </div>
    `;

    res.send(layout("יומן תורים", html));
  } catch (err) {
    console.log(err);
    res.send(layout("שגיאה", `<div class="card">❌ שגיאה בטעינת היומן</div>`));
  }
});

// =========================
// NEW EVENT FORM
// =========================
app.get("/events/new", (req, res) => {
  const clients = getClients();

  const clientOptions = clients
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.phone)}</option>`)
    .join("");

  const html = `
    <div class="section-title">תור חדש</div>
    <div class="card">
      <form method="POST" action="/events/new">
        <div class="grid-2">
          <div class="form-group">
            <label>לקוח</label>
            <select name="clientId">
              <option value="">ללא בחירה</option>
              ${clientOptions}
            </select>
          </div>

          <div class="form-group">
            <label>סוג שירות</label>
            <select name="service">
              <option>תספורת</option>
              <option>צבע שורש</option>
              <option>פן</option>
              <option>החלקה</option>
              <option>פסים</option>
              <option>אחר</option>
            </select>
          </div>

          <div class="form-group">
            <label>כותרת לתור</label>
            <input name="summary" placeholder="למשל: ליאת - צבע שורש" />
          </div>

          <div class="form-group">
            <label>תאריך</label>
            <input type="date" name="date" required />
          </div>

          <div class="form-group">
            <label>שעת התחלה</label>
            <input type="time" name="startTime" required />
          </div>

          <div class="form-group">
            <label>שעת סיום</label>
            <input type="time" name="endTime" required />
          </div>
        </div>

        <div class="form-group">
          <label>הערות</label>
          <textarea name="description" placeholder="הערות על התור"></textarea>
        </div>

        <button class="btn" type="submit">שמור תור</button>
      </form>
    </div>
  `;

  res.send(layout("תור חדש", html));
});

app.post("/events/new", async (req, res) => {
  if (!isGoogleConnected()) {
    return res.send(layout("שגיאה", `<div class="card">קודם צריך לחבר את גוגל דרך /auth</div>`));
  }

  try {
    const {
      clientId,
      service,
      summary,
      date,
      startTime,
      endTime,
      description,
    } = req.body;

    let finalTitle = summary?.trim() || service;
    if (clientId) {
      const client = getClientById(clientId);
      if (client && !summary?.trim()) {
        finalTitle = `${client.name} - ${service}`;
      }
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    const calendar = getCalendarClient();
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: finalTitle,
        description: description || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Jerusalem",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Jerusalem",
        },
      },
    });

    res.redirect("/events");
  } catch (err) {
    console.log(err);
    res.send(layout("שגיאה", `<div class="card">❌ שגיאה ביצירת התור</div>`));
  }
});

// =========================
// CLIENTS LIST + SEARCH
// =========================
app.get("/clients", (req, res) => {
  const q = (req.query.q || "").trim();
  let clients = getClients();

  if (q) {
    clients = clients.filter(
      (c) =>
        c.name.includes(q) ||
        c.phone.includes(q) ||
        (c.notes || "").includes(q)
    );
  }

  let rows = "";
  for (const client of clients) {
    rows += `
      <tr>
        <td>${escapeHtml(client.name)}</td>
        <td>${escapeHtml(client.phone || "-")}</td>
        <td>${escapeHtml(client.notes || "-")}</td>
        <td>
          <div class="row-actions">
            <a class="btn btn-light" href="/clients/${client.id}">כרטיס</a>
            <a class="btn btn-light" href="/clients/${client.id}/edit">עריכה</a>
            <form method="POST" action="/clients/${client.id}/delete" onsubmit="return confirm('למחוק לקוח?')">
              <button class="btn btn-danger" type="submit">מחיקה</button>
            </form>
          </div>
        </td>
      </tr>
    `;
  }

  const html = `
    <div class="section-title">לקוחות</div>

    <div class="card" style="margin-bottom:16px">
      <form method="GET" action="/clients" class="search-box">
        <input name="q" value="${escapeHtml(q)}" placeholder="חיפוש לפי שם, טלפון או הערות" />
        <button class="btn" type="submit">חפש</button>
      </form>
    </div>

    <div class="card" style="margin-bottom:16px">
      <a class="btn" href="/clients/new">לקוח חדש</a>
    </div>

    <div class="card">
      ${
        clients.length
          ? `
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>הערות</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
          : `<div class="empty">אין לקוחות להצגה</div>`
      }
    </div>
  `;

  res.send(layout("לקוחות", html));
});

// =========================
// NEW CLIENT
// =========================
app.get("/clients/new", (req, res) => {
  const html = `
    <div class="section-title">לקוח חדש</div>
    <div class="card">
      <form method="POST" action="/clients/new">
        <div class="grid-2">
          <div class="form-group">
            <label>שם</label>
            <input name="name" required />
          </div>
          <div class="form-group">
            <label>טלפון</label>
            <input name="phone" required />
          </div>
        </div>

        <div class="form-group">
          <label>הערות</label>
          <textarea name="notes"></textarea>
        </div>

        <button class="btn" type="submit">שמור לקוח</button>
      </form>
    </div>
  `;

  res.send(layout("לקוח חדש", html));
});

app.post("/clients/new", (req, res) => {
  const clients = getClients();

  clients.push({
    id: generateId(),
    name: req.body.name?.trim() || "",
    phone: req.body.phone?.trim() || "",
    notes: req.body.notes?.trim() || "",
    colorHistory: [],
  });

  saveClients(clients);
  res.redirect("/clients");
});

// =========================
// EDIT CLIENT
// =========================
app.get("/clients/:id/edit", (req, res) => {
  const client = getClientById(req.params.id);
  if (!client) {
    return res.send(layout("לא נמצא", `<div class="card">לקוח לא נמצא</div>`));
  }

  const html = `
    <div class="section-title">עריכת לקוח</div>
    <div class="card">
      <form method="POST" action="/clients/${client.id}/edit">
        <div class="grid-2">
          <div class="form-group">
            <label>שם</label>
            <input name="name" value="${escapeHtml(client.name)}" required />
          </div>
          <div class="form-group">
            <label>טלפון</label>
            <input name="phone" value="${escapeHtml(client.phone)}" required />
          </div>
        </div>

        <div class="form-group">
          <label>הערות</label>
          <textarea name="notes">${escapeHtml(client.notes || "")}</textarea>
        </div>

        <button class="btn" type="submit">שמור שינויים</button>
      </form>
    </div>
  `;

  res.send(layout("עריכת לקוח", html));
});

app.post("/clients/:id/edit", (req, res) => {
  const clients = getClients();
  const client = clients.find((c) => c.id === req.params.id);

  if (!client) {
    return res.send(layout("לא נמצא", `<div class="card">לקוח לא נמצא</div>`));
  }

  client.name = req.body.name?.trim() || "";
  client.phone = req.body.phone?.trim() || "";
  client.notes = req.body.notes?.trim() || "";

  saveClients(clients);
  res.redirect(`/clients/${client.id}`);
});

// =========================
// DELETE CLIENT
// =========================
app.post("/clients/:id/delete", (req, res) => {
  let clients = getClients();
  clients = clients.filter((c) => c.id !== req.params.id);
  saveClients(clients);
  res.redirect("/clients");
});

// =========================
// CLIENT PROFILE + COLOR CARD
// =========================
app.get("/clients/:id", (req, res) => {
  const client = getClientById(req.params.id);
  if (!client) {
    return res.send(layout("לא נמצא", `<div class="card">לקוח לא נמצא</div>`));
  }

  let colorRows = "";
  for (const item of client.colorHistory || []) {
    colorRows += `
      <div class="card" style="margin-bottom:10px">
        <div class="color-note"><strong>מספר צבע:</strong> ${escapeHtml(item.colorNumber)}</div>
        <div><strong>כמות:</strong> ${escapeHtml(item.amount)}</div>
        <div><strong>חברה:</strong> ${escapeHtml(item.brand)}</div>
        <div><strong>תאריך:</strong> ${escapeHtml(item.date)}</div>
        <div><strong>הערות:</strong> ${escapeHtml(item.notes || "-")}</div>
        <div style="margin-top:10px">
          <form method="POST" action="/clients/${client.id}/color/${item.id}/delete" onsubmit="return confirm('למחוק רישום צבע?')">
            <button class="btn btn-danger" type="submit">מחק רישום</button>
          </form>
        </div>
      </div>
    `;
  }

  const html = `
    <div class="section-title">כרטיס לקוח</div>

    <div class="grid-2">
      <div class="card">
        <h3>${escapeHtml(client.name)}</h3>
        <p><strong>טלפון:</strong> ${escapeHtml(client.phone)}</p>
        <p><strong>הערות:</strong> ${escapeHtml(client.notes || "-")}</p>
        <div class="row-actions">
          <a class="btn" href="/clients/${client.id}/edit">עריכת לקוח</a>
          <a class="btn btn-light" href="/events/new">תור חדש</a>
          ${
            client.phone
              ? `<a class="btn btn-green" href="https://wa.me/972${client.phone.replace(/^0/, "")}" target="_blank">וואטסאפ</a>`
              : ""
          }
        </div>
      </div>

      <div class="card">
        <h3>הוספת רישום צבע</h3>
        <form method="POST" action="/clients/${client.id}/color/new">
          <div class="grid-2">
            <div class="form-group">
              <label>מספר צבע</label>
              <input name="colorNumber" required />
            </div>
            <div class="form-group">
              <label>כמות</label>
              <input name="amount" required />
            </div>
            <div class="form-group">
              <label>חברה</label>
              <input name="brand" required />
            </div>
            <div class="form-group">
              <label>תאריך</label>
              <input type="date" name="date" required />
            </div>
          </div>

          <div class="form-group">
            <label>הערות</label>
            <textarea name="notes"></textarea>
          </div>

          <button class="btn" type="submit">שמור רישום צבע</button>
        </form>
      </div>
    </div>

    <div style="height:16px"></div>

    <div class="section-title">כרטסת צבע</div>
    ${
      (client.colorHistory || []).length
        ? colorRows
        : `<div class="card empty">אין עדיין רישומי צבע ללקוח הזה</div>`
    }
  `;

  res.send(layout(`כרטיס לקוח - ${client.name}`, html));
});

app.post("/clients/:id/color/new", (req, res) => {
  const clients = getClients();
  const client = clients.find((c) => c.id === req.params.id);

  if (!client) {
    return res.send(layout("לא נמצא", `<div class="card">לקוח לא נמצא</div>`));
  }

  if (!client.colorHistory) {
    client.colorHistory = [];
  }

  client.colorHistory.unshift({
    id: generateId(),
    colorNumber: req.body.colorNumber?.trim() || "",
    amount: req.body.amount?.trim() || "",
    brand: req.body.brand?.trim() || "",
    date: req.body.date?.trim() || "",
    notes: req.body.notes?.trim() || "",
  });

  saveClients(clients);
  res.redirect(`/clients/${client.id}`);
});

app.post("/clients/:id/color/:colorId/delete", (req, res) => {
  const clients = getClients();
  const client = clients.find((c) => c.id === req.params.id);

  if (!client) {
    return res.send(layout("לא נמצא", `<div class="card">לקוח לא נמצא</div>`));
  }

  client.colorHistory = (client.colorHistory || []).filter(
    (item) => item.id !== req.params.colorId
  );

  saveClients(clients);
  res.redirect(`/clients/${client.id}`);
});

// =========================
// SERVER
// =========================
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
