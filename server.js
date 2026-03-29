
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// בדיקה
app.get('/', (req, res) => {
  res.send('Hezi Salon System Running 🚀');
});

// רשימת לקוחות
let clients = [];

// הוספת לקוח
app.post('/clients', (req, res) => {
  const client = req.body;
  clients.push(client);
  res.json({ message: 'לקוח נוסף בהצלחה', client });
});

// קבלת לקוחות
app.get('/clients', (req, res) => {
  res.json(clients);
});

// רשימת תורים
let appointments = [];

// הוספת תור
app.post('/appointments', (req, res) => {
  const appointment = req.body;
  appointments.push(appointment);
  res.json({ message: 'תור נקבע', appointment });
});

// קבלת תורים
app.get('/appointments', (req, res) => {
  res.json(appointments);
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
