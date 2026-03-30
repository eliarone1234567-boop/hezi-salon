const express = require("express");
const { google } = require("googleapis");

const app = express();

// משתנים מ-Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// נשמור טוקן בזיכרון (לבדיקות)
let savedTokens = null;

// דף ראשי
app.get("/", (req, res) => {
  res.send("Hezi Salon System Running 🚀");
});

// התחברות לגוגל
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  res.send(`<a href="${url}">לחץ להתחבר ליומן גוגל</a>`);
});

// חזרה מגוגל
app.get("/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    savedTokens = tokens;

    res.send("🎉 התחברת בהצלחה! עכשיו כנס ל /events");
  } catch (error) {
    console.log(error);
    res.send("❌ שגיאה בהתחברות");
  }
});

// יומן מעוצב 🔥
app.get("/events", async (req, res) => {
  try {
    if (!savedTokens) {
      return res.send("❗ קודם תתחבר דרך /auth");
    }

    oauth2Client.setCredentials(savedTokens);

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
    <title>יומן תורים</title>

    <style>
    body {
      font-family: Arial;
      margin: 0;
      background: #f1f3f4;
    }

    .header {
      background: #ffffff;
      padding: 15px;
      font-size: 20px;
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
      font-size: 12px;
      color: #666;
      border-bottom: 1px solid #eee;
      padding: 5px;
    }

    .day {
      position: relative;
    }

    .event {
      position: absolute;
      left: 10px;
      right: 10px;
      background: #1a73e8;
      color: white;
      border-radius: 8px;
      padding: 5px;
      font-size: 13px;
    }
    </style>
    </head>

    <body>

    <div class="header">📅 היומן שלך</div>

    <div class="calendar">

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

      const startHour = start.getHours() + (start.getMinutes() / 60);
      const endHour = end.getHours() + (end.getMinutes() / 60);

      const top = (startHour - 8) * 60;
      const height = (endHour - startHour) * 60;

      html += `
        <div class="event" style="top:${top}px; height:${height}px;">
          ${event.summary}
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

  } catch (error) {
    console.log(error);
    res.send("❌ שגיאה בקבלת אירועים");
  }
});

// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
