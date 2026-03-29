
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;

// כדי לעבוד עם __dirname ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// 👇 זה החלק החשוב
app.use(express.static(__dirname));

// דף הבית
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// TEST
app.get("/test", (req, res) => {
  res.send("Server works 🚀");
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
