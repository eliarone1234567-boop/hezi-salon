import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔐 משתנים מה-Render (לא לשים סודות בקוד!)
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://hezi-salon.onrender.com/oauth2callback";

// יצירת OAuth client
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// בדיקה שהשרת עובד
app.get("/", (req, res) => {
  res.send("Hezi Salon System Running 🚀");
});

// שלב התחברות לגוגל
app.get("/auth", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  res.send(`<a href="${url}">התחבר ליומן גוגל</a>`);
});

// חזרה מגוגל אחרי התחברות
app.get("/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    res.send("התחברת בהצלחה ליומן 🎉");
  } catch (err) {
    console.error(err);
    res.send("שגיאה בהתחברות");
  }
});

// משיכת אירועים מהיומן
app.get("/events", async (req, res) => {
  try {
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items);
  } catch (err) {
    console.error(err);
    res.send("שגיאה בקבלת אירועים");
  }
});

// הפעלת השרת
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

