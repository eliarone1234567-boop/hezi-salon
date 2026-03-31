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
  return Date.now().toString() + Math.floor(Math.random() * 10000).toString();
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
// HELPERS
// =========================
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("he-IL");
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setHours(0, 0, 0, 0);
  return new Date(d.setDate(d.getDate() - day));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function getDayLabel(date) {
  return new Date(date).toLocaleDateString("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function eventColorClass(colorId = "", summary = "") {
  if (colorId) {
    const map = {
      "1": "event-color-blue",
      "2": "event-color-green",
      "3": "event-color-purple",
      "4": "event-color-red",
      "5": "event-color-orange",
      "6": "event-color-blue",
      "7": "event-color-green",
      "8": "event-color-purple",
      "9": "event-color-red",
      "10": "event-color-orange",
      "11": "event-color-blue",
    };
    return map[colorId] || "event-color-blue";
  }

  const text = (summary || "").toLowerCase();
  if (text.includes("צבע")) return "event-color-red";
  if (text.includes("פן")) return "event-color-green";
  if (text.includes("החלקה")) return "event-color-purple";
  if (text.includes("פסים")) return "event-color-orange";
  return "event-color-blue";
}

function googleColorOptions(selected = "") {
  const colors = [
    { id: "1", name: "כחול" },
    { id: "2", name: "ירוק" },
    { id: "3", name: "סגול" },
    { id: "4", name: "אדום" },
    { id: "5", name: "כתום" },
    { id: "6", name: "טורקיז" },
    { id: "7", name: "זית" },
    { id: "8", name: "אפור-כחול" },
    { id: "9", name: "ורוד" },
    { id: "10", name: "צהוב" },
    { id: "11", name: "אפור" },
  ];

  return colors
    .map(
      (c) =>
        `<option value="${c.id}" ${String(selected) === String(c.id) ? "selected" : ""}>${c.name}</option>`
    )
    .join("");
}

function clientDisplayName(client) {
  return [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
}

function normalizePhone(phone = "") {
  return phone.replace(/\D/g, "");
}

function whatsappLink(phone, name = "") {
  const normalized = normalizePhone(phone);
  if (!normalized) return "#";

  let international = normalized;
  if (international.startsWith("0")) {
    international = "972" + international.slice(1);
  }

  const text = encodeURIComponent(
    `היי ${name || ""},\nתזכורת מהמספרה של חזי 💇‍♂️`
  );

  return `https://wa.me/${international}?text=${text}`;
}

// =========================
// UI LAYOUT
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
        background: #f5f7fb;
        color: #1f2937;
      }

      .topbar {
        background: linear-gradient(90deg, #111827, #1f2937);
        color: white;
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      .brand {
        font-size: 24px;
        font-weight: bold;
      }

      .nav {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }

      .nav a {
        color: white;
        text-decoration: none;
        font-size: 14px;
      }

      .nav a:hover {
        text-decoration: underline;
      }

      .container {
        max-width: 1500px;
        margin: 24px auto;
        padding: 0 16px;
      }

      .section-title {
        margin-bottom: 14px;
        font-size: 26px;
        font-weight: bold;
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
        box-shadow: 0 4px 18px rgba(0,0,0,0.05);
        border: 1px solid #e9edf5;
      }

      .card h2, .card h3 {
        margin-top: 0;
      }

      .muted {
        color: #6b7280;
        font-size: 14px;
      }

      .stat {
        font-size: 32px;
        font-weight: bold;
      }

      .btn {
        display: inline-block;
        border: none;
        border-radius: 12px;
        padding: 10px 16px;
        text-decoration: none;
        cursor: pointer;
        font-size: 14px;
        background: #111827;
        color: white;
      }

      .btn-light {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-danger {
        background: #b91c1c;
        color: white;
      }

      .btn-green {
        background: #047857;
        color: white;
      }

      .row-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
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

      .form-group {
        margin-bottom: 14px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
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

      .empty {
        padding: 24px;
        text-align: center;
        color: #6b7280;
      }

      .search-box {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
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

      .color-note {
        border-right: 4px solid #111827;
        padding-right: 10px;
        margin-bottom: 10px;
      }

      .client-photo {
        width: 140px;
        height: 140px;
        object-fit: cover;
        border-radius: 16px;
        border: 1px solid #dbe1ea;
        background: #f3f4f6;
      }

      /* WEEKLY CALENDAR */
      .calendar-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .calendar-toolbar .left,
      .calendar-toolbar .right {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .week-title {
        font-size: 18px;
        font-weight: bold;
      }

      .calendar-wrapper {
        background: white;
        border-radius: 18px;
        overflow: auto;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 18px rgba(0,0,0,0.05);
      }

      .calendar-board {
        min-width: 1100px;
      }

      .calendar-header {
        display: grid;
        grid-template-columns: 80px repeat(7, 1fr);
        position: sticky;
        top: 0;
        z-index: 2;
        background: white;
      }

      .corner-cell {
        border-left: 1px solid #edf0f5;
        border-bottom: 1px solid #edf0f5;
        background: #f8fafc;
        min-height: 56px;
      }

      .day-header {
        border-left: 1px solid #edf0f5;
        border-bottom: 1px solid #edf0f5;
        background: #f8fafc;
        min-height: 56px;
        padding: 8px;
        text-align: center;
        font-weight: bold;
      }

      .day-header-top {
        margin-bottom: 8px;
      }

      .day-add {
        display: inline-block;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 999px;
        background: #111827;
        color: white;
        text-decoration: none;
      }

      .calendar-body {
        display: grid;
        grid-template-columns: 80px repeat(7, 1fr);
      }

      .time-col {
        background: #fafafa;
      }

      .time-slot {
        height: 64px;
        border-left: 1px solid #edf0f5;
        border-bottom: 1px solid #edf0f5;
        padding: 8px;
        font-size: 12px;
        color: #6b7280;
      }

      .day-col {
        position: relative;
      }

      .day-grid-line {
        height: 64px;
        border-left: 1px solid #edf0f5;
        border-bottom: 1px solid #edf0f5;
        background: white;
      }

      .event-block {
        position: absolute;
        right: 6px;
        left: 6px;
        border-radius: 10px;
        padding: 6px 8px;
        color: white;
        font-size: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      }

      .event-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .event-time {
        font-size: 11px;
        opacity: 0.95;
      }

      .event-color-blue { background: #1a73e8; }
      .event-color-red { background: #d93025; }
      .event-color-green { background: #188038; }
      .event-color-purple { background: #9334e6; }
      .event-color-orange { background: #e37400; }

      @media (max-width: 900px) {
        .grid-2, .grid-3 {
          grid-template-columns: 1fr;
        }

        .topbar {
          display: block;
        }

        .container {
          padding: 0 10px;
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
          <a class="btn btn-light" href="/events">יומן שבועי</a>
        </div>
      </div>

      <div class="card">
        <h3>סטטוס מערכת</h3>
        <p class="muted">
          האפליקציה כוללת יומן שבועי, חיפוש ביומן, הוספת תור, ניהול לקוחות, תמונת לקוח, כרטסת צבע והיסטוריית טיפולים.
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
      <p class="muted">לחץ על הכפתור כדי לחבר את המערכת ליומן גוגל שלך.</p>
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
// WEEKLY CALENDAR + SEARCH
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
    const q = (req.query.q || "").trim();
    const dateParam = req.query.date;
    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = addDays(weekStart, 7);

    const calendar = getCalendarClient();
    const response = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
      maxResults: 200,
    });

    let events = response.data.items || [];

    if (q) {
      events = events.filter((event) => {
        const text = `${event.summary || ""} ${event.description || ""}`.toLowerCase();
        return text.includes(q.toLowerCase());
      });
    }

    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }

    const hours = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(h);
    }

    const prevWeek = toDateInputValue(addDays(weekStart, -7));
    const nextWeek = toDateInputValue(addDays(weekStart, 7));
    const todayValue = toDateInputValue(new Date());

    let headers = `<div class="corner-cell"></div>`;
    for (const day of days) {
      headers += `
        <div class="day-header">
          <div class="day-header-top">${escapeHtml(getDayLabel(day))}</div>
          <a class="day-add" href="/events/new?date=${toDateInputValue(day)}">+ תור</a>
        </div>
      `;
    }

    let body = `<div class="time-col">`;
    for (const hour of hours) {
      body += `<div class="time-slot">${String(hour).padStart(2, "0")}:00</div>`;
    }
    body += `</div>`;

    for (const day of days) {
      let columnHtml = `<div class="day-col">`;

      for (const hour of hours) {
        columnHtml += `<div class="day-grid-line"></div>`;
      }

      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;

        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);

        if (!sameDay(start, day)) continue;

        const startHourValue = start.getHours() + start.getMinutes() / 60;
        const endHourValue = end.getHours() + end.getMinutes() / 60;

        if (endHourValue <= 8 || startHourValue >= 21) continue;

        const top = Math.max((startHourValue - 8) * 64, 0);
        const height = Math.max((endHourValue - startHourValue) * 64, 36);

        columnHtml += `
          <div class="event-block ${eventColorClass(event.colorId, event.summary || "")}" style="top:${top}px;height:${height}px;">
            <div class="event-title">${escapeHtml(event.summary || "ללא כותרת")}</div>
            <div class="event-time">${escapeHtml(formatTimeOnly(event.start.dateTime))} - ${escapeHtml(formatTimeOnly(event.end.dateTime))}</div>
          </div>
        `;
      }

      columnHtml += `</div>`;
      body += columnHtml;
    }

    const html = `
      <div class="section-title">יומן שבועי</div>

      <div class="calendar-toolbar">
        <div class="right">
          <a class="btn btn-light" href="/events?date=${prevWeek}&q=${encodeURIComponent(q)}">שבוע קודם</a>
          <a class="btn btn-light" href="/events?date=${todayValue}">השבוע הנוכחי</a>
          <a class="btn btn-light" href="/events?date=${nextWeek}&q=${encodeURIComponent(q)}">שבוע הבא</a>
        </div>

        <div class="left">
          <div class="week-title">
            ${escapeHtml(formatDateOnly(weekStart))} - ${escapeHtml(formatDateOnly(addDays(weekStart, 6)))}
          </div>
          <a class="btn" href="/events/new">תור חדש</a>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <form method="GET" action="/events" class="search-box">
          <input type="hidden" name="date" value="${toDateInputValue(weekStart)}" />
          <input name="q" value="${escapeHtml(q)}" placeholder="חיפוש ביומן לפי שם לקוח / כותרת / הערות" />
          <button class="btn" type="submit">חפש</button>
        </form>
      </div>

      <div class="calendar-wrapper">
        <div class="calendar-board">
          <div class="calendar-header">
            ${headers}
          </div>
          <div class="calendar-body">
            ${body}
          </div>
        </div>
      </div>
    `;

    res.send(layout("יומן שבועי", html));
  } catch (err) {
    console.log(err);
    res.send(layout("שגיאה", `<div class="card">❌ שגיאה בטעינת היומן</div>`));
  }
});

// =========================
// NEW EVENT
// =========================
app.get("/events/new", (req, res) => {
  const clients = getClients();
  const prefilledDate = req.query.date || "";

  const clientOptions = clients
    .map((c) => {
      const fullName = clientDisplayName(c) || c.phone || "לקוח";
      return `<option value="${c.id}">${escapeHtml(fullName)} - ${escapeHtml(c.phone || "")}</option>`;
    })
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
            <input type="date" name="date" value="${escapeHtml(prefilledDate)}" required />
          </div>

          <div class="form-group">
            <label>שעת התחלה</label>
            <input type="time" name="startTime" required />
          </div>

          <div class="form-group">
            <label>שעת סיום</label>
            <input type="time" name="endTime" required />
          </div>

          <div class="form-group">
            <label>צבע לתור</label>
            <select name="colorId">
              <option value="">לפי ברירת מחדל</option>
              ${googleColorOptions("")}
            </select>
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
    return res.send(
      layout("שגיאה", `<div class="card">קודם צריך לחבר את גוגל דרך /auth</div>`)
    );
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
      colorId,
    } = req.body;

    let finalTitle = summary?.trim() || service;
    let finalColorId = colorId || "";

    if (clientId) {
      const client = getClientById(clientId);

      if (client) {
        if (!summary?.trim()) {
          finalTitle = `${clientDisplayName(client)} - ${service}`;
        }

        if (!finalColorId && client.defaultColorId) {
          finalColorId = client.defaultColorId;
        }
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
        colorId: finalColorId || undefined,
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

    // save treatment history into client card
    if (clientId) {
      const clients = getClients();
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        if (!client.treatmentHistory) client.treatmentHistory = [];
        client.treatmentHistory.unshift({
          id: generateId(),
          date,
          service,
          notes: description || "",
          colorId: finalColorId || "",
        });
        saveClients(clients);
      }
    }

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
    clients = clients.filter((c) => {
      const text = [
        c.firstName,
        c.lastName,
        c.phone,
        c.email,
        c.notes,
      ]
        .filter(Boolean)
        .join(" ");
      return text.includes(q);
    });
  }

  let rows = "";
  for (const client of clients) {
    rows += `
      <tr>
        <td>${escapeHtml(clientDisplayName(client))}</td>
        <td>${escapeHtml(client.phone || "-")}</td>
        <td>${escapeHtml(client.email || "-")}</td>
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
        <input name="q" value="${escapeHtml(q)}" placeholder="חיפוש לפי שם, טלפון, מייל או הערות" />
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
                <th>מייל</th>
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
            <label>שם פרטי</label>
            <input name="firstName" required />
          </div>
          <div class="form-group">
            <label>שם משפחה</label>
            <input name="lastName" required />
          </div>
          <div class="form-group">
            <label>טלפון</label>
            <input name="phone" required />
          </div>
          <div class="form-group">
            <label>מייל</label>
            <input name="email" />
          </div>
          <div class="form-group">
            <label>מין</label>
            <select name="gender">
              <option value="">בחר</option>
              <option value="זכר">זכר</option>
              <option value="נקבה">נקבה</option>
              <option value="אחר">אחר</option>
            </select>
          </div>
          <div class="form-group">
            <label>תאריך לידה</label>
            <input type="date" name="birthday" />
          </div>
          <div class="form-group">
            <label>צבע קבוע ללקוח</label>
            <select name="defaultColorId">
              <option value="">ללא</option>
              ${googleColorOptions("")}
            </select>
          </div>
          <div class="form-group">
            <label>קישור לתמונה</label>
            <input name="imageUrl" placeholder="https://..." />
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
    firstName: req.body.firstName?.trim() || "",
    lastName: req.body.lastName?.trim() || "",
    phone: req.body.phone?.trim() || "",
    email: req.body.email?.trim() || "",
    gender: req.body.gender?.trim() || "",
    birthday: req.body.birthday?.trim() || "",
    notes: req.body.notes?.trim() || "",
    imageUrl: req.body.imageUrl?.trim() || "",
    defaultColorId: req.body.defaultColorId?.trim() || "",
    colorHistory: [],
    treatmentHistory: [],
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
            <label>שם פרטי</label>
            <input name="firstName" value="${escapeHtml(client.firstName || "")}" required />
          </div>
          <div class="form-group">
            <label>שם משפחה</label>
            <input name="lastName" value="${escapeHtml(client.lastName || "")}" required />
          </div>
          <div class="form-group">
            <label>טלפון</label>
            <input name="phone" value="${escapeHtml(client.phone || "")}" required />
          </div>
          <div class="form-group">
            <label>מייל</label>
            <input name="email" value="${escapeHtml(client.email || "")}" />
          </div>
          <div class="form-group">
            <label>מין</label>
            <select name="gender">
              <option value="">בחר</option>
              <option value="זכר" ${client.gender === "זכר" ? "selected" : ""}>זכר</option>
              <option value="נקבה" ${client.gender === "נקבה" ? "selected" : ""}>נקבה</option>
              <option value="אחר" ${client.gender === "אחר" ? "selected" : ""}>אחר</option>
            </select>
          </div>
          <div class="form-group">
            <label>תאריך לידה</label>
            <input type="date" name="birthday" value="${escapeHtml(client.birthday || "")}" />
          </div>
          <div class="form-group">
            <label>צבע קבוע ללקוח</label>
            <select name="defaultColorId">
              <option value="">ללא</option>
              ${googleColorOptions(client.defaultColorId || "")}
            </select>
          </div>
          <div class="form-group">
            <label>קישור לתמונה</label>
            <input name="imageUrl" value="${escapeHtml(client.imageUrl || "")}" />
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

  client.firstName = req.body.firstName?.trim() || "";
  client.lastName = req.body.lastName?.trim() || "";
  client.phone = req.body.phone?.trim() || "";
  client.email = req.body.email?.trim() || "";
  client.gender = req.body.gender?.trim() || "";
  client.birthday = req.body.birthday?.trim() || "";
  client.notes = req.body.notes?.trim() || "";
  client.imageUrl = req.body.imageUrl?.trim() || "";
  client.defaultColorId = req.body.defaultColorId?.trim() || "";

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
// CLIENT PROFILE
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

  let treatmentRows = "";
  for (const item of client.treatmentHistory || []) {
    treatmentRows += `
      <div class="card" style="margin-bottom:10px">
        <div><strong>תאריך:</strong> ${escapeHtml(item.date)}</div>
        <div><strong>טיפול:</strong> ${escapeHtml(item.service)}</div>
        <div><strong>הערות:</strong> ${escapeHtml(item.notes || "-")}</div>
      </div>
    `;
  }

  const html = `
    <div class="section-title">כרטיס לקוח</div>

    <div class="grid-2">
      <div class="card">
        <h3>${escapeHtml(clientDisplayName(client))}</h3>
        ${
          client.imageUrl
            ? `<img class="client-photo" src="${escapeHtml(client.imageUrl)}" alt="client image" />`
            : `<div class="client-photo" style="display:flex;align-items:center;justify-content:center;">ללא תמונה</div>`
        }
        <p><strong>טלפון:</strong> ${escapeHtml(client.phone || "-")}</p>
        <p><strong>מייל:</strong> ${escapeHtml(client.email || "-")}</p>
        <p><strong>מין:</strong> ${escapeHtml(client.gender || "-")}</p>
        <p><strong>תאריך לידה:</strong> ${escapeHtml(client.birthday || "-")}</p>
        <p><strong>הערות:</strong> ${escapeHtml(client.notes || "-")}</p>
        <p><strong>צבע קבוע:</strong> ${escapeHtml(client.defaultColorId || "-")}</p>

        <div class="row-actions">
          <a class="btn" href="/clients/${client.id}/edit">עריכת לקוח</a>
          <a class="btn btn-light" href="/events/new">תור חדש</a>
          ${
            client.phone
              ? `<a class="btn btn-green" href="${whatsappLink(client.phone, clientDisplayName(client))}" target="_blank">תזכורת וואטסאפ</a>`
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

    <div style="height:16px"></div>

    <div class="section-title">היסטוריית טיפולים</div>
    ${
      (client.treatmentHistory || []).length
        ? treatmentRows
        : `<div class="card empty">אין עדיין היסטוריית טיפולים</div>`
    }
  `;

  res.send(layout(`כרטיס לקוח - ${clientDisplayName(client)}`, html));
});

// =========================
// ADD COLOR HISTORY
// =========================
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
