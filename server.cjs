const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();

// ENV
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

// OAuth
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// קובץ לשמירת טוקן
const TOKEN_PATH = "token.json";

// טעינת טוקן אם קיים
if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(tokens);
}

// דף ראשי
app.get("/", (req, res) => {
  res.send("Hezi Salon System 🚀");
});

// התחברות
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  res.send(`<h2>🔐 התחברות ליומן</h2><a href="${url}">התחבר עכשיו</a>`);
});

// callback
app.get("/oauth2callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);

    oauth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    res.send("✅ מחובר! כנס ל /events");
  } catch (err) {
    console.log(err);
    res.send("❌ שגיאה בהתחברות");
  }
});

// יומן מקצועי 🔥🔥
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
    <html dir="rtl" lang="he">
    <head>
    <meta charset="UTF-8">
    <title>יומן חזי</title>

    <style>
    body {
      margin: 0;
      font-family: Arial;
      background: #f1f3f4;
    }

    .topbar {
      background: white;
      padding: 15px;
      font-size: 22px;
      font-weight: bold;
      border-bottom: 1px solid #ddd;
      text-align: center;
    }

    .calendar {
      display: grid;
      grid-template-columns: 80px 1fr;
      height: 100vh;
    }

    .hours {
      background: #fafafa;
      border-left: 1px solid #ddd;
    }

    .hour {
      height: 60px;
      border-bottom: 1px solid #eee;
      font-size: 12px;
      padding: 5px;
      color: #666;
    }

    .day {
      position: relative;
      background: white;
    }

    .grid-line {
      height: 60px;
      border-bottom: 1px solid #eee;
    }

    .event {
      position: absolute;
      left: 10px;
      right: 10px;
      border-radius: 10px;
      padding: 6px;
      color: white;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .haircut { background: #1a73e8; }
    .color { background: #d93025; }
    .default { background: #34a853; }

    </style>
    </head>

    <body>

    <div class="topbar">📅 יומן חזי</div>

    <div class="calendar">

    <div class="hours">
    `;

    for (let i = 8; i <= 20; i++) {
      html += `<div class="hour">${i}:00</div>`;
    }

    html += `</div><div class="day">`;

    // גריד
    for (let i = 8; i <= 20; i++) {
      html += `<div class="grid-line"></div>`;
    }

    // אירועים
    events.forEach(event => {
      if (!event.start.dateTime) return;

      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);

      const startHour = start.getHours() + start.getMinutes()/60;
      const endHour = end.getHours() + end.getMinutes()/60;

      const top = (startHour - 8) * 60;
      const height = (endHour - startHour) * 60;

      let type = "default";

      if (event.summary?.includes("תספורת")) type = "haircut";
      if (event.summary?.includes("צבע")) type = "color";

      html += `
        <div class="event ${type}" style="top:${top}px;height:${height}px;">
          <b>${event.summary}</b><br>
          ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}
        </div>
      `;
    });

    html += `
    </div>
    </div>

    </body>
    </html>
    `;

    res.send(html);

  } catch (err) {
    console.log(err);
    res.send("❌ שגיאה");
  }
});

// שרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running 🚀");
});
