
import express from "express";
import cors from "cors";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 👇 חשוב מאוד
app.use(express.static("."));

// דף הבית
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
