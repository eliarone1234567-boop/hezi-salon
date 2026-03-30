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
    prompt: "consent",
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

function formatDateOnly(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeOnly(dateString) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      timeMin: new Date().toISOString(),
    });

    const events = response.data.items || [];

    let grouped = {};

    events.forEach((event) => {
      const startRaw = event.start.dateTime || event.start.date;
      const endRaw = event.end.dateTime || event.end.date;

      const dayKey = new Date(startRaw).toDateString();

      if (!grouped[dayKey]) {
        grouped[dayKey] = {
          label: formatDateOnly(startRaw),
          items: [],
        };
      }

      grouped[dayKey].items.push({
        title: event.summary || "ללא כותרת",
        start: event.start.dateTime
          ? formatTimeOnly(startRaw)
          : "אירוע יומי",
        end: event.end.dateTime
          ? formatTimeOnly(endRaw)
          : "",
        rawStart: startRaw,
      });
    });

    const orderedDays = Object.values(grouped);

    let html = `
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>יומן תורים</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f6f8fc;
            color: #202124;
          }

          .topbar {
            height: 64px;
            background: #ffffff;
            border-bottom: 1px solid #dadce0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 22px;
            font-weight: 600;
            color: #3c4043;
          }

          .brand-badge {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: #1a73e8;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }

          .top-actions {
            color: #5f6368;
            font-size: 14px;
          }

          .layout {
            display: flex;
            min-height: calc(100vh - 64px);
          }

          .sidebar {
            width: 260px;
            background: #ffffff;
            border-left: 1px solid #dadce0;
            padding: 20px 16px;
          }

          .create-btn {
            width: 100%;
            background: #ffffff;
            border: 1px solid #dadce0;
            border-radius: 16px;
            padding: 14px 16px;
            font-size: 16px;
            font-weight: 600;
            color: #3c4043;
            box-shadow: 0 1px 2px rgba(60,64,67,.15);
            margin-bottom: 20px;
          }

          .mini-box {
            background: #f8f9fa;
            border: 1px solid #e0e3e7;
            border-radius: 16px;
            padding: 14px;
            margin-bottom: 18px;
          }

          .mini-title {
            font-size: 14px;
            color: #5f6368;
            margin-bottom: 8px;
          }

          .mini-strong {
            font-size: 20px;
            font-weight: bold;
            color: #1a73e8;
          }

          .legend {
            margin-top: 12px;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-size: 14px;
            color: #3c4043;
          }

          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }

          .dot-blue { background: #1a73e8; }
          .dot-green { background: #34a853; }
          .dot-red { background: #ea4335; }

          .content {
            flex: 1;
            padding: 24px;
          }

          .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
          }

          .page-title {
            font-size: 28px;
            font-weight: 600;
            color: #3c4043;
          }

          .subtitle {
            font-size: 14px;
            color: #5f6368;
            margin-top: 6px;
          }

          .calendar-shell {
            background: #ffffff;
            border: 1px solid #dadce0;
            border-radius: 18px;
            overflow: hidden;
          }

          .day-section {
            border-top: 1px solid #eceff1;
          }

          .day-section:first-child {
            border-top: none;
          }

          .day-header {
            background: #f8f9fa;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            color: #3c4043;
            border-bottom: 1px solid #eceff1;
          }

          .event-row {
            display: flex;
            align-items: stretch;
            border-bottom: 1px solid #f1f3f4;
          }

          .event-row:last-child {
            border-bottom: none;
          }

          .time-col {
            width: 120px;
            min-width: 120px;
            padding: 18px 16px;
            background: #ffffff;
            border-left: 1px solid #f1f3f4;
            text-align: center;
          }

          .time-main {
            font-size: 18px;
            font-weight: bold;
            color: #1a73e8;
          }

          .time-end {
            margin-top: 6px;
            font-size: 13px;
            color: #5f6368;
          }

          .event-col {
            flex: 1;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 14px;
            background: #ffffff;
          }

          .event-color {
            width: 10px;
            border-radius: 999px;
            align-self: stretch;
            background: #1a73e8;
          }

          .event-card {
            background: #e8f0fe;
            border-radius: 14px;
            padding: 14px 16px;
            width: 100%;
            border: 1px solid #d2e3fc;
          }

          .event-title {
            font-size: 17px;
            font-weight: 600;
            color: #174ea6;
            margin-bottom: 6px;
          }

          .event-meta {
            font-size: 14px;
            color: #3c4043;
          }

          .empty-box {
            background: #ffffff;
            border: 1px dashed #c7cdd4;
            border-radius: 18px;
            padding: 50px 20px;
            text-align: center;
            color: #5f6368;
            font-size: 18px;
          }

          @media (max-width: 900px) {
            .layout {
              display: block;
            }

            .sidebar {
              width: 100%;
              border-left: none;
              border-bottom: 1px solid #dadce0;
            }

            .content {
              padding: 14px;
            }

            .event-row {
              display: block;
            }

            .time-col {
              width: 100%;
              border-left: none;
              border-bottom: 1px solid #f1f3f4;
            }
          }
        </style>
      </head>
      <body>
        <div class="topbar">
          <div class="brand">
            <div class="brand-badge">📅</div>
            <div>יומן חזי</div>
          </div>
          <div class="top-actions">מסונכרן עם Google Calendar</div>
        </div>

        <div class="layout">
          <aside class="sidebar">
            <button class="create-btn">+ תור חדש</button>

            <div class="mini-box">
              <div class="mini-title">סה״כ תורים קרובים</div>
              <div class="mini-strong">${events.length}</div>
            </div>

            <div class="mini-box">
              <div class="mini-title">סטטוס</div>
              <div>היומן מחובר ופועל</div>
            </div>

            <div class="legend">
              <div class="legend-item"><span class="dot dot-blue"></span> תורים פעילים</div>
              <div class="legend-item"><span class="dot dot-green"></span> תורים שהסתיימו</div>
              <div class="legend-item"><span class="dot dot-red"></span> תורים דחופים</div>
            </div>
          </aside>

          <main class="content">
            <div class="content-header">
              <div>
                <div class="page-title">יומן תורים</div>
                <div class="subtitle">תצוגה בסגנון יומן, דומה מאוד ליומן גוגל</div>
              </div>
            </div>
    `;

    if (!orderedDays.length) {
      html += `<div class="empty-box">אין כרגע תורים ביומן 😅</div>`;
    } else {
      orderedDays.forEach((day) => {
        html += `<div class="calendar-shell day-section">`;
        html += `<div class="day-header">${day.label}</div>`;

        day.items.forEach((item) => {
          html += `
            <div class="event-row">
              <div class="time-col">
                <div class="time-main">${item.start}</div>
                <div class="time-end">${item.end ? "עד " + item.end : ""}</div>
              </div>
              <div class="event-col">
                <div class="event-color"></div>
                <div class="event-card">
                  <div class="event-title">${item.title}</div>
                  <div class="event-meta">תור ביומן Google</div>
                </div>
              </div>
            </div>
          `;
        });

        html += `</div><div style="height:16px"></div>`;
      });
    }

    html += `
          </main>
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
