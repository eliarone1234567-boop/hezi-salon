const express = require("express");
const { google } = require("googleapis");

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

app.get("/", (req, res) => {
  res.send("Hezi Salon System Running 🚀");
});

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent"
  });

  res.send(`<a href="${url}">לחץ להתחבר ליומן גוגל</a>`);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send("🎉 התחברת בהצלחה ליומן!");
  } catch (error) {
    console.log(error);
    res.send("❌ שגיאה בהתחברות");
  }
});

app.get("/events", async (req, res) => {
  try {
    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    let html = `
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <title>תורים במספרה</title>
        <style>
          body {
            font-family: Arial;
            background: #f7f7f7;
            margin: 0;
            padding: 30px;
            text-align: center;
          }
          .top {
            background: red;
            color: white;
            font-size: 36px;
            font-weight: bold;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .card {
            background: white;
            border: 1px solid #ddd;
            padding: 15px;
            margin: 12px auto;
            width: 320px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .time {
            color: #555;
            font-size: 15px;
          }
        </style>
      </head>
      <body>
        <div class="top">גרסה חדשה עלתה</div>
        <h1>📅 התורים שלך</h1>
    `;

    if (!events.length) {
      html += `<div class="card"><div class="title">אין אירועים ביומן 😅</div></div>`;
    } else {
      events.forEach((event) => {
        const title = event.summary || "ללא כותרת";
        const start = event.start.dateTime || event.start.date || "ללא זמן";
        const end = event.end.dateTime || event.end.date || "ללא זמן";

        html += `
          <div class="card">
            <div class="title">${title}</div>
            <div class="time">התחלה: ${start}</div>
            <div class="time">סיום: ${end}</div>
          </div>
        `;
      });
    }

    html += `
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.log(error);
    res.send("❌ שגיאה בקבלת אירועים");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
