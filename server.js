
import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔐 פרטי OAuth שלך
const CLIENT_ID = "שים כאן את ה-CLIENT ID שלך";
const CLIENT_SECRET = "שים כאן את ה-CLIENT SECRET שלך";
const REDIRECT_URI = "http://localhost:3000";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 🔗 קישור התחברות לגוגל
app.get("/auth", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  res.send(`<a href="${url}">התחבר ליומן גוגל</a>`);
});

// 🎯 קבלת טוקן
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  res.send("מחובר ליומן בהצלחה!");
});

// 📅 שליפת אירועים
app.get("/events", async (req, res) => {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  res.json(response.data.items);
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
