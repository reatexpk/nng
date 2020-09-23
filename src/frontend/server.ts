import express from "express";
import path from "path";

const app = express();
const port = 3000;

app.use("/static", express.static(path.join(__dirname, "/static")));

app.get("/", (req, res) => {
  res.sendFile(path.join(`${__dirname}/index.html`));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Frontend listening at http://localhost:${port}`);
});
