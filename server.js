
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Server works');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`running on ${port}`);
});
