const express = require("express");
const { google } = require("googleapis");

const app = express();

// 🔐 משתנים מה-Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

// יצירת חיבור ל-Google
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// דף ראשי
app.get("/", (req, res) => {
  res.send("Hezi Salon System Running 🚀");
});

// התחברות לגוגל
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  res.send(`<a href="${url}">לחץ להתחבר ליומן גוגל</a>`);
});

// חזרה מגוגל
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

// 📅 בדיקת אירועים מהיומן
app.get("/events", async (req, res) => {
  try {
    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items;

    if (!events.length) {
      return res.send("אין אירועים ביומן 😅");
    }

    let output = "📅 האירועים שלך:\n\n";

    events.forEach((event) => {
      output += `👉 ${event.summary}\n`;
    });

    res.send(`<pre>${output}</pre>`);
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
